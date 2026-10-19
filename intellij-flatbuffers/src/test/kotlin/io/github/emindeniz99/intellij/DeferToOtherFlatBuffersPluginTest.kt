package io.github.emindeniz99.intellij

import com.intellij.openapi.fileTypes.FileType
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test
import javax.swing.Icon

/**
 * Which file type `.fbs` files are handed to. Getting this wrong either
 * steals `.fbs` from a user who only has this plugin (no highlighting at
 * all if it picked something unrelated) or never defers, leaving the
 * IDE's random choice between two plugins in place.
 */
class DeferToOtherFlatBuffersPluginTest {

    private fun type(name: String, extension: String): FileType = object : FileType {
        override fun getName() = name
        override fun getDescription() = name
        override fun getDefaultExtension() = extension
        override fun getIcon(): Icon? = null
        override fun isBinary() = false
    }

    @Test
    fun aloneWeKeepOurOwnFileType() {
        val registered = listOf(type("PLAIN_TEXT", "txt"), FlatBuffersFileType.INSTANCE, type("JSON", "json"))
        assertNull(DeferToOtherFlatBuffersPlugin.otherFlatBuffersFileType(registered))
    }

    @Test
    fun anotherPluginsFbsFileTypeTakesOver() {
        val theirs = type("Flatbuffers", "fbs")
        val registered = listOf(FlatBuffersFileType.INSTANCE, type("JSON", "json"), theirs)
        assertSame(theirs, DeferToOtherFlatBuffersPlugin.otherFlatBuffersFileType(registered))
    }

    @Test
    fun theExtensionMatchIgnoresCase() {
        val theirs = type("Flatbuffers", "FBS")
        assertSame(theirs, DeferToOtherFlatBuffersPlugin.otherFlatBuffersFileType(listOf(theirs)))
    }
}
