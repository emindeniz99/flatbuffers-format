package io.github.emindeniz99.intellij

import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.fileTypes.SyntaxHighlighter
import com.intellij.openapi.options.colors.AttributesDescriptor
import com.intellij.openapi.options.colors.ColorDescriptor
import com.intellij.openapi.options.colors.ColorSettingsPage
import javax.swing.Icon

/**
 * Adds a "FlatBuffers" entry to Preferences → Editor → Color Scheme,
 * letting users tweak individual token colours independent of the
 * global scheme. The preview snippet exercises every category the
 * highlighter recognises so users can see what they're editing.
 */
class FlatBuffersColorSettingsPage : ColorSettingsPage {
    override fun getIcon(): Icon = FlatBuffersIcons.FILE
    override fun getHighlighter(): SyntaxHighlighter = FlatBuffersSyntaxHighlighter()

    override fun getDemoText(): String = """
        // Line comment
        /// Doc comment for the namespace below
        /* Block comment */
        namespace Game.Sample;

        attribute "priority";

        enum Color : ubyte (bit_flags) { Red = 0, Green = 1, Blue = 2 }

        struct Vec3 { x: float; y: float; z: float = 0.0; }

        table Weapon {
          name: string (required, "priority": 10);
          damage: int = 0x10;
          accuracy: float = 0.95e-2;
        }

        union Equipment { Weapon }

        table Monster {
          pos: Vec3;
          hp: short = 100;
          alive: bool = true;
          tag: string = "boss";
          loot: [Equipment];
        }

        root_type Monster;
    """.trimIndent()

    override fun getAdditionalHighlightingTagToDescriptorMap(): Map<String, TextAttributesKey>? = null

    override fun getAttributeDescriptors(): Array<AttributesDescriptor> = DESCRIPTORS
    override fun getColorDescriptors(): Array<ColorDescriptor> = ColorDescriptor.EMPTY_ARRAY
    override fun getDisplayName(): String = "FlatBuffers"

    companion object {
        private val DESCRIPTORS = arrayOf(
            AttributesDescriptor("Keyword", FlatBuffersSyntaxHighlighter.KEYWORD),
            AttributesDescriptor("Builtin type", FlatBuffersSyntaxHighlighter.BUILTIN_TYPE),
            AttributesDescriptor("Identifier", FlatBuffersSyntaxHighlighter.IDENTIFIER),
            AttributesDescriptor("Constant (true/false/null/inf/nan)", FlatBuffersSyntaxHighlighter.CONSTANT),
            AttributesDescriptor("Number", FlatBuffersSyntaxHighlighter.NUMBER),
            AttributesDescriptor("String", FlatBuffersSyntaxHighlighter.STRING),
            AttributesDescriptor("Comment//Line", FlatBuffersSyntaxHighlighter.LINE_COMMENT),
            AttributesDescriptor("Comment//Doc", FlatBuffersSyntaxHighlighter.DOC_COMMENT),
            AttributesDescriptor("Comment//Block", FlatBuffersSyntaxHighlighter.BLOCK_COMMENT),
            AttributesDescriptor("Braces and operators//Braces", FlatBuffersSyntaxHighlighter.BRACES),
            AttributesDescriptor("Braces and operators//Parentheses", FlatBuffersSyntaxHighlighter.PARENS),
            AttributesDescriptor("Braces and operators//Brackets", FlatBuffersSyntaxHighlighter.BRACKETS),
            AttributesDescriptor("Braces and operators//Comma & semicolon", FlatBuffersSyntaxHighlighter.COMMA),
            AttributesDescriptor("Braces and operators//Operator", FlatBuffersSyntaxHighlighter.OPERATOR),
            AttributesDescriptor("Bad character", FlatBuffersSyntaxHighlighter.BAD_CHARACTER),
        )
    }
}
