package io.github.emindeniz99.intellij

import java.nio.file.Files
import java.nio.file.InvalidPathException
import java.nio.file.Path

/**
 * Finding a Node interpreter on a developer machine, and deciding
 * whether it is new enough to run the bundled JS engine.
 *
 * Everything in this file is deliberately free of IntelliJ (and of the
 * real filesystem, and of process spawning) so the two parts that
 * actually break in the field can be tested:
 *
 *   * **where we look, and in what order** — the bug that produced this
 *     code was an IDE launched from the macOS Dock, whose PATH is
 *     `/usr/bin:/bin:/usr/sbin:/sbin` and contains no Node at all,
 *     while the user's only Node lives under `~/.nvm/versions/node/`.
 *   * **the version gate** — handing a `--target=node20` bundle to a
 *     Node 10 produces a syntax error the user cannot act on, so a
 *     too-old Node must be rejected and reported, never used.
 */
enum class OsKind {
    MAC,
    LINUX,
    WINDOWS,
    ;

    val pathSeparator: String get() = if (this == WINDOWS) ";" else ":"

    companion object {
        fun current(): OsKind {
            val name = System.getProperty("os.name").lowercase()
            return when {
                name.contains("win") -> WINDOWS
                name.contains("mac") || name.contains("darwin") -> MAC
                else -> LINUX
            }
        }
    }
}

/** One place a Node interpreter might be, plus how we came to look there. */
data class NodeCandidate(val path: Path, val origin: String)

/**
 * The only filesystem questions [NodeCandidates] asks. An interface so
 * the candidate order can be tested against a made-up machine layout —
 * the alternative (installing five version managers on CI) is not a
 * test anyone would keep running.
 */
interface FileSystemProbe {
    fun isExecutableFile(path: Path): Boolean

    /** Immediate subdirectories of [dir]; empty when [dir] isn't one. */
    fun listDirectories(dir: Path): List<Path>

    companion object {
        val REAL: FileSystemProbe = object : FileSystemProbe {
            override fun isExecutableFile(path: Path): Boolean =
                Files.isRegularFile(path) && Files.isExecutable(path)

            override fun listDirectories(dir: Path): List<Path> = try {
                Files.list(dir).use { stream ->
                    stream.filter { Files.isDirectory(it) }.toList()
                }
            } catch (_: Exception) {
                // Not a directory, unreadable, or gone between the two
                // calls. All of them mean "no versions here".
                emptyList()
            }
        }
    }
}

object NodeCandidates {

    /**
     * Every Node we can think of on this machine, best first.
     *
     * Order is PATH → version managers → system install locations. PATH
     * first because it is what the user's own shell would run; the
     * version-manager sweep exists precisely for the case where PATH is
     * the stunted one a GUI launcher hands down.
     *
     * @param env the environment to read (see
     *   `IdeEngineEnvironment.environment()` — on macOS this is the
     *   login shell's environment, not the IDE process's).
     */
    fun enumerate(
        os: OsKind,
        env: Map<String, String>,
        home: Path,
        fs: FileSystemProbe,
    ): List<NodeCandidate> {
        val found = LinkedHashMap<String, NodeCandidate>()

        fun add(path: Path, origin: String) {
            val normalised = path.normalize()
            val key = normalised.toString()
            if (found.containsKey(key)) return
            if (fs.isExecutableFile(normalised)) found[key] = NodeCandidate(normalised, origin)
        }

        /** Try every `node` spelling inside a bin directory. */
        fun addFrom(dir: Path?, origin: String) {
            if (dir == null) return
            for (name in exeNames(os)) add(dir.resolve(name), origin)
        }

        /** Version-manager layout: <root>/<version>/<tail...>, newest version first. */
        fun addVersioned(root: Path?, origin: String, vararg tail: String) {
            if (root == null) return
            for (versionDir in versionDirsNewestFirst(root, fs)) {
                var dir = versionDir
                for (segment in tail) dir = dir.resolve(segment)
                addFrom(dir, "$origin ${versionDir.fileName}")
            }
        }

        // 1. PATH, in its own order.
        for (dir in pathEntries(env["PATH"], os)) addFrom(dir, "PATH")

        // 2. Version managers. nvm leads because it is both the most
        //    common and the one that produced the field report.
        if (os == OsKind.WINDOWS) {
            // nvm-windows keeps `v22.16.0/node.exe` directly under its root.
            addVersioned(pathOrNull(env["NVM_HOME"]) ?: home.resolve("AppData/Roaming/nvm"), "nvm")
            addVersioned(
                pathOrNull(env["FNM_DIR"]) ?: home.resolve("AppData/Roaming/fnm/node-versions"),
                "fnm",
                "installation",
            )
            addFrom((pathOrNull(env["VOLTA_HOME"]) ?: home.resolve("AppData/Local/Volta")).resolve("bin"), "Volta")
        } else {
            addVersioned(
                (pathOrNull(env["NVM_DIR"]) ?: home.resolve(".nvm")).resolve("versions/node"),
                "nvm",
                "bin",
            )
            addVersioned(fnmRoot(os, env, home), "fnm", "installation", "bin")
            addFrom((pathOrNull(env["VOLTA_HOME"]) ?: home.resolve(".volta")).resolve("bin"), "Volta")
            val asdf = pathOrNull(env["ASDF_DATA_DIR"]) ?: home.resolve(".asdf")
            addFrom(asdf.resolve("shims"), "asdf")
            addVersioned(asdf.resolve("installs/nodejs"), "asdf", "bin")
            val nodenv = pathOrNull(env["NODENV_ROOT"]) ?: home.resolve(".nodenv")
            addFrom(nodenv.resolve("shims"), "nodenv")
            addVersioned(nodenv.resolve("versions"), "nodenv", "bin")
            val mise = pathOrNull(env["MISE_DATA_DIR"]) ?: home.resolve(".local/share/mise")
            addFrom(mise.resolve("shims"), "mise")
            addVersioned(mise.resolve("installs/node"), "mise", "bin")
        }

        // 3. Plain system installs.
        for (dir in systemBinDirs(os, env)) addFrom(dir, "system install")

        return found.values.toList()
    }

