package io.github.emindeniz99.intellij

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.options.BoundConfigurable
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.Task
import com.intellij.openapi.ui.DialogPanel
import com.intellij.openapi.ui.Messages
import com.intellij.ui.dsl.builder.bindSelected
import com.intellij.ui.dsl.builder.bindText
import com.intellij.ui.dsl.builder.columns
import com.intellij.ui.dsl.builder.panel

/**
 * Settings panel under Preferences → Tools → FlatBuffers:
 *
 *   1. CLI path. Empty means "auto-detect"; we show whatever was
 *      found below the field. Resolution order: configured > cached
 *      download > PATH.
 *   2. Download bundled engine. Fetches the matching native binary
 *      from the engine's GitHub Release on demand and caches it
 *      under the IDE system directory; eliminates the "install
 *      Node + npm + flatbuffers-format globally" prerequisite for
 *      users who just want the formatter to work.
 *   3. Extra CLI args. Free-form whitespace-separated string passed
 *      straight through. We don't validate — the engine's CLI gives
 *      better error messages than we ever would.
 *   4. Format-on-save toggle. Off by default; users who want it
 *      either flip this or rely on IDE-level Save Actions.
 *
 * Implementation uses `BoundConfigurable` + the Kotlin UI DSL, which
 * is the recommended path since 2022.1 and trivially threads
 * isModified/apply/reset through `bindText`/`bindSelected`.
 */
class FlatBuffersConfigurable : BoundConfigurable("FlatBuffers") {
    override fun createPanel(): DialogPanel {
        val settings = FlatBuffersSettings.getInstance()
        val detected = settings.resolveCliPath()
        val detectionHint = if (detected != null) {
            "Auto-detected at <code>$detected</code>"
        } else {
            "Not found on PATH. Install via <code>npm install -g flatbuffers-format</code> " +
                "or use the \"Download bundled engine\" button below."
        }

        return panel {
            row("Binary path:") {
                // Plain text field rather than the DSL's
                // `textFieldWithBrowseButton(...)` helper: the latter
                // has default args, so Kotlin compiles every call site
                // through the `$default` synthetic which is deprecated
                // since 2024.3. The native Java alternative
                // (`TextFieldWithBrowseButton` + `addBrowseFolderListener`)
                // changed signatures multiple times between 2024.1 and
                // 2025.1, making it hard to compile a single source
                // tree that works against the whole sinceBuild..*
                // range. We sidestep both: auto-detection already
                // resolves the binary in 99% of cases, and the comment
                // below makes the manual path explicit.
                textField()
                    .columns(40)
                    .bindText(settings::cliPath)
                    .comment("Leave blank to auto-detect on PATH. $detectionHint<br/>" +
                        "To set manually, paste an absolute path to the " +
                        "<code>flatbuffers-format</code> executable.")
            }
            row("Bundled engine:") {
                val asset = BundledEngine.platformAsset()
                val supportedHere = asset != null
                val cachedHere = BundledEngine.isCached()
                val initialLabel = when {
                    !supportedHere ->
                        "Unsupported platform — install manually"
                    cachedHere ->
                        "Re-download flatbuffers-format ${BundledEngine.ENGINE_VERSION}"
                    else ->
                        "Download flatbuffers-format ${BundledEngine.ENGINE_VERSION}"
                }
                button(initialLabel) { _ ->
                    if (!supportedHere) {
                        Messages.showWarningDialog(
                            "No prebuilt flatbuffers-format binary exists for " +
                                "${System.getProperty("os.name")} / ${System.getProperty("os.arch")}. " +
                                "Build the binary yourself from the engine source and " +
                                "set its path above.",
                            "FlatBuffers Engine Download",
                        )
                        return@button
                    }
                    val task = object : Task.Backgroundable(
                        null,
                        "Downloading flatbuffers-format engine",
                        true,
                    ) {
                        override fun run(indicator: ProgressIndicator) {
                            try {
                                val path = BundledEngine.ensureDownloaded(indicator)
                                ApplicationManager.getApplication().invokeLater {
                                    Messages.showInfoMessage(
                                        "flatbuffers-format ${BundledEngine.ENGINE_VERSION} " +
                                            "is now cached at:\n$path\n\nClose and reopen this " +
                                            "settings page to refresh the auto-detection hint.",
                                        "FlatBuffers Engine Download",
                                    )
                                }
                            } catch (e: BundledEngine.BundledEngineException) {
                                ApplicationManager.getApplication().invokeLater {
                                    Messages.showErrorDialog(
                                        e.message ?: "Unknown download failure.",
                                        "FlatBuffers Engine Download Failed",
                                    )
                                }
                            }
                        }
                    }
                    task.queue()
                }.enabled(supportedHere)
                    .comment(
                        if (asset != null) {
                            "Will fetch <code>$asset</code> (~30 MiB) from the " +
                                "<code>flatbuffers-format@${BundledEngine.ENGINE_VERSION}</code> GitHub Release. " +
                                "Cached under the IDE system directory."
                        } else {
                            "Prebuilt binaries are published for linux-x64, linux-arm64, " +
                                "macos-x64, macos-arm64, and windows-x64. Your platform " +
                                "isn't in that set."
                        },
                    )
            }
            row("Extra arguments:") {
                textField()
                    .columns(40)
                    .bindText(settings::extraArgs)
                    .comment("Whitespace-separated. " +
                        "Example: <code>--use-tabs --line-width 120</code>.")
            }
            row {
                checkBox("Format on save")
                    .bindSelected(settings::formatOnSave)
                    .comment("Runs flatbuffers-format every time you save a .fbs file. " +
                        "Off by default — the standard Reformat Code action " +
                        "(Ctrl/⌘+Alt+L) always works regardless.")
            }
        }
    }
}
