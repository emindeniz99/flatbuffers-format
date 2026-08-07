package io.github.emindeniz99.intellij

import com.intellij.lang.Commenter

/**
 * Wires Ctrl/⌘+/ (line) and Ctrl/⌘+Shift+/ (block) to FlatBuffers
 * comment syntax. The engine accepts both forms.
 */
class FlatBuffersCommenter : Commenter {
    override fun getLineCommentPrefix(): String = "//"
    override fun getBlockCommentPrefix(): String = "/*"
    override fun getBlockCommentSuffix(): String = "*/"
    override fun getCommentedBlockCommentPrefix(): String? = null
    override fun getCommentedBlockCommentSuffix(): String? = null
}
