package io.github.emindeniz99.intellij

import com.intellij.psi.tree.IElementType

/**
 * Token kinds emitted by [FlatBuffersLexer]. We deliberately keep this
 * list small — the lexer's only job is to feed the syntax highlighter,
 * so we group e.g. all punctuation under coarse categories rather than
 * one type per character. If a future PSI tree needs finer-grained
 * tokens, split them then; don't speculatively partition now.
 *
 * `TokenType.WHITE_SPACE` and `TokenType.BAD_CHARACTER` are reused
 * directly from the platform — those two have special handling
 * everywhere in IntelliJ (whitespace skipped by parsers, bad chars
 * surfaced as errors) and you do not want to shadow them.
 */
object FlatBuffersTokenTypes {
    @JvmField val LINE_COMMENT: IElementType = FlatBuffersElementType("LINE_COMMENT")
    @JvmField val DOC_COMMENT: IElementType = FlatBuffersElementType("DOC_COMMENT")
    @JvmField val BLOCK_COMMENT: IElementType = FlatBuffersElementType("BLOCK_COMMENT")

    @JvmField val KEYWORD: IElementType = FlatBuffersElementType("KEYWORD")
    @JvmField val BUILTIN_TYPE: IElementType = FlatBuffersElementType("BUILTIN_TYPE")
    @JvmField val BOOL_LITERAL: IElementType = FlatBuffersElementType("BOOL_LITERAL")
    @JvmField val NULL_LITERAL: IElementType = FlatBuffersElementType("NULL_LITERAL")

    @JvmField val IDENTIFIER: IElementType = FlatBuffersElementType("IDENTIFIER")
    @JvmField val NUMBER: IElementType = FlatBuffersElementType("NUMBER")
    @JvmField val STRING: IElementType = FlatBuffersElementType("STRING")

    @JvmField val LBRACE: IElementType = FlatBuffersElementType("LBRACE")
    @JvmField val RBRACE: IElementType = FlatBuffersElementType("RBRACE")
    @JvmField val LPAREN: IElementType = FlatBuffersElementType("LPAREN")
    @JvmField val RPAREN: IElementType = FlatBuffersElementType("RPAREN")
    @JvmField val LBRACKET: IElementType = FlatBuffersElementType("LBRACKET")
    @JvmField val RBRACKET: IElementType = FlatBuffersElementType("RBRACKET")
    @JvmField val SEMICOLON: IElementType = FlatBuffersElementType("SEMICOLON")
    @JvmField val COLON: IElementType = FlatBuffersElementType("COLON")
    @JvmField val COMMA: IElementType = FlatBuffersElementType("COMMA")
    @JvmField val EQ: IElementType = FlatBuffersElementType("EQ")
    @JvmField val DOT: IElementType = FlatBuffersElementType("DOT")
}

private class FlatBuffersElementType(debugName: String) : IElementType(debugName, FlatBuffersLanguage)
