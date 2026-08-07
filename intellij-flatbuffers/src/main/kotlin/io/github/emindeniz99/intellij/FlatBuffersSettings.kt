package io.github.emindeniz99.intellij

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.util.xmlb.XmlSerializerUtil

/**
 * App-level persistent settings. Stored in
 * `<config>/options/flatbuffers-format.xml` by IntelliJ's standard
 * settings infrastructure. The Persistent State Component is the
 * recommended way to do this since 2018; the older `Configurable` +
 * `PropertiesComponent` shortcut is deprecated.
 *
 * Why app-level and not project-level: the CLI lives on the user's
 * machine, not in their project. Per-project format-option overrides
 * are exposed as CLI args (`extraArgs`) so different projects can
 * still differ via project-level `.editorconfig` / git-tracked
 * `flatbuffers-format` config files (when the engine grows them).
 *
 * Every format option below defaults to the engine's own default, and
 * [FormatterCliArgs] emits nothing for a value still sitting on it — so
 * a fresh install runs the exact command line it ran before these
 * fields existed.
 */
@State(
    name = "io.github.emindeniz99.intellij.FlatBuffersSettings",
    storages = [Storage("flatbuffers-format.xml")],
)
@Service(Service.Level.APP)
class FlatBuffersSettings : PersistentStateComponent<FlatBuffersSettings.State> {

    class State {
        /**
         * Absolute path to the `flatbuffers-format` binary. Empty =
         * auto-detect on `PATH`. Auto-detection runs on every format
         * (it's cheap — `which` returns instantly) so installing the
         * CLI doesn't require restarting the IDE.
         */
        var cliPath: String = ""

        /** `--indent <n>`: spaces (or tab stops) per indent level. */
        var indent: Int = FormatterCliArgs.DEFAULT_INDENT

        /** `--use-tabs`: indent with tab characters instead of spaces. */
        var useTabs: Boolean = false

        /** `--line-width <n>`: target column for compact/wrap decisions. */
        var lineWidth: Int = FormatterCliArgs.DEFAULT_LINE_WIDTH

        /**
         * Whether small enum/union/single-field bodies may collapse onto
         * one line.
         *
         * Stored positively even though the CLI flag is the negative
         * `--no-compact-single-line`, and defaulting to `true` because
         * that is what the engine does. Persisting the negative would
         * make the XML on disk read backwards ("false" meaning
         * collapsing is *on*) and would make a future rename of the flag
         * a data migration. [FormatterCliArgs] owns the inversion.
         */
        var compactSingleLine: Boolean = true

        /**
         * `--max-blank-lines <n>`: consecutive blank lines kept between
         * declarations. 0 is a real setting ("remove them all"), not an
         * absent one.
         */
        var maxBlankLines: Int = FormatterCliArgs.DEFAULT_MAX_BLANK_LINES

        /** `--wrap-comments`: reflow long line comments at whitespace. */
        var wrapComments: Boolean = false

        /**
         * `--comment-width <n>`, or [FormatterCliArgs.COMMENT_WIDTH_INHERIT]
         * for the engine's default of following the line width. That
         * "inherit" state has to be representable — otherwise raising
         * the line width would silently leave comments wrapping at the
         * old column.
         */
        var commentWidth: Int = FormatterCliArgs.COMMENT_WIDTH_INHERIT

        /**
         * Extra CLI arguments, for engine options this panel does not
         * model (`--no-gitignore`, anything the engine adds after this
         * release). Appended after the typed options above so they can
         * also override one. Validation happens at the engine side; we
         * just split on whitespace.
         */
        var extraArgs: String = ""

    }

    private var state = State()

    override fun getState(): State = state
    override fun loadState(loaded: State) {
        XmlSerializerUtil.copyBean(loaded, state)
    }

    var cliPath: String
        get() = state.cliPath
        set(value) { state.cliPath = value.trim() }

    var indent: Int
        get() = state.indent
        set(value) { state.indent = value }

    var useTabs: Boolean
        get() = state.useTabs
        set(value) { state.useTabs = value }

    var lineWidth: Int
        get() = state.lineWidth
        set(value) { state.lineWidth = value }

    var compactSingleLine: Boolean
        get() = state.compactSingleLine
        set(value) { state.compactSingleLine = value }

    var maxBlankLines: Int
        get() = state.maxBlankLines
        set(value) { state.maxBlankLines = value }

    var wrapComments: Boolean
        get() = state.wrapComments
        set(value) { state.wrapComments = value }

    var commentWidth: Int
        get() = state.commentWidth
        set(value) { state.commentWidth = value }

    var extraArgs: String
        get() = state.extraArgs
        set(value) { state.extraArgs = value.trim() }

    /**
     * The engine arguments these settings imply — the format options
     * that differ from the engine's defaults, then [extraArgs].
     */
    fun formatterArgs(): List<String> = FormatterCliArgs.of(state)

    // Engine resolution deliberately does NOT live here any more. It
    // moved to [EngineResolver] + [IdeEngineEnvironment] when the
    // plugin gained a second *shape* of engine: the in-jar JS bundle
    // needs `node <script>`, which a `String?` path cannot express. The
    // old implementation also searched `System.getenv("PATH")`, which
    // is the wrong PATH for an IDE launched from the Dock — the very
    // bug that produced the new resolver.

    companion object {
        @JvmStatic
        fun getInstance(): FlatBuffersSettings =
            ApplicationManager.getApplication().getService(FlatBuffersSettings::class.java)
    }
}
