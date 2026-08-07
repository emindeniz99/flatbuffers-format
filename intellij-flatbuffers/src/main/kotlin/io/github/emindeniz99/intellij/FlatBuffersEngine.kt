package io.github.emindeniz99.intellij

import java.nio.file.Path

/**
 * How the plugin is going to run the formatter for this format request.
 *
 * Two shapes, because there are two kinds of engine: a self-contained
 * executable (npm-installed CLI, user-supplied binary, or the downloaded
 * native binary) and the JavaScript bundle shipped inside the plugin
 * jar, which needs a Node interpreter in front of it. That is why this
 * is a sum type and not the `String?` path the resolver used to return —
 * a bundled script has no executable path of its own.
 */
sealed interface FlatBuffersEngine {
    /** Command prefix; extra args and the file to format get appended. */
    fun commandPrefix(): List<String>

    /** One line naming this engine, for the settings page and the log. */
    val describe: String
}

/** A `flatbuffers-format` executable that is invoked directly. */
data class CliEngine(val path: String, val origin: String) : FlatBuffersEngine {
    override fun commandPrefix(): List<String> = listOf(path)
    override val describe: String get() = "$origin — $path"
}

/** The plugin's own JS bundle, run on a Node found on this machine. */
data class NodeJsEngine(
    val nodePath: String,
    val script: Path,
    val nodeVersion: String,
    val nodeOrigin: String,
) : FlatBuffersEngine {
    override fun commandPrefix(): List<String> = listOf(nodePath, script.toString())
    override val describe: String
        get() = "bundled JS engine on Node $nodeVersion ($nodeOrigin — $nodePath)"
}

/**
 * A degradation the user needs to hear about. The whole point of this
 * type is that resolution never quietly settles for second best: every
 * outcome that is not "the engine we would have picked" carries one of
 * these, and the formatting service turns it into a notification.
 *
 * [kind] doubles as the dedup key — one notification per kind per
 * project session, so a format-on-save loop can't spam the balloon.
 */
data class EngineIssue(val kind: Kind, val title: String, val message: String) {
    enum class Kind {
        /** A Node was found but is older than the engine's floor. */
        NODE_TOO_OLD,

        /** The JS bundle shipped, but no Node exists to run it. */
        NODE_MISSING,

        /** Nothing usable at all — formatting cannot run. */
        NO_ENGINE,
    }
}

/** Result of one resolution pass: what we'll run, and what went wrong. */
data class EngineResolution(val engine: FlatBuffersEngine?, val issue: EngineIssue?)

/** What Node discovery came back with. */
sealed interface NodeLookup {
    /** A Node that meets the engine's declared floor. */
    data class Usable(val path: String, val version: String, val origin: String) : NodeLookup

    /**
     * Node exists but every candidate is below the floor. Carries the
     * newest one found so the message can name a concrete version —
     * "no Node found" is a lie the user would waste an hour on.
     */
    data class TooOld(val path: String, val version: String, val origin: String) : NodeLookup

    /** No `node` executable anywhere we looked. */
    object Missing : NodeLookup
}

/**
 * Everything [EngineResolver] needs from the outside world. Extracted as
 * an interface purely so the resolution *order* can be tested without an
 * IDE, a filesystem, or a Node install — the order is the part that
 * regresses silently.
 */
interface EngineEnvironment {
    /** User-configured binary path, or null when the field is blank. */
    fun configuredCli(): String?

    fun isExecutableFile(path: String): Boolean

    /** `flatbuffers-format` found on PATH, or null. */
    fun cliOnPath(): String?

    /** The extracted JS bundle, or null if the build shipped none. */
    fun bundledScript(): Path?

    fun locateNode(): NodeLookup

    /** Previously-downloaded native binary, or null. */
    fun cachedNativeBinary(): String?

    /** Node major the bundled JS requires, for the messages. */
    fun requiredNodeMajor(): Int
}

