package io.github.flatbuffersformat.intellij

import com.intellij.openapi.application.PathManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.progress.ProgressIndicator
import java.io.IOException
import java.net.URI
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.nio.file.attribute.PosixFilePermission
import java.nio.file.attribute.PosixFilePermissions

/**
 * Optional on-demand fetch of the published `flatbuffers-format`
 * native binary so users don't need to install Node + npm before
 * the plugin can format anything.
 *
 * Why download instead of bundle: the engine ships five
 * platform-specific binaries (linux-x64, linux-arm64, macos-x64,
 * macos-arm64, windows-x64) of ~120 MiB each. Bundling all five
 * in the plugin .zip would balloon it to ~600 MiB and ship four
 * unused per-IDE. Downloading just the matching one keeps the
 * .zip ~100 KiB and uses ~30 MiB on disk per install.
 *
 * Where the binary lives: `$IDE_SYSTEM/flatbuffers-format/engine-X.Y.Z/<asset>`.
 * Each engine version gets its own subdirectory, so a plugin
 * upgrade that bumps the engine version doesn't overwrite an
 * older cached one mid-format.
 *
 * Failure model: this code only runs when invoked from the
 * settings page's "Download bundled engine" button OR from a
 * notification action surfaced when the resolver finds no binary.
 * Errors propagate as `BundledEngineException`; the caller is
 * responsible for showing a user-visible message.
 */
object BundledEngine {
    private val LOG = Logger.getInstance(BundledEngine::class.java)

    /**
     * Engine version the plugin's current release targets. This is
     * a compile-time constant rather than a runtime lookup of
     * "latest" so that the plugin always has a known-good engine
     * to download — a future engine release with an incompatible
     * CLI surface won't silently break this plugin's users.
     *
     * Bump in lockstep with the plugin's `pluginVersion` whenever
     * a new engine-X.Y.Z lands.
     */
    const val ENGINE_VERSION: String = "0.1.0"

    /**
     * GitHub Release tag format used by release-please:
     * `flatbuffers-format@X.Y.Z`. The native-binaries.yml workflow
     * uploads platform binaries to that tag.
     */
    private val RELEASE_BASE = "https://github.com/emindeniz99/playground/releases/download/flatbuffers-format@$ENGINE_VERSION"

    class BundledEngineException(message: String, cause: Throwable? = null) :
        IOException(message, cause)

    /** Returns the asset filename matching the host OS + arch, or null if unsupported. */
    fun platformAsset(): String? {
        val os = System.getProperty("os.name").lowercase()
        val arch = System.getProperty("os.arch").lowercase()
        val normalisedArch = when {
            arch.contains("aarch64") || arch.contains("arm64") -> "arm64"
            arch.contains("amd64") || arch.contains("x86_64") || arch.contains("x64") -> "x64"
            else -> return null
        }
        return when {
            os.contains("linux") -> "flatbuffers-format-linux-$normalisedArch"
            os.contains("mac") || os.contains("darwin") -> "flatbuffers-format-macos-$normalisedArch"
            os.contains("win") && normalisedArch == "x64" -> "flatbuffers-format-windows-x64.exe"
            else -> null
        }
    }

    /** Absolute path the binary lives at once downloaded. */
    fun cachedBinaryPath(): Path? {
        val asset = platformAsset() ?: return null
        return Path.of(PathManager.getSystemPath(), "flatbuffers-format", "engine-$ENGINE_VERSION", asset)
    }

    /** True iff a usable binary is already cached. */
    fun isCached(): Boolean {
        val p = cachedBinaryPath() ?: return false
        return Files.isRegularFile(p) && Files.isExecutable(p)
    }

    /**
     * Downloads the engine binary for the host OS/arch and returns
     * its absolute path. Idempotent — if the binary is already
     * cached, the existing path is returned without re-fetching.
     *
     * @throws BundledEngineException on any failure (unsupported
     *   platform, network error, non-200 HTTP response, write
     *   failure). Callers should surface the message via Notification.
     */
    fun ensureDownloaded(progress: ProgressIndicator?): Path {
        val cached = cachedBinaryPath()
            ?: throw BundledEngineException(
                "Unsupported platform: ${System.getProperty("os.name")} / ${System.getProperty("os.arch")}. " +
                    "Install flatbuffers-format manually and point Settings → Tools → FlatBuffers " +
                    "at the binary."
            )
        if (Files.isRegularFile(cached) && Files.isExecutable(cached)) {
            LOG.info("Cached flatbuffers-format already at $cached")
            return cached
        }

        val asset = platformAsset()!! // non-null because cachedBinaryPath returned non-null
        val url = "$RELEASE_BASE/$asset"
        progress?.text = "Downloading flatbuffers-format engine $ENGINE_VERSION..."
        progress?.text2 = url
        LOG.info("Downloading $url to $cached")

        Files.createDirectories(cached.parent)
        val tmp = cached.resolveSibling("$asset.partial")

        try {
            URI.create(url).toURL().openStream().use { input ->
                Files.copy(input, tmp, StandardCopyOption.REPLACE_EXISTING)
            }
            // chmod +x on POSIX. No-op on Windows.
            if (isPosix()) {
                Files.setPosixFilePermissions(
                    tmp,
                    PosixFilePermissions.fromString("rwxr-xr-x"),
                )
            }
            Files.move(tmp, cached, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        } catch (t: Throwable) {
            try {
                Files.deleteIfExists(tmp)
            } catch (_: Throwable) {
                // best-effort cleanup
            }
            throw BundledEngineException(
                "Failed to download $url: ${t.message ?: t.javaClass.simpleName}",
                t,
            )
        }

        LOG.info("Cached flatbuffers-format at $cached")
        return cached
    }

    private fun isPosix(): Boolean {
        return try {
            PosixFilePermission.OWNER_EXECUTE
            !System.getProperty("os.name").lowercase().contains("win")
        } catch (_: NoClassDefFoundError) {
            false
        }
    }
}