    /** `PATH` split into directories, skipping blanks. */
    fun pathEntries(pathVar: String?, os: OsKind): List<Path> =
        (pathVar ?: "")
            .split(os.pathSeparator)
            .filter { it.isNotBlank() }
            .mapNotNull { pathOrNull(it) }

    /**
     * Concatenates two `PATH` values, [first] winning, without repeats.
     * Used to merge the login-shell PATH the IDE recovered with the one
     * the IDE process actually inherited — neither is a superset of the
     * other in practice.
     */
    fun mergePathEntries(first: String?, second: String?, os: OsKind): String {
        val merged = LinkedHashSet<String>()
        for (value in listOf(first, second)) {
            (value ?: "").split(os.pathSeparator).filter { it.isNotBlank() }.forEach { merged.add(it) }
        }
        return merged.joinToString(os.pathSeparator)
    }

    /** Comparable form of a version directory name: `v22.16.0` -> [22, 16, 0]. */
    fun versionKey(name: String): List<Int> =
        name.removePrefix("v").split('.', '-', '_').mapNotNull { it.toIntOrNull() }

    private fun versionDirsNewestFirst(root: Path, fs: FileSystemProbe): List<Path> =
        fs.listDirectories(root).sortedWith { a, b ->
            compareVersions(versionKey(b.fileName.toString()), versionKey(a.fileName.toString()))
        }

    private fun compareVersions(a: List<Int>, b: List<Int>): Int {
        for (i in 0 until maxOf(a.size, b.size)) {
            val c = a.getOrElse(i) { 0 }.compareTo(b.getOrElse(i) { 0 })
            if (c != 0) return c
        }
        return 0
    }

    private fun fnmRoot(os: OsKind, env: Map<String, String>, home: Path): Path {
        pathOrNull(env["FNM_DIR"])?.let { return it.resolve("node-versions") }
        return if (os == OsKind.MAC) {
            home.resolve("Library/Application Support/fnm/node-versions")
        } else {
            home.resolve(".local/share/fnm/node-versions")
        }
    }

    private fun systemBinDirs(os: OsKind, env: Map<String, String>): List<Path> = when (os) {
        OsKind.WINDOWS -> listOfNotNull(
            pathOrNull(env["ProgramFiles"])?.resolve("nodejs"),
            pathOrNull(env["LOCALAPPDATA"])?.resolve("Programs/nodejs"),
            pathOrNull(env["APPDATA"])?.resolve("npm"),
        )
        // Apple-silicon Homebrew, Intel Homebrew / manual installs, distro packages.
        else -> listOf("/opt/homebrew/bin", "/usr/local/bin", "/usr/bin").mapNotNull { pathOrNull(it) }
    }

    private fun exeNames(os: OsKind): List<String> =
        if (os == OsKind.WINDOWS) listOf("node.exe", "node.cmd") else listOf("node")

    private fun pathOrNull(value: String?): Path? {
        if (value.isNullOrBlank()) return null
        return try {
            Path.of(value)
        } catch (_: InvalidPathException) {
            null
        }
    }
}

object NodeSelection {

    /**
     * Walks [candidates] in order, asking [probe] for each one's
     * `node --version`, and returns the first that meets [floorMajor].
     *
     * When nothing meets the floor but *something* answered, the newest
     * of those is returned as [NodeLookup.TooOld] so the notification
     * can name a real version instead of claiming no Node exists.
     */
    fun select(
        candidates: List<NodeCandidate>,
        floorMajor: Int,
        probe: (Path) -> String?,
    ): NodeLookup {
        var best: NodeLookup.TooOld? = null
        var bestMajor = Int.MIN_VALUE
        for (candidate in candidates) {
            val version = probe(candidate.path) ?: continue
            val major = parseMajor(version) ?: continue
            if (major >= floorMajor) {
                return NodeLookup.Usable(candidate.path.toString(), version, candidate.origin)
            }
            if (major > bestMajor) {
                bestMajor = major
                best = NodeLookup.TooOld(candidate.path.toString(), version, candidate.origin)
            }
        }
        return best ?: NodeLookup.Missing
    }

    /** `v22.16.0` -> 22. Null when the output isn't a Node version at all. */
    fun parseMajor(versionOutput: String): Int? =
        Regex("""^v?(\d+)\.\d+""").find(versionOutput.trim())?.groupValues?.get(1)?.toIntOrNull()
}
