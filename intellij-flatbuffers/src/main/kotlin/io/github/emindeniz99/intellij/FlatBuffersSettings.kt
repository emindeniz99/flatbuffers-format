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

        /**
         * Extra CLI arguments appended to every invocation. Lets users
         * pass `--use-tabs`, `--line-width 120`, etc. without us
         * mirroring every engine flag in the UI. Validation happens at
         * the engine side; we just split on whitespace.
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

    var extraArgs: String
        get() = state.extraArgs
        set(value) { state.extraArgs = value.trim() }

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
