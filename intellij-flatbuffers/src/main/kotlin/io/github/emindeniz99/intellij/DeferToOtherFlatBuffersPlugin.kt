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
 * Only a file the IDE typed as *ours* is handed over. An overrider wins
 * over Settings → File Types, so deferring unconditionally would make a
 * user's own `*.fbs` → Plain Text mapping impossible while another
 * FlatBuffers plugin is installed. Users who prefer this plugin's
 * highlighting turn deferring off in Settings → Tools → FlatBuffers.
 *
 * `FileTypeOverrider` is marked experimental in the platform. If it ever
 * changes, the cost is today's behaviour: the IDE picks one owner and
 * the user can reassign it in Settings → File Types.
 */
class DeferToOtherFlatBuffersPlugin : FileTypeOverrider {
    override fun getOverriddenFileType(file: VirtualFile): FileType? {
        // Called for every file the IDE types, so leave everything that
        // is not a schema before touching the file type registry.
        if (!FlatBuffersFileType.isSchemaExtension(file.extension)) return null
        val fileTypes = FileTypeManager.getInstance()
        return typeFor(
            // Name associations only: this does not consult overriders,
            // so it cannot recurse into this one.
            byName = fileTypes.getFileTypeByFileName(file.nameSequence),
            registered = fileTypes.registeredFileTypes.asList(),
            enabled = FlatBuffersSettings.getInstance().deferHighlightingToOtherPlugin,
        )
    }

    companion object {
        /**
         * The file type a schema the IDE typed as [byName] should get
         * instead; null keeps [byName]. Defers only when [enabled] and
         * the IDE picked this plugin's type — Plain Text, the other
         * plugin's type, or anything else the user chose stands.
         */
        fun typeFor(byName: FileType, registered: List<FileType>, enabled: Boolean): FileType? =
            if (enabled && byName === FlatBuffersFileType.INSTANCE) otherFlatBuffersFileType(registered) else null

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
