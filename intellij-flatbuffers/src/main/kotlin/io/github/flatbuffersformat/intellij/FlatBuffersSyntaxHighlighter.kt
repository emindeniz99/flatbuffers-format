package io.github.flatbuffersformat.intellij

import com.intellij.lexer.Lexer
import com.intellij.openapi.editor.DefaultLanguageHighlighterColors
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.editor.colors.TextAttributesKey.createTextAttributesKey
import com.intellij.openapi.fileTypes.SyntaxHighlighterBase
import com.intellij.psi.TokenType
import com.intellij.psi.tree.IElementType

/**
 * Maps lexer tokens to colourable categories. We piggyback on the
 * platform's `DefaultLanguageHighlighterColors` so the user's chosen
 * colour scheme (Darcula, IntelliJ Light, Solarized, etc.) wins
 * automatically — defining bespoke colours is a maintenance burden
 * we don't need.
 *
 * Token category keys are exposed as `@JvmField` so the colour-settings
 * page can list them.
 */
class FlatBuffersSyntaxHighlighter : SyntaxHighlighterBase() {
    override fun getHighlightingLexer(): Lexer = FlatBuffersLexer()

    override fun getTokenHighlights(tokenType: IElementType): Array<TextAttributesKey> =
        when (tokenType) {
            FlatBuffersTokenTypes.LINE_COMMENT -> LINE_COMMENT_KEYS
            FlatBuffersTokenTypes.DOC_COMMENT -> DOC_COMMENT_KEYS
            FlatBuffersTokenTypes.BLOCK_COMMENT -> BLOCK_COMMENT_KEYS
            FlatBuffersTokenTypes.KEYWORD -> KEYWORD_KEYS
            FlatBuffersTokenTypes.BUILTIN_TYPE -> BUILTIN_TYPE_KEYS
            FlatBuffersTokenTypes.BOOL_LITERAL,
            FlatBuffersTokenTypes.NULL_LITERAL -> CONSTANT_KEYS
            FlatBuffersTokenTypes.NUMBER -> NUMBER_KEYS
            FlatBuffersTokenTypes.STRING -> STRING_KEYS
            FlatBuffersTokenTypes.IDENTIFIER -> IDENTIFIER_KEYS
            FlatBuffersTokenTypes.LBRACE,
            FlatBuffersTokenTypes.RBRACE -> BRACES_KEYS
            FlatBuffersTokenTypes.LPAREN,
            FlatBuffersTokenTypes.RPAREN -> PARENS_KEYS
            FlatBuffersTokenTypes.LBRACKET,
            FlatBuffersTokenTypes.RBRACKET -> BRACKETS_KEYS
            FlatBuffersTokenTypes.SEMICOLON,
            FlatBuffersTokenTypes.COMMA -> COMMA_KEYS
            FlatBuffersTokenTypes.COLON,
            FlatBuffersTokenTypes.EQ,
            FlatBuffersTokenTypes.DOT -> OPERATOR_KEYS
            TokenType.BAD_CHARACTER -> BAD_CHARACTER_KEYS
            else -> EMPTY
        }

    companion object {
        @JvmField val LINE_COMMENT = createTextAttributesKey(
            "FLATBUFFERS_LINE_COMMENT", DefaultLanguageHighlighterColors.LINE_COMMENT)
        @JvmField val DOC_COMMENT = createTextAttributesKey(
            "FLATBUFFERS_DOC_COMMENT", DefaultLanguageHighlighterColors.DOC_COMMENT)
        @JvmField val BLOCK_COMMENT = createTextAttributesKey(
            "FLATBUFFERS_BLOCK_COMMENT", DefaultLanguageHighlighterColors.BLOCK_COMMENT)
        @JvmField val KEYWORD = createTextAttributesKey(
            "FLATBUFFERS_KEYWORD", DefaultLanguageHighlighterColors.KEYWORD)
        @JvmField val BUILTIN_TYPE = createTextAttributesKey(
            "FLATBUFFERS_BUILTIN_TYPE", DefaultLanguageHighlighterColors.PREDEFINED_SYMBOL)
        @JvmField val CONSTANT = createTextAttributesKey(
            "FLATBUFFERS_CONSTANT", DefaultLanguageHighlighterColors.CONSTANT)
        @JvmField val NUMBER = createTextAttributesKey(
            "FLATBUFFERS_NUMBER", DefaultLanguageHighlighterColors.NUMBER)
        @JvmField val STRING = createTextAttributesKey(
            "FLATBUFFERS_STRING", DefaultLanguageHighlighterColors.STRING)
        @JvmField val IDENTIFIER = createTextAttributesKey(
            "FLATBUFFERS_IDENTIFIER", DefaultLanguageHighlighterColors.IDENTIFIER)
        @JvmField val BRACES = createTextAttributesKey(
            "FLATBUFFERS_BRACES", DefaultLanguageHighlighterColors.BRACES)
        @JvmField val PARENS = createTextAttributesKey(
            "FLATBUFFERS_PARENS", DefaultLanguageHighlighterColors.PARENTHESES)
        @JvmField val BRACKETS = createTextAttributesKey(
            "FLATBUFFERS_BRACKETS", DefaultLanguageHighlighterColors.BRACKETS)
        @JvmField val COMMA = createTextAttributesKey(
            "FLATBUFFERS_COMMA", DefaultLanguageHighlighterColors.COMMA)
        @JvmField val OPERATOR = createTextAttributesKey(
            "FLATBUFFERS_OPERATOR", DefaultLanguageHighlighterColors.OPERATION_SIGN)
        @JvmField val BAD_CHARACTER = createTextAttributesKey(
            "FLATBUFFERS_BAD_CHARACTER", com.intellij.openapi.editor.HighlighterColors.BAD_CHARACTER)

        private val LINE_COMMENT_KEYS = arrayOf(LINE_COMMENT)
        private val DOC_COMMENT_KEYS = arrayOf(DOC_COMMENT)
        private val BLOCK_COMMENT_KEYS = arrayOf(BLOCK_COMMENT)
        private val KEYWORD_KEYS = arrayOf(KEYWORD)
        private val BUILTIN_TYPE_KEYS = arrayOf(BUILTIN_TYPE)
        private val CONSTANT_KEYS = arrayOf(CONSTANT)
        private val NUMBER_KEYS = arrayOf(NUMBER)
        private val STRING_KEYS = arrayOf(STRING)
        private val IDENTIFIER_KEYS = arrayOf(IDENTIFIER)
        private val BRACES_KEYS = arrayOf(BRACES)
        private val PARENS_KEYS = arrayOf(PARENS)
        private val BRACKETS_KEYS = arrayOf(BRACKETS)
        private val COMMA_KEYS = arrayOf(COMMA)
        private val OPERATOR_KEYS = arrayOf(OPERATOR)
        private val BAD_CHARACTER_KEYS = arrayOf(BAD_CHARACTER)
        private val EMPTY = emptyArray<TextAttributesKey>()
    }
}
