package io.github.flatbuffersformat.intellij

import com.intellij.openapi.fileTypes.SyntaxHighlighter
import com.intellij.openapi.fileTypes.SyntaxHighlighterFactory
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

/**
 * Trivial factory that hands IntelliJ a fresh [FlatBuffersSyntaxHighlighter]
 * per editor. The platform caches per-file, so a new instance per call is
 * fine.
 */
class FlatBuffersSyntaxHighlighterFactory : SyntaxHighlighterFactory() {
    override fun getSyntaxHighlighter(project: Project?, virtualFile: VirtualFile?): SyntaxHighlighter =
        FlatBuffersSyntaxHighlighter()
}
