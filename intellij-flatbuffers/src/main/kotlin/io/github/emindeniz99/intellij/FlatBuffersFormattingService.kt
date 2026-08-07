package io.github.emindeniz99.intellij

import com.intellij.formatting.service.AsyncDocumentFormattingService
import com.intellij.formatting.service.AsyncFormattingRequest
import com.intellij.formatting.service.FormattingService
import com.intellij.openapi.diagnostic.Logger
import com.intellij.psi.PsiFile
import java.io.File
import java.nio.file.Files
import java.util.concurrent.TimeUnit

/**
 * Runs `flatbuffers-format` against the current document and feeds the
 * stdout back to the IDE. The integration point is
 * `AsyncDocumentFormattingService` (since IntelliJ 2022.2): the
 * platform invokes us off the EDT, lets the user cancel mid-format
 * via the existing progress UI, and threads our exit code into the
 * standard error-notification infrastructure.
 *
 * We deliberately do NOT format ranges or fragments (no
 * `FORMAT_FRAGMENTS` feature flag). The engine is whole-file: trying
 * to format a slice would require re-parsing surrounding context to
 * keep indent state coherent, and that's a bigger lift than the
 * payoff is worth in v0.1.
 *
 * Process invocation strategy: write the document to a temp `.fbs`
 * file, run the resolved engine against it (no `--write`, so output
 * goes to stdout), capture stdout, hand it back. Temp file is
 * cleaned up in `finally` even on cancel. We never touch the file
 * the user has open — the IDE writes the result via the standard
 * Document API, which handles undo, encoding, and line-ending
 * preservation for us.
 *
 * *Which* engine, and what to tell the user when it isn't the one we
 * would have picked, is [EngineResolver]'s job — see [FlatBuffersEngine].
 */
class FlatBuffersFormattingService : AsyncDocumentFormattingService() {

    override fun getFeatures(): Set<FormattingService.Feature> = emptySet()

    // Deliberately matches the `.fbs` extension as well as our own
    // language, so this formatter keeps working when another FlatBuffers
    // plugin (e.g. "Flatbuffers Support") owns the file type.
    //
    // Those plugins are complementary, not competing: they provide
    // language support — references, go-to-declaration — and we provide
    // formatting that is byte-identical with the CLI, Prettier plugin
    // and VS Code extension. A user who installs both should get both.
    // Standing down whenever the IDE assigned `*.fbs` to the other
    // plugin would silently disable formatting for exactly the users who
    // wanted it most.
    //
    // Only one FormattingService is selected per file, so this does not
    // put two formatters on one document.
    override fun canFormat(file: PsiFile): Boolean =
        file.virtualFile?.extension == "fbs" || file.language === FlatBuffersLanguage

    override fun getName(): String = "flatbuffers-format"

    override fun getNotificationGroupId(): String = NOTIFICATION_GROUP

    override fun createFormattingTask(request: AsyncFormattingRequest): FormattingTask? {
        val settings = FlatBuffersSettings.getInstance()

        // Which engine, and what we had to settle for. Resolution is
        // per-request on purpose: installing Node or the CLI must not
        // require an IDE restart. The only expensive part of it (asking
        // an interpreter its version) is cached in NodeProbe.
        val resolution = EngineResolver.resolve(IdeEngineEnvironment(settings))
        resolution.issue?.let { EngineNotifications.getInstance(request.context.project).notifyOnce(it) }

        val engine = resolution.engine
        if (engine == null) {
            request.onError(
                "FlatBuffers format failed",
                resolution.issue?.message
                    ?: "No usable flatbuffers-format engine was found. " +
                    "Install it via `npm install -g flatbuffers-format`, " +
                    "set its path in Preferences → Tools → FlatBuffers, " +
                    "or download the native engine from that settings page.",
            )
            return null
        }
        LOG.debug("Formatting with ${engine.describe}")

        return object : FormattingTask {
            @Volatile private var process: Process? = null
            @Volatile private var cancelled = false

            override fun run() {
                if (cancelled) return
                val source = request.documentText

                // The engine formats a whole schema; it cannot format a
                // fragment, because a lone `union { … }` body is not a
                // parseable file. getFeatures() advertises no
                // FORMAT_FRAGMENTS for that reason.
                //
                // Refuse rather than trust that. If a partial range ever
                // reaches us and we hand back the whole formatted
                // document, the platform substitutes that text FOR THE
                // RANGE — the file gets its own contents spliced into
                // the middle of itself. A user reported exactly that:
                // union members duplicated and concatenated. Declining
                // is recoverable; corrupting the user's schema is not.
                val ranges = request.formattingRanges
                val coversWholeFile = ranges.isEmpty() ||
                    (ranges.size == 1 && ranges[0].startOffset == 0 && ranges[0].endOffset >= source.length)
                if (!coversWholeFile) {
                    request.onError(
                        "FlatBuffers format failed",
                        "flatbuffers-format formats whole files only. " +
                            "Reformat without a selection, or set Actions on Save → " +
                            "Reformat code to the whole file rather than changed lines.",
                    )
                    return
                }
                val temp: File = try {
                    Files.createTempFile("flatbuffers-format-", ".fbs").toFile()
                } catch (t: Throwable) {
                    request.onError("FlatBuffers format failed",
                        "Could not create temp file: ${t.message ?: t.javaClass.simpleName}")
                    return
                }
                try {
                    temp.writeText(source, Charsets.UTF_8)

                    // The prefix is either `<binary>` or `<node> <script>`
                    // — a bundled JS engine has no executable path of
                    // its own, which is why this is a list and not the
                    // single String this code used to build.
                    val cmd = engine.commandPrefix().toMutableList()
                    cmd.addAll(settings.formatterArgs())
                    cmd.add(temp.absolutePath)

                    val proc = ProcessBuilder(cmd)
                        .redirectErrorStream(false)
                        .start()
                    process = proc

                    val stdoutText = proc.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
                    val stderrText = proc.errorStream.bufferedReader(Charsets.UTF_8).use { it.readText() }

                    if (!proc.waitFor(30, TimeUnit.SECONDS)) {
                        proc.destroyForcibly()
                        request.onError("FlatBuffers format failed",
                            "Timed out after 30 s. Schema may be pathologically large or the CLI hung.")
                        return
                    }
                    if (proc.exitValue() != 0) {
                        request.onError("FlatBuffers format failed",
                            stderrText.ifBlank { "Exit code ${proc.exitValue()}" })
                        return
                    }
                    if (cancelled) return
                    request.onTextReady(stdoutText)
                } catch (t: Throwable) {
                    LOG.warn("flatbuffers-format invocation failed", t)
                    if (!cancelled) {
                        request.onError("FlatBuffers format failed",
                            t.message ?: t.javaClass.simpleName)
                    }
                } finally {
                    @Suppress("ResultOfMethodCallIgnored")
                    temp.delete()
                }
            }

            override fun cancel(): Boolean {
                cancelled = true
                process?.destroyForcibly()
                return true
            }

            override fun isRunUnderProgress(): Boolean = true
        }
    }

    companion object {
        private val LOG = Logger.getInstance(FlatBuffersFormattingService::class.java)

        /** Must match the `<notificationGroup id=…>` in plugin.xml. */
        const val NOTIFICATION_GROUP: String = "FlatBuffers"
    }
}
