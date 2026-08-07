package io.github.emindeniz99.intellij

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.file.Path

/**
 * Where we look for Node, in what order, and which versions we refuse.
 *
 * The bug that produced this code: Android Studio started from the
 * macOS Dock, PATH = `/usr/bin:/bin:/usr/sbin:/sbin`, and the machine's
 * only Node at `~/.nvm/versions/node/v22.16.0/bin/node`. The plugin
 * reported "no engine" on a machine that had one.
 */
class NodeDiscoveryTest {

    /**
     * A machine described by the executables it has. Directories are
     * inferred from them, so a version-manager layout is one string per
     * installed version.
     */
    private class FakeMachine(vararg executables: String) : FileSystemProbe {
        private val files: Set<Path> = executables.map { Path.of(it).normalize() }.toSet()
        private val dirs: Set<Path> = files
            .flatMap { file -> generateSequence(file.parent) { it.parent }.toList() }
            .toSet()

        override fun isExecutableFile(path: Path): Boolean = path.normalize() in files

        // Deliberately sorted lexicographically — the natural order of a
        // real directory listing is arbitrary, and returning it sorted
        // means "newest first" has to be produced by the code under test
        // rather than accidentally inherited from the input.
        override fun listDirectories(dir: Path): List<Path> =
            dirs.filter { it.parent == dir.normalize() }.sortedBy { it.toString() }
    }

    private val barePath = mapOf("PATH" to "/usr/bin:/bin:/usr/sbin:/sbin")
    private val home: Path = Path.of("/Users/dev")

    // --- where we look ----------------------------------------------------

    @Test
    fun findsNvmNodeWhenTheIdeWasLaunchedWithABarePath() {
        val machine = FakeMachine("/Users/dev/.nvm/versions/node/v22.16.0/bin/node")

        val candidates = NodeCandidates.enumerate(OsKind.MAC, barePath, home, machine)

        assertEquals(
            listOf(Path.of("/Users/dev/.nvm/versions/node/v22.16.0/bin/node")),
            candidates.map { it.path },
        )
        assertTrue("origin should name the manager: $candidates", candidates[0].origin.startsWith("nvm"))
    }

    @Test
    fun pathComesBeforeAnyVersionManager() {
        // What the user's own shell would run wins; the sweep is a
        // fallback, not a preference.
        val machine = FakeMachine(
            "/usr/local/bin/node",
            "/Users/dev/.nvm/versions/node/v22.16.0/bin/node",
        )
        val env = mapOf("PATH" to "/usr/local/bin:/usr/bin")

        val candidates = NodeCandidates.enumerate(OsKind.MAC, env, home, machine)

        assertEquals(Path.of("/usr/local/bin/node"), candidates.first().path)
        assertEquals("PATH", candidates.first().origin)
        assertTrue(
            "the nvm install must still be a candidate",
            candidates.any { it.path == Path.of("/Users/dev/.nvm/versions/node/v22.16.0/bin/node") },
        )
    }

    @Test
    fun newerVersionManagerInstallsAreOfferedFirst() {
        val machine = FakeMachine(
            "/Users/dev/.nvm/versions/node/v18.20.4/bin/node",
            "/Users/dev/.nvm/versions/node/v20.11.1/bin/node",
            "/Users/dev/.nvm/versions/node/v22.16.0/bin/node",
        )

        val candidates = NodeCandidates.enumerate(OsKind.MAC, barePath, home, machine)

        assertEquals(
            listOf(
                Path.of("/Users/dev/.nvm/versions/node/v22.16.0/bin/node"),
                Path.of("/Users/dev/.nvm/versions/node/v20.11.1/bin/node"),
                Path.of("/Users/dev/.nvm/versions/node/v18.20.4/bin/node"),
            ),
            candidates.map { it.path },
        )
    }

    @Test
    fun sweepsTheOtherVersionManagersAndHomebrew() {
        val machine = FakeMachine(
            "/Users/dev/Library/Application Support/fnm/node-versions/v22.16.0/installation/bin/node",
            "/Users/dev/.volta/bin/node",
            "/Users/dev/.asdf/shims/node",
            "/Users/dev/.nodenv/shims/node",
            "/Users/dev/.local/share/mise/shims/node",
            "/opt/homebrew/bin/node",
        )

        val found = NodeCandidates.enumerate(OsKind.MAC, barePath, home, machine).map { it.path.toString() }

        assertEquals(
            "every well-known location must be probed: $found",
            6,
            found.size,
        )
        assertTrue(found.any { it.contains("/fnm/") })
        assertTrue(found.any { it.contains("/.volta/") })
        assertTrue(found.any { it.contains("/.asdf/") })
        assertTrue(found.any { it.contains("/.nodenv/") })
        assertTrue(found.any { it.contains("/mise/") })
        assertTrue(found.any { it.contains("/opt/homebrew/") })
    }

    @Test
    fun versionManagerRootsCanBeRelocatedByEnvironmentVariable() {
        val machine = FakeMachine("/opt/nvm/versions/node/v22.16.0/bin/node")
        val env = barePath + mapOf("NVM_DIR" to "/opt/nvm")

        val candidates = NodeCandidates.enumerate(OsKind.MAC, env, home, machine)

        assertEquals(listOf(Path.of("/opt/nvm/versions/node/v22.16.0/bin/node")), candidates.map { it.path })
    }