/**
 * The resolution order, in one place, with no I/O of its own.
 *
 *   1. User-configured binary path.
 *   2. `flatbuffers-format` on PATH.
 *   3. Bundled JS bundle + a discovered Node that meets the floor.
 *   4. Previously-downloaded native binary.
 *
 * Note this **reorders** the two pre-existing steps: PATH used to come
 * *after* the downloaded native binary. The reason for the swap is that
 * the cached native binary is now the last-resort tier — it is pinned to
 * whatever engine version was current when it was downloaded, while a
 * PATH install and the in-jar bundle both track what the user actually
 * has. A user who deliberately wants the downloaded binary can still
 * pin it in the settings field, which wins over everything.
 */
object EngineResolver {
    fun resolve(env: EngineEnvironment): EngineResolution {
        // 1. Configured path. Deliberately exclusive: if the user named a
        // binary and it isn't runnable, we do NOT quietly format with
        // some other engine behind their back — we say so and stop.
        val configured = env.configuredCli()
        if (configured != null) {
            if (env.isExecutableFile(configured)) {
                return EngineResolution(CliEngine(configured, "configured binary path"), null)
            }
            return EngineResolution(
                null,
                EngineIssue(
                    EngineIssue.Kind.NO_ENGINE,
                    "FlatBuffers formatter: configured engine is not runnable",
                    "Settings → Tools → FlatBuffers points at \"$configured\", which is not an " +
                        "executable file. Fix the path, or clear the field to fall back to " +
                        "auto-detection.",
                ),
            )
        }

        // 2. A real CLI on PATH.
        env.cliOnPath()?.let {
            return EngineResolution(CliEngine(it, "flatbuffers-format on PATH"), null)
        }

        // 3. Our own JS bundle, if a good-enough Node exists to run it.
        val script = env.bundledScript()
        val node = if (script != null) env.locateNode() else null
        if (script != null && node is NodeLookup.Usable) {
            return EngineResolution(
                NodeJsEngine(node.path, script, node.version, node.origin),
                null,
            )
        }

        // 4. The 105 MiB native binary, if it was downloaded earlier.
        val native = env.cachedNativeBinary()
            ?.let { CliEngine(it, "downloaded native engine") }

        return EngineResolution(native, issueFor(node, native, env.requiredNodeMajor()))
    }

    private fun issueFor(
        node: NodeLookup?,
        fallback: CliEngine?,
        requiredMajor: Int,
    ): EngineIssue? {
        val instead = if (fallback != null) {
            "Formatting with the downloaded native engine instead (${fallback.path})."
        } else {
            "No other engine is available, so formatting cannot run."
        }
        return when (node) {
            is NodeLookup.TooOld -> EngineIssue(
                EngineIssue.Kind.NODE_TOO_OLD,
                "FlatBuffers formatter: Node is too old for the bundled engine",
                "Found Node ${node.version} at ${node.path} (${node.origin}); the bundled " +
                    "flatbuffers-format engine requires Node $requiredMajor or newer. $instead",
            )

            NodeLookup.Missing -> EngineIssue(
                EngineIssue.Kind.NODE_MISSING,
                "FlatBuffers formatter: no Node found",
                "The plugin ships the formatter as a JavaScript bundle but found no `node` on " +
                    "PATH or in the usual version-manager locations, so it cannot run it. " +
                    "$instead Install Node $requiredMajor+, point at it in Settings → Tools → " +
                    "FlatBuffers, or download the self-contained native engine.",
            )

            // node == null means we never got as far as needing one: the
            // build shipped no bundle. Only worth a message if nothing
            // else resolved either.
            else -> if (fallback != null) {
                null
            } else {
                EngineIssue(
                    EngineIssue.Kind.NO_ENGINE,
                    "FlatBuffers formatter: no engine available",
                    "Searched the configured path, PATH, and the plugin's downloaded-engine " +
                        "cache and found no usable flatbuffers-format. Install it " +
                        "(`npm install -g flatbuffers-format`), point at it in Settings → " +
                        "Tools → FlatBuffers, or download the native engine.",
                )
            }
        }
    }
}
