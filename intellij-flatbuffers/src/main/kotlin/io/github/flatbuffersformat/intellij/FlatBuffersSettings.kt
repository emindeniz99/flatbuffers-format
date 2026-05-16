package io.github.flatbuffersformat.intellij

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.util.xmlb.XmlSerializerUtil
import java.io.File

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
    name = "io.github.flatbuffersformat.intellij.FlatBuffersSettings",
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

        /**
         * If true, the plugin registers a save listener that formats
         * `.fbs` files on save. Defaults off — users can still
         * format-on-save via IDE's built-in "Save Actions" plugin or
         * via the Code → Reformat Code action.
         */
        var formatOnSave: Boolean = false
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

    var formatOnSave: Boolean
        get() = state.formatOnSave
        set(value) { state.formatOnSave = value }

    /**
     * Returns an absolute path to a usable `flatbuffers-format` binary,
     * or null if none can be found. Resolution order:
     *
     *   1. User-configured path (Settings → Tools → FlatBuffers).
     *   2. Native binary downloaded by the plugin's "Download
     *      bundled engine" action (see [BundledEngine]).
     *   3. `flatbuffers-format` on `PATH`. On Windows the npm
     *      wrapper is `.cmd`; we check both spellings.
     *
     * The configured path wins so power users can override an
     * accidentally-cached older engine. The bundled-engine cache
     * wins over `PATH` so a user who downloaded via our settings
     * page gets a predictable behaviour even if their `PATH`
     * later changes.
     */
    fun resolveCliPath(): String? {
        if (state.cliPath.isNotBlank()) {
            val f = File(state.cliPath)
            if (f.exists() && f.canExecute()) return f.absolutePath
            return null
        }
        val cached = BundledEngine.cachedBinaryPath()
        if (cached != null) {
            val f = cached.toFile()
            if (f.exists() && f.canExecute()) return f.absolutePath
        }
        return findOnPath("flatbuffers-format")
    }

    private fun findOnPath(name: String): String? {
        val path = System.getenv("PATH") ?: return null
        val isWindows = System.getProperty("os.name").lowercase().contains("win")
        val candidates = if (isWindows) listOf("$name.cmd", "$name.exe", name) else listOf(name)
        val sep = if (isWindows) ";" else ":"
        for (dir in path.split(sep)) {
            if (dir.isBlank()) continue
            for (c in candidates) {
                val f = File(dir, c)
                if (f.exists() && f.canExecute()) return f.absolutePath
            }
        }
        return null
    }

    companion object {
        @JvmStatic
        fun getInstance(): FlatBuffersSettings =
            ApplicationManager.getApplication().getService(FlatBuffersSettings::class.java)
    }
}
