package io.github.emindeniz99.intellij

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

/**
 * The file type's name and the language's ID are identifiers: the IDE
 * stores each user's `*.fbs` association under the first, and plugin.xml
 * refers to the second. Renaming either would silently drop users'
 * settings. Only the display names may change, and they must differ
 * from another plugin's "Flatbuffers" so both can be told apart.
 */
class FileTypeNamesTest {

    @Test
    fun identifiersStayFixed() {
        assertEquals("FlatBuffers", FlatBuffersFileType.INSTANCE.name)
        assertEquals("FlatBuffers", FlatBuffersLanguage.id)
    }

    @Test
    fun displayNamesTellThisPluginApartFromOthers() {
        assertEquals("FlatBuffers (flatbuffers-format)", FlatBuffersFileType.INSTANCE.displayName)
        assertEquals("FlatBuffers (flatbuffers-format)", FlatBuffersLanguage.displayName)
        assertNotEquals("Flatbuffers", FlatBuffersFileType.INSTANCE.displayName)
    }
}
