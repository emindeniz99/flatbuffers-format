package io.github.emindeniz99.intellij

import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit

/**
 * Runs the engine bundle this plugin ships with the exact command line
 * the formatting service builds, the way the service runs it: on a temp
 * copy of the document, outside the project.
 *
 * The argument tests pin what the plugin *asks* for; only this shows the
 * engine it ships does it. Skipped, not passed, when the build has no
 * bundle (`bundleEngineJs` needs a built engine) or no `node`.
 */
class EngineRoundTripTest {

    private fun node(): File? =
        (System.getenv("PATH") ?: "").split(File.pathSeparator).asSequence()
            .filter { it.isNotBlank() }
            .flatMap { dir -> sequenceOf("node", "node.exe").map { File(dir, it) } }
            .firstOrNull { it.isFile && it.canExecute() }

    /** Format [source] as the service would for a document under [documentDir]. */
    private fun formatLikeThePlugin(source: String, documentDir: Path, settings: FlatBuffersSettings.State): String {
        val bytes = javaClass.getResourceAsStream("/engine/flatbuffers-format.cjs")?.use { it.readAllBytes() }
        assumeTrue("plugin built without the engine bundle (bundleEngineJs skipped)", bytes != null)
        val node = node()
        assumeTrue("node is not on PATH", node != null)

        val script = Files.createTempFile("flatbuffers-format-", ".cjs")
        val temp = Files.createTempFile("flatbuffers-format-", ".fbs")
        try {
            Files.write(script, bytes!!)
            Files.writeString(temp, source)
            val args = FormatterCliArgs.of(settings, ProjectConfig.findFrom(documentDir))
            val proc = ProcessBuilder(listOf(node!!.path, script.toString()) + args + temp.toString()).start()
            val out = proc.inputStream.bufferedReader().use { it.readText() }
            val err = proc.errorStream.bufferedReader().use { it.readText() }
            proc.waitFor(30, TimeUnit.SECONDS)
            assertEquals("engine stderr: $err", 0, proc.exitValue())
            return out
        } finally {
            Files.deleteIfExists(script)
            Files.deleteIfExists(temp)
        }
    }

    @Test
    fun theCommentLossReproRoundTripsThroughTheShippedEngine() {
        val source = """
            enum Color : byte {
                Red, // first
                Green, // second
            }

            table Empty {
                // only a comment
            }

        """.trimIndent()
        val project = Files.createTempDirectory("fbs-roundtrip")
        val out = formatLikeThePlugin(source, project, FlatBuffersSettings.State().apply { indent = 4 })
        assertEquals(
            """
            enum Color: byte {
                Red, // first
                Green // second
            }

            table Empty {
                // only a comment
            }

            """.trimIndent(),
            out,
        )
    }

    @Test
    fun aProjectConfigFileDecidesTheOutputNotTheSettingsPage() {
        // The document lives in the project; the engine only ever sees a
        // temp copy elsewhere, so this passes only if the plugin found the
        // config next to the document and handed it over.
        val project = Files.createTempDirectory("fbs-roundtrip-config")
        Files.writeString(
            project.resolve(ProjectConfig.FILE_NAME),
            """{"indent": 3, "compactSingleLine": false}""",
        )
        val schemas = Files.createDirectories(project.resolve("schemas"))
        val settings = FlatBuffersSettings.State().apply {
            indent = 8
            extraArgs = "--line-width 20"
        }
        val out = formatLikeThePlugin("enum E:byte{A,B}\n", schemas, settings)
        assertEquals("enum E: byte {\n   A,\n   B\n}\n", out)
    }
}
