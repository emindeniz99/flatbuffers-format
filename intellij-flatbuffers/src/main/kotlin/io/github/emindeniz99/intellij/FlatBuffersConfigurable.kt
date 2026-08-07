package io.github.emindeniz99.intellij

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.options.BoundConfigurable
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.Task
import com.intellij.openapi.ui.DialogPanel
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.ui.ValidationInfo
import com.intellij.ui.components.JBTextField
import com.intellij.ui.dsl.builder.bindIntText
import com.intellij.ui.dsl.builder.bindSelected
import com.intellij.ui.dsl.builder.bindText
import com.intellij.ui.dsl.builder.columns
import com.intellij.ui.dsl.builder.panel
import com.intellij.ui.layout.ValidationInfoBuilder

/**
 * Settings panel under Preferences → Tools → FlatBuffers:
 *
 *   1. CLI path. Empty means "auto-detect"; we show whatever
 *      [EngineResolver] picked below the field, including the
 *      degradation message when it had to settle for second best.
 *   2. Download bundled engine. Fetches the matching native binary
 *      from the engine's GitHub Release on demand and caches it
 *      under the IDE system directory; eliminates the "install
 *      Node + npm + flatbuffers-format globally" prerequisite for
 *      users who just want the formatter to work.
 *   3. Format options — one typed field per engine option, each
 *      labelled with the engine's default. These used to be reachable
 *      only by typing flags into the free-text box below, which meant a
 *      user had to know the flag existed and spell it right; a typo
 *      formatted the file with the default and reported nothing.
 *   4. Extra CLI args. Still here, as the escape hatch for options the
 *      panel doesn't model and for overriding one that it does. Passed
 *      straight through, appended last, unvalidated — the engine's CLI
 *      gives better error messages than we ever would.
 *
 * The numeric fields *are* validated here, which the free-text box
 * never could be: a bad value must not reach the engine, because a
 * failed format looks to the user like the plugin is broken.
 *
 * Implementation uses `BoundConfigurable` + the Kotlin UI DSL, which
 * is the recommended path since 2022.1 and trivially threads
 * isModified/apply/reset through `bindText`/`bindIntText`/`bindSelected`.
 */
class FlatBuffersConfigurable : BoundConfigurable("FlatBuffers") {
    override fun createPanel(): DialogPanel {
        val settings = FlatBuffersSettings.getInstance()
        // Someone opening this page has usually just installed
        // something; a cached "no Node here" from IDE start would make
        // the page lie about it.
        NodeProbe.clear()
        val resolution = EngineResolver.resolve(IdeEngineEnvironment(settings))
        val detectionHint = buildString {
            val engine = resolution.engine
            if (engine != null) {
                append("Currently using <b>${engine.describe}</b>.")
            } else {
                append(
                    "No engine found. Install via <code>npm install -g flatbuffers-format</code>, " +
                        "install Node ${GENERATED_NODE_MAJOR_FLOOR}+ so the plugin can run its own " +
                        "bundled engine, or use the \"Download bundled engine\" button below.",
                )
            }
            resolution.issue?.let { append("<br/>${it.message}") }
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
                                "<code>flatbuffers-format-v${BundledEngine.ENGINE_VERSION}</code> GitHub Release. " +
                                "Cached under the IDE system directory."
                        } else {
                            "Prebuilt binaries are published for linux-x64, linux-arm64, " +
                                "macos-x64, macos-arm64, and windows-x64. Your platform " +
                                "isn't in that set."
                        },
                    )
            }
            group("Format options") {
                row("Indent width:") {
                    textField()
                        .columns(6)
                        .bindIntText(settings::indent)
                        .validationOnInput { atLeast(it, 1) }
                        .validationOnApply { atLeast(it, 1) }
                        .comment("Spaces per indent level — or tab stops, with the box below. " +
                            "Default: <code>2</code>.")
                }
                row {
                    checkBox("Indent with tabs")
                        .bindSelected(settings::useTabs)
                        .comment("Default: off (indent with spaces).")
                }
                row("Line width:") {
                    textField()
                        .columns(6)
                        .bindIntText(settings::lineWidth)
                        .validationOnInput { atLeast(it, 1) }
                        .validationOnApply { atLeast(it, 1) }
                        .comment("Target column the engine wraps and collapses against. " +
                            "Default: <code>80</code>.")
                }
                row {
                    checkBox("Collapse small enum, union and single-field bodies onto one line")
                        .bindSelected(settings::compactSingleLine)
                        .comment("Default: on. Unticking passes " +
                            "<code>--no-compact-single-line</code>.")
                }
                row("Max blank lines:") {
                    textField()
                        .columns(6)
                        .bindIntText(settings::maxBlankLines)
                        .validationOnInput { atLeast(it, 0) }
                        .validationOnApply { atLeast(it, 0) }
                        .comment("Consecutive blank lines kept between declarations; " +
                            "<code>0</code> removes them all. Default: <code>1</code>.")
                }
                row {
                    checkBox("Reflow long line comments")
                        .bindSelected(settings::wrapComments)
                        .comment("Default: off.")
                }
                row("Comment width:") {
                    textField()
                        .columns(6)
                        .bindIntText(settings::commentWidth)
                        .validationOnInput { atLeast(it, FormatterCliArgs.COMMENT_WIDTH_INHERIT) }
                        .validationOnApply { atLeast(it, FormatterCliArgs.COMMENT_WIDTH_INHERIT) }
                        .comment("Column the reflow above wraps at. " +
                            "<code>${FormatterCliArgs.COMMENT_WIDTH_INHERIT}</code> follows the " +
                            "line width, which is the engine's default.")
                }
            }
            row("Extra arguments:") {
                textField()
                    .columns(40)
                    .bindText(settings::extraArgs)
                    .comment("Whitespace-separated, for anything not covered above — e.g. " +
                        "<code>--no-gitignore</code>. Appended after the options above, so a " +
                        "flag repeated here wins.")
            }
            row {
                comment("Format on save is handled by the IDE, not by this plugin: " +
                    "enable <i>Settings | Tools | Actions on Save | Reformat code</i>. " +
                    "It drives this formatter through the platform's formatting " +
                    "service, the same path as Reformat Code (Ctrl/⌘+Alt+L).")
            }
        }
    }
}

/**
 * "A whole number, at least [min]" — the only shape of numeric
 * constraint this panel needs, and the reason the format options are
 * fields rather than free text.
 *
 * Applied on input (so the field goes red as it is typed) *and* on
 * apply (so the value cannot be committed and shipped to the engine,
 * which would fail the next format with a CLI error the user has no
 * reason to connect to this page).
 */
private fun ValidationInfoBuilder.atLeast(field: JBTextField, min: Int): ValidationInfo? {
    val value = field.text.trim().toIntOrNull()
    return when {
        value == null -> error("Enter a whole number.")
        value < min -> error("Enter $min or more.")
        else -> null
    }
}
