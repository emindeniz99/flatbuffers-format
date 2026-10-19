package io.github.emindeniz99.intellij

import com.intellij.openapi.fileTypes.LanguageFileType
import javax.swing.Icon

/**
 * Tells IntelliJ "files ending in .fbs are FlatBuffers schemas." The
 * `fieldName="INSTANCE"` attribute on the matching `<fileType>` entry
 * in plugin.xml is what binds the registration to this singleton —
 * keep the field name in sync if you rename it.
 */
class FlatBuffersFileType private constructor() : LanguageFileType(FlatBuffersLanguage) {
    // The name is the file type's ID: the IDE stores each user's `*.fbs`
    // association under it, so it never changes. Only the display name
    // tells it apart from another plugin's "Flatbuffers" file type.
    override fun getName(): String = "FlatBuffers"
    override fun getDisplayName(): String = FlatBuffersLanguage.DISPLAY_NAME
    override fun getDescription(): String = "FlatBuffers schema"
    override fun getDefaultExtension(): String = "fbs"
    override fun getIcon(): Icon = FlatBuffersIcons.FILE

    companion object {
        @JvmField
        val INSTANCE: FlatBuffersFileType = FlatBuffersFileType()

        /**
         * Whether a file extension marks a FlatBuffers schema. Shared by the
         * formatting service and [DeferToOtherFlatBuffersPlugin] so a file
         * this plugin hands to another plugin is always one it still
         * formats — `.FBS` included, as on a case-insensitive filesystem.
         */
        fun isSchemaExtension(extension: String?): Boolean =
            extension.equals("fbs", ignoreCase = true)
    }
}
