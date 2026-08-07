package io.github.emindeniz99.intellij

import com.intellij.lang.Language

/**
 * Marker singleton for the FlatBuffers language. Extension points in
 * `plugin.xml` reference this by ID ("FlatBuffers") to scope the
 * commenter, syntax highlighter, and formatting service to `.fbs`
 * files only.
 */
object FlatBuffersLanguage : Language("FlatBuffers") {
    private fun readResolve(): Any = FlatBuffersLanguage
}
