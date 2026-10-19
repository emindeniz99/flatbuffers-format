package io.github.emindeniz99.intellij

import java.nio.file.Files
import java.nio.file.Path

/**
 * The project's `.flatbuffers-format.json`: format options a team
 * commits once so the CLI, CI and every editor format alike.
 *
 * The plugin has to find the file itself. It formats a temp copy of the
 * document, so the engine's own lookup — which starts at the file being
 * formatted — would search the temp directory and never see the
 * project. The walk here is the engine's `findConfigFile`: from the
 * file's directory up to the filesystem root, nearest file wins. Going
 * past the IDE project's root on purpose: a config at a monorepo root
 * applies to a subfolder opened as a project, exactly as it does for
 * the CLI run from CI.
 *
 * Only *finding* the file is done here. Reading and validating it stays
 * with the engine (via `--config`), so a malformed file produces the
 * engine's error naming the file and key, not a second opinion.
 */
object ProjectConfig {
    const val FILE_NAME: String = ".flatbuffers-format.json"

    /** The nearest config file in [dir] or any parent; null when there is none. */
    fun findFrom(dir: Path): Path? {
        var current: Path? = dir.toAbsolutePath().normalize()
        while (current != null) {
            val candidate = current.resolve(FILE_NAME)
            if (Files.exists(candidate)) return candidate
            current = current.parent
        }
        return null
    }
}
