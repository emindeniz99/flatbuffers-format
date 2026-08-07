package io.github.emindeniz99.intellij

import com.intellij.openapi.diagnostic.Logger
import com.intellij.util.EnvironmentUtil
import java.nio.file.InvalidPathException
import java.nio.file.Path
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * The real-world [EngineEnvironment]: the IDE's recovered environment,
 * this machine's filesystem, and actual `node --version` probes.
 *
 * The resolution *order* lives in [EngineResolver] and is tested there;
 * everything here is the I/O that order needs.
 */
class IdeEngineEnvironment(
    private val settings: FlatBuffersSettings,
    private val os: OsKind = OsKind.current(),
    private val fs: FileSystemProbe = FileSystemProbe.REAL,
) : EngineEnvironment {

    override fun configuredCli(): String? = settings.cliPath.trim().ifBlank { null }

    override fun isExecutableFile(path: String): Boolean =
        asPath(path)?.let { fs.isExecutableFile(it) } ?: false

    override fun cliOnPath(): String? {
        val names = if (os == OsKind.WINDOWS) {
            listOf("flatbuffers-format.cmd", "flatbuffers-format.exe", "flatbuffers-format.bat")
        } else {
            listOf("flatbuffers-format")
        }
        for (dir in NodeCandidates.pathEntries(environment()["PATH"], os)) {
            for (name in names) {
                val candidate = dir.resolve(name)
                if (fs.isExecutableFile(candidate)) return candidate.toString()
            }
        }
        return null
    }

    override fun bundledScript(): Path? = BundledJsEngine.script()

    override fun locateNode(): NodeLookup {
        val home = asPath(System.getProperty("user.home")) ?: return NodeLookup.Missing
        val candidates = NodeCandidates.enumerate(os, environment(), home, fs)
        return NodeSelection.select(candidates, requiredNodeMajor(), NodeProbe::version)
    }

    override fun cachedNativeBinary(): String? =
        if (BundledEngine.isCached()) BundledEngine.cachedBinaryPath()?.toString() else null

    override fun requiredNodeMajor(): Int = GENERATED_NODE_MAJOR_FLOOR

    /**
     * The environment to search, which is emphatically *not*
     * `System.getenv()`.
     *
     * An IDE launched from the macOS Dock (or from a Linux desktop
     * entry) inherits the launcher's environment, not the user's shell
     * profile: PATH is typically `/usr/bin:/bin:/usr/sbin:/sbin`, and
     * every Node installed by nvm/fnm/asdf is invisible.
     * [EnvironmentUtil.getEnvironmentMap] is the platform's fix — it
     * runs the login shell once at startup and caches what it exported.
     * We still union in the process environment, because a
     * terminal-launched IDE can have PATH entries the login shell does
     * not export.
     */
    private fun environment(): Map<String, String> {
        val shell = try {
            EnvironmentUtil.getEnvironmentMap()
        } catch (t: Throwable) {
            LOG.warn("Could not read the IDE's recovered shell environment", t)
            emptyMap()
        }
        val process: Map<String, String> = System.getenv()
        val merged = LinkedHashMap<String, String>(process)
        merged.putAll(shell)
        merged["PATH"] = NodeCandidates.mergePathEntries(shell["PATH"], process["PATH"], os)
        return merged
    }

    private fun asPath(value: String?): Path? {
        if (value.isNullOrBlank()) return null
        return try {
            Path.of(value)
        } catch (_: InvalidPathException) {
            null
        }
    }

    private companion object {
        private val LOG = Logger.getInstance(IdeEngineEnvironment::class.java)
    }
}

/**
 * `node --version`, spawned at most once per interpreter per IDE
 * session.
 *
 * Formatting is on the interactive path — Reformat Code, and
 * format-on-save, which fires on every ⌘S. Spawning a process to ask a
 * question whose answer cannot change while that file sits on disk
 * would be a per-keystroke cost for nothing. Failures are cached too,
 * so a candidate that is not really Node is not re-tried forever.
 *
 * [clear] exists for the one moment the cache is genuinely stale: the
 * user just installed Node and opened the settings page to check.
 */
object NodeProbe {
    private val LOG = Logger.getInstance(NodeProbe::class.java)

    /** Interpreter path -> version string; "" records a failed probe. */
    private val cache = ConcurrentHashMap<String, String>()

    fun version(node: Path): String? {
        val key = node.toString()
        cache[key]?.let { return it.ifEmpty { null } }
        val version = spawn(node) ?: ""
        cache[key] = version
        return version.ifEmpty { null }
    }

    fun clear() = cache.clear()

    private fun spawn(node: Path): String? = try {
        val process = ProcessBuilder(node.toString(), "--version")
            .redirectErrorStream(true)
            .start()
        val output = process.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        if (!process.waitFor(5, TimeUnit.SECONDS)) {
            process.destroyForcibly()
            LOG.warn("$node --version timed out")
            null
        } else if (process.exitValue() != 0) {
            LOG.warn("$node --version exited ${process.exitValue()}")
            null
        } else {
            output.trim().lineSequence().firstOrNull { NodeSelection.parseMajor(it) != null }
        }
    } catch (t: Throwable) {
        LOG.debug("$node --version failed", t)
        null
    }
}
