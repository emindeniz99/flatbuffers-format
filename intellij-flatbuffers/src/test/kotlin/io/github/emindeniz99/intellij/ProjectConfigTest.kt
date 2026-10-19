package io.github.emindeniz99.intellij

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.nio.file.Files
import java.nio.file.Path

/**
 * The config lookup must match the engine's `findConfigFile` exactly,
 * or the IDE and the CLI would pick different files for the same
 * schema and format it two ways.
 */
class ProjectConfigTest {

    private fun tree(): Path {
        val root = Files.createTempDirectory("fbs-project-config")
        Files.createDirectories(root.resolve("a/b/c"))
        Files.writeString(root.resolve(ProjectConfig.FILE_NAME), "{}")
        Files.writeString(root.resolve("a/b/${ProjectConfig.FILE_NAME}"), "{}")
        return root
    }

    @Test
    fun theNearestFileWinsWalkingUpFromTheSchemasDirectory() {
        val root = tree()
        assertEquals(root.resolve("a/b/${ProjectConfig.FILE_NAME}"), ProjectConfig.findFrom(root.resolve("a/b/c")))
        assertEquals(root.resolve("a/b/${ProjectConfig.FILE_NAME}"), ProjectConfig.findFrom(root.resolve("a/b")))
        // Above the nearer file: the parent's applies, as for the CLI.
        assertEquals(root.resolve(ProjectConfig.FILE_NAME), ProjectConfig.findFrom(root.resolve("a")))
    }

    @Test
    fun theWalkGoesPastAnyProjectRootToTheFilesystemRoot() {
        // A config at a monorepo root covers a subfolder opened as its
        // own IDE project, because it covers that folder for the CLI.
        val root = tree()
        val opened = root.resolve("a")
        assertEquals(root.resolve(ProjectConfig.FILE_NAME), ProjectConfig.findFrom(opened))
    }

    @Test
    fun noFileAnywhereAboveMeansNoConfig() {
        val lonely = Files.createTempDirectory("fbs-no-config")
        // Only meaningful if nothing above the temp directory has one.
        val above = generateSequence(lonely.parent) { it.parent }
            .any { Files.exists(it.resolve(ProjectConfig.FILE_NAME)) }
        if (!above) assertNull(ProjectConfig.findFrom(lonely))
    }
}
