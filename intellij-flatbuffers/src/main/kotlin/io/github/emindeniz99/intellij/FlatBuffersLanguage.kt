package io.github.emindeniz99.intellij

import com.intellij.lang.Language

/**
 * Marker singleton for the FlatBuffers language. Extension points in
 * `plugin.xml` reference this by ID ("FlatBuffers") to scope the
 * commenter, syntax highlighter, and formatting service to `.fbs`
 * files only.
 */
object FlatBuffersLanguage : Language("FlatBuffers") {
    /**
     * What the IDE shows for this language. Another FlatBuffers plugin
     * registers its own language as "Flatbuffers", and a user with both
     * installed saw two near-identical entries with no way to tell them
     * apart. The ID above stays "FlatBuffers": plugin.xml and every
     * user's saved settings refer to it.
     */
    const val DISPLAY_NAME: String = "FlatBuffers (flatbuffers-format)"

    override fun getDisplayName(): String = DISPLAY_NAME

    private fun readResolve(): Any = FlatBuffersLanguage
}