    @Test
    fun windowsLooksForNodeExeInWindowsLocations() {
        val machine = FakeMachine(
            "C:/Users/dev/AppData/Roaming/nvm/v22.16.0/node.exe",
            "C:/Program Files/nodejs/node.exe",
        )
        val env = mapOf(
            "PATH" to "C:/Windows/system32;C:/Windows",
            "ProgramFiles" to "C:/Program Files",
        )

        val candidates = NodeCandidates.enumerate(OsKind.WINDOWS, env, Path.of("C:/Users/dev"), machine)

        assertEquals(
            listOf(
                Path.of("C:/Users/dev/AppData/Roaming/nvm/v22.16.0/node.exe"),
                Path.of("C:/Program Files/nodejs/node.exe"),
            ),
            candidates.map { it.path },
        )
    }

    @Test
    fun theSameInterpreterIsNeverOfferedTwice() {
        // /usr/local/bin is both a PATH entry and a swept system dir.
        val machine = FakeMachine("/usr/local/bin/node")
        val env = mapOf("PATH" to "/usr/local/bin:/usr/local/bin")

        val candidates = NodeCandidates.enumerate(OsKind.LINUX, env, home, machine)

        assertEquals(1, candidates.size)
    }

    @Test
    fun mergesTheLoginShellPathWithTheProcessPathLoginFirst() {
        val merged = NodeCandidates.mergePathEntries(
            "/Users/dev/.nvm/versions/node/v22.16.0/bin:/usr/bin",
            "/usr/bin:/bin",
            OsKind.MAC,
        )

        assertEquals("/Users/dev/.nvm/versions/node/v22.16.0/bin:/usr/bin:/bin", merged)
    }

    // --- the version gate -------------------------------------------------

    @Test
    fun picksTheFirstCandidateThatMeetsTheFloorAndProbesNoFurther() {
        val probed = mutableListOf<String>()
        val candidates = candidates("/a/node", "/b/node", "/c/node")

        val lookup = NodeSelection.select(candidates, floorMajor = 20) { path ->
            probed.add(path.toString())
            "v22.16.0"
        }

        assertEquals(NodeLookup.Usable("/a/node", "v22.16.0", "PATH"), lookup)
        assertEquals(listOf("/a/node"), probed)
    }

    @Test
    fun walksPastTooOldInterpretersToAUsableOne() {
        val versions = mapOf("/a/node" to "v10.24.1", "/b/node" to "v18.20.4", "/c/node" to "v22.16.0")

        val lookup = NodeSelection.select(candidates("/a/node", "/b/node", "/c/node"), floorMajor = 20) {
            versions[it.toString()]
        }

        assertEquals(NodeLookup.Usable("/c/node", "v22.16.0", "PATH"), lookup)
    }

    @Test
    fun refusesEveryTooOldInterpreterAndReportsTheNewestOfThem() {
        // Naming a concrete version is the point: "no Node found" on a
        // machine that has Node sends the user hunting for the wrong
        // thing.
        val versions = mapOf("/a/node" to "v10.24.1", "/b/node" to "v18.20.4")

        val lookup = NodeSelection.select(candidates("/a/node", "/b/node"), floorMajor = 20) {
            versions[it.toString()]
        }

        assertEquals(NodeLookup.TooOld("/b/node", "v18.20.4", "PATH"), lookup)
    }

    @Test
    fun aNodeExactlyAtTheFloorIsUsable() {
        val lookup = NodeSelection.select(candidates("/a/node"), floorMajor = 20) { "v20.0.0" }

        assertEquals(NodeLookup.Usable("/a/node", "v20.0.0", "PATH"), lookup)
    }

    @Test
    fun candidatesThatDoNotAnswerLikeNodeAreIgnored() {
        val answers = mapOf("/a/node" to null, "/b/node" to "not a version", "/c/node" to "v22.16.0")

        val lookup = NodeSelection.select(candidates("/a/node", "/b/node", "/c/node"), floorMajor = 20) {
            answers[it.toString()]
        }

        assertEquals(NodeLookup.Usable("/c/node", "v22.16.0", "PATH"), lookup)
    }

    @Test
    fun nothingAnywhereIsMissingNotTooOld() {
        assertEquals(NodeLookup.Missing, NodeSelection.select(candidates("/a/node"), floorMajor = 20) { null })
        assertEquals(NodeLookup.Missing, NodeSelection.select(emptyList(), floorMajor = 20) { "v22.16.0" })
    }

    @Test
    fun readsTheMajorOutOfWhateverNodePrints() {
        assertEquals(22, NodeSelection.parseMajor("v22.16.0"))
        assertEquals(22, NodeSelection.parseMajor("  v22.16.0\n"))
        assertEquals(20, NodeSelection.parseMajor("20.11.1"))
        assertEquals(10, NodeSelection.parseMajor("v10.24.1"))
        assertNull(NodeSelection.parseMajor(""))
        assertNull(NodeSelection.parseMajor("bash: node: command not found"))
    }

    @Test
    fun versionKeyOrdersReleasesNumericallyNotAlphabetically() {
        // "v9" > "v10" lexicographically; that is how a version sweep
        // silently starts preferring the oldest install on the machine.
        assertEquals(listOf(22, 16, 0), NodeCandidates.versionKey("v22.16.0"))
        assertEquals(listOf(9, 11, 2), NodeCandidates.versionKey("9.11.2"))
    }

    private fun candidates(vararg paths: String): List<NodeCandidate> =
        paths.map { NodeCandidate(Path.of(it), "PATH") }
}
