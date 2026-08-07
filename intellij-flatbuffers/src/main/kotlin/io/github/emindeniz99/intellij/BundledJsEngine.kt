package io.github.emindeniz99.intellij

import com.intellij.openapi.application.PathManager
import com.intellij.openapi.diagnostic.Logger
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.security.MessageDigest

/**
 * The ~620 KiB JavaScript formatter that ships inside the plugin jar at
 * `/engine/flatbuffers-format.cjs` (written by the `bundleEngineJs`
 * Gradle task), unpacked to a real file so `node` can run it.
 *
 * Extraction is not an optimisation, it is the only option: the
 * resource lives inside the plugin jar, and a child process cannot be
 * handed a `jar:file:...!/engine/...` path. The extracted copy lands
 * under the IDE system directory, in a directory named after a hash of
 * the bundle's own bytes — so a plugin update that changes the engine
 * writes a new file rather than racing a running IDE that is still
 * executing the old one, and an unchanged bundle is extracted once ever
 * rather than once per IDE start.
 */
object BundledJsEngine {
    private val LOG = Logger.getInstance(BundledJsEngine::class.java)

    /** Must match the path `bundleEngineJs` writes into the resources. */
    private const val RESOURCE = "/engine/flatbuffers-format.cjs"

    private const val FILE_NAME = "flatbuffers-format.cjs"

    @Volatile
    private var extracted: Path? = null

    /**
     * Absolute path to the runnable bundle, or null when this build
     * shipped without one (`bundleEngineJs` skipped) or extraction
     * failed. Null is a degradation, not an error — the caller falls
     * through to the downloaded native engine.
     */
    @Synchronized
    fun script(): Path? {
        extracted?.let { if (Files.isRegularFile(it)) return it }

        val bytes = javaClass.getResourceAsStream(RESOURCE)?.use { it.readAllBytes() }
        if (bytes == null) {
            LOG.warn(
                "This build of the plugin shipped without $RESOURCE — the bundled JS engine " +
                    "tier is unavailable. See the bundleEngineJs task in build.gradle.kts.",
            )
            return null
        }

        val target = Path.of(
            PathManager.getSystemPath(),
            "flatbuffers-format",
            "engine-js-${shortHash(bytes)}",
            FILE_NAME,
        )
        if (Files.isRegularFile(target) && Files.size(target) == bytes.size.toLong()) {
            extracted = target
            return target
        }

        return try {
            Files.createDirectories(target.parent)
            // A temp file in the destination directory, then an atomic
            // move: two IDEs sharing one system directory must not be
            // able to read a half-written bundle.
            val tmp = Files.createTempFile(target.parent, FILE_NAME, ".partial")
            try {
                Files.write(tmp, bytes)
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
            } catch (t: Throwable) {
                Files.deleteIfExists(tmp)
                throw t
            }
            LOG.info("Extracted bundled flatbuffers-format engine to $target")
            extracted = target
            target
        } catch (t: Throwable) {
            LOG.warn("Could not extract the bundled flatbuffers-format engine to $target", t)
            null
        }
    }

    private fun shortHash(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256")
            .digest(bytes)
            .take(6)
            .joinToString("") { "%02x".format(it) }
}
