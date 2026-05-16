package io.github.flatbuffersformat.intellij

import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.options.BoundConfigurable
import com.intellij.openapi.ui.DialogPanel
import com.intellij.ui.dsl.builder.bindSelected
import com.intellij.ui.dsl.builder.bindText
import com.intellij.ui.dsl.builder.columns
import com.intellij.ui.dsl.builder.panel

/**
 * Settings panel under Preferences → Tools → FlatBuffers. Three knobs:
 *
 *   1. CLI path. Empty means "auto-detect on PATH"; the field shows
 *      the resolved value as a comment so users can tell whether
 *      auto-detection worked.
 *   2. Extra CLI args. Free-form whitespace-separated string passed
 *      straight through. We don't validate — the engine's CLI gives
 *      better error messages than we ever would.
 *   3. Format-on-save toggle. Off by default; users who want it
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
            "Not found on PATH. Install via <code>npm install -g flatbuffers-format</code>."
        }

        return panel {
            row("Binary path:") {
                textFieldWithBrowseButton(
                    browseDialogTitle = "Select flatbuffers-format binary",
                    fileChooserDescriptor = FileChooserDescriptorFactory
                        .createSingleFileNoJarsDescriptor(),
                )
                    .columns(40)
                    .bindText(settings::cliPath)
                    .comment("Leave blank to auto-detect on PATH. $detectionHint")
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
