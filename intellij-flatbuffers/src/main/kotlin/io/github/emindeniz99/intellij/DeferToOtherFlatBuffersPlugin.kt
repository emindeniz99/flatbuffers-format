package io.github.emindeniz99.intellij

import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.fileTypes.FileTypeManager
import com.intellij.openapi.fileTypes.impl.FileTypeOverrider
import com.intellij.openapi.vfs.VirtualFile

/**
 * Hands `.fbs` files to another FlatBuffers plugin's file type when one
 * is installed, so that plugin highlights and navigates while this one
 * keeps formatting.
 *
 * Without this, two plugins claiming `*.fbs` is settled by the IDE in
 * plugin-load order: which highlighter a user got was effectively
 * random, and fixing it meant editing Settings → File Types by hand.
 * The other plugins ("Flatbuffers Support") parse the schema and offer
 * go-to-declaration; this one only colours tokens, so theirs is the
 * better owner whenever both are present.
 *
 * Formatting is unaffected: [FlatBuffersFormattingService.canFormat]
 * accepts any file ending in `.fbs`, whichever file type owns it.
 * Uninstall the other plugin and this returns null, so `.fbs` falls back
 * to this plugin's own file type with no setting to undo.
 *
 * `FileTypeOverrider` is marked experimental in the platform. If it ever
 * changes, the cost is today's behaviour: the IDE picks one owner and
 * the user can reassign it in Settings → File Types.
 */
class DeferToOtherFlatBuffersPlugin : FileTypeOverrider {
    override fun getOverriddenFileType(file: VirtualFile): FileType? {
        // Called for every file the IDE types, so leave everything that
        // is not a schema before touching the file type registry.
        if (!file.extension.equals("fbs", ignoreCase = true)) return null
        return otherFlatBuffersFileType(FileTypeManager.getInstance().registeredFileTypes.asList())
    }

    companion object {
        /**
         * The first registered file type, other than ours, that declares
         * `fbs` as its extension; null when this plugin is the only one.
         */
        fun otherFlatBuffersFileType(registered: List<FileType>): FileType? =
            registered.firstOrNull {
                it !== FlatBuffersFileType.INSTANCE &&
                    it.defaultExtension.equals("fbs", ignoreCase = true)
            }
    }
}
