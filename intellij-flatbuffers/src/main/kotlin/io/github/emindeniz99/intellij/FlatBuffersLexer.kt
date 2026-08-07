package io.github.emindeniz99.intellij

import com.intellij.lexer.LexerBase
import com.intellij.psi.TokenType
import com.intellij.psi.tree.IElementType

/**
 * Hand-rolled lexer for FlatBuffers schemas. We deliberately skip JFlex
 * here — the grammar is small (≈12 keywords, ≈22 builtin types, single
 * string form, simple numeric forms) and a hand-rolled scanner is
 * easier to keep in lockstep with the engine grammar.
 *
 * Lifecycle: IntelliJ instantiates one [FlatBuffersLexer] per highlight
 * pass, calls [start] once with the buffer slice it wants tokenized,
 * then alternates [getTokenType] / [advance] until [getTokenType]
 * returns `null`. We position one token ahead — `start` calls `advance`
 * so the first lookup is already valid.
 *
 * Numbers cover the four flavours the engine accepts: decimal,
 * hexadecimal (`0x…`), C99 hex float (`0x…p±N`), and decimal float
 * with optional exponent. Strings allow `\"` and `\\` escapes and
 * terminate at the closing quote OR an unescaped newline (so
 * unterminated strings stop at the line boundary rather than eating
 * the rest of the file).
 */
class FlatBuffersLexer : LexerBase() {
    private var buffer: CharSequence = ""
    private var bufferEnd: Int = 0
    private var position: Int = 0
    private var tokenStart: Int = 0
    private var tokenEnd: Int = 0
    private var tokenType: IElementType? = null

    override fun start(buffer: CharSequence, startOffset: Int, endOffset: Int, initialState: Int) {
        this.buffer = buffer
        this.bufferEnd = endOffset
        this.position = startOffset
        advance()
    }

    override fun getState(): Int = 0
    override fun getTokenType(): IElementType? = tokenType
    override fun getTokenStart(): Int = tokenStart
    override fun getTokenEnd(): Int = tokenEnd
    override fun getBufferSequence(): CharSequence = buffer
    override fun getBufferEnd(): Int = bufferEnd

    override fun advance() {
        tokenStart = position
        if (position >= bufferEnd) {
            tokenType = null
            tokenEnd = position
            return
        }
        val c = buffer[position]
        when {
            c.isWhitespace() -> scanWhitespace()
            c == '/' && peek(1) == '/' -> scanLineComment()
            c == '/' && peek(1) == '*' -> scanBlockComment()
            c == '"' -> scanString()
            c.isDigit() -> scanNumber()
            (c == '+' || c == '-') && peek(1)?.isDigit() == true -> scanNumber()
            (c == '+' || c == '-') && peek(1) == '.' && peek(2)?.isDigit() == true -> scanNumber()
            c == '.' && peek(1)?.isDigit() == true -> scanNumber()
            isIdentStart(c) -> scanIdentifier()
            else -> scanPunctuation(c)
        }
        tokenEnd = position
    }

    private fun peek(offset: Int): Char? =
        if (position + offset < bufferEnd) buffer[position + offset] else null

    private fun isIdentStart(c: Char): Boolean = c.isLetter() || c == '_'
    private fun isIdentCont(c: Char): Boolean = c.isLetterOrDigit() || c == '_'

    private fun scanWhitespace() {
        while (position < bufferEnd && buffer[position].isWhitespace()) position++
        tokenType = TokenType.WHITE_SPACE
    }

    private fun scanLineComment() {
        // `///` opens a doc comment; bare `//` opens a regular line comment.
        val isDoc = peek(2) == '/' && peek(3) != '/'
        position += if (isDoc) 3 else 2
        while (position < bufferEnd && buffer[position] != '\n') position++
        tokenType = if (isDoc) FlatBuffersTokenTypes.DOC_COMMENT else FlatBuffersTokenTypes.LINE_COMMENT
    }

    private fun scanBlockComment() {
        position += 2
        while (position < bufferEnd) {
            if (buffer[position] == '*' && position + 1 < bufferEnd && buffer[position + 1] == '/') {
                position += 2
                break
            }
            position++
        }
        tokenType = FlatBuffersTokenTypes.BLOCK_COMMENT
    }

    private fun scanString() {
        position++ // opening "
        while (position < bufferEnd) {
            val ch = buffer[position]
            if (ch == '"') {
                position++
                break
            }
            if (ch == '\n') break // unterminated — stop at line boundary
            if (ch == '\\' && position + 1 < bufferEnd) {
                position += 2
            } else {
                position++
            }
        }
        tokenType = FlatBuffersTokenTypes.STRING
    }

    private fun scanNumber() {
        // Optional leading sign.
        if (buffer[position] == '+' || buffer[position] == '-') position++

        val isHex = position + 1 < bufferEnd
                && buffer[position] == '0'
                && (buffer[position + 1] == 'x' || buffer[position + 1] == 'X')

        if (isHex) {
            position += 2
            while (position < bufferEnd && isHexDigit(buffer[position])) position++
            // C99 hex float fractional part.
            if (position < bufferEnd && buffer[position] == '.') {
                position++
                while (position < bufferEnd && isHexDigit(buffer[position])) position++
            }
            // Binary exponent (mandatory for hex float, but we don't enforce here).
            if (position < bufferEnd && (buffer[position] == 'p' || buffer[position] == 'P')) {
                position++
                if (position < bufferEnd && (buffer[position] == '+' || buffer[position] == '-')) position++
                while (position < bufferEnd && buffer[position].isDigit()) position++
            }
        } else {
            while (position < bufferEnd && buffer[position].isDigit()) position++
            if (position < bufferEnd && buffer[position] == '.') {
                position++
                while (position < bufferEnd && buffer[position].isDigit()) position++
            }
            if (position < bufferEnd && (buffer[position] == 'e' || buffer[position] == 'E')) {
                position++
                if (position < bufferEnd && (buffer[position] == '+' || buffer[position] == '-')) position++
                while (position < bufferEnd && buffer[position].isDigit()) position++
            }
        }
        tokenType = FlatBuffersTokenTypes.NUMBER
    }

    private fun scanIdentifier() {
        val start = position
        while (position < bufferEnd && isIdentCont(buffer[position])) position++
        val text = buffer.subSequence(start, position).toString()
        tokenType = when (text) {
            in KEYWORDS -> FlatBuffersTokenTypes.KEYWORD
            in BUILTIN_TYPES -> FlatBuffersTokenTypes.BUILTIN_TYPE
            in BOOL_LITERALS -> FlatBuffersTokenTypes.BOOL_LITERAL
            in NULL_LITERALS -> FlatBuffersTokenTypes.NULL_LITERAL
            else -> FlatBuffersTokenTypes.IDENTIFIER
        }
    }

    private fun scanPunctuation(c: Char) {
        position++
        tokenType = when (c) {
            '{' -> FlatBuffersTokenTypes.LBRACE
            '}' -> FlatBuffersTokenTypes.RBRACE
            '(' -> FlatBuffersTokenTypes.LPAREN
            ')' -> FlatBuffersTokenTypes.RPAREN
            '[' -> FlatBuffersTokenTypes.LBRACKET
            ']' -> FlatBuffersTokenTypes.RBRACKET
            ';' -> FlatBuffersTokenTypes.SEMICOLON
            ':' -> FlatBuffersTokenTypes.COLON
            ',' -> FlatBuffersTokenTypes.COMMA
            '=' -> FlatBuffersTokenTypes.EQ
            '.' -> FlatBuffersTokenTypes.DOT
            else -> TokenType.BAD_CHARACTER
        }
    }

    private fun isHexDigit(c: Char): Boolean =
        c.isDigit() || c in 'a'..'f' || c in 'A'..'F'

    companion object {
        // Mirrors the engine grammar's reserved-word set. If you add a
        // new top-level keyword to FlatBuffers.g4, mirror it here.
        private val KEYWORDS = setOf(
            "namespace", "table", "struct", "enum", "union",
            "root_type", "file_extension", "file_identifier",
            "attribute", "rpc_service", "include", "native_include",
        )
        private val BUILTIN_TYPES = setOf(
            "bool", "byte", "ubyte", "short", "ushort",
            "int", "uint", "long", "ulong", "float", "double", "string",
            "int8", "int16", "int32", "int64",
            "uint8", "uint16", "uint32", "uint64",
            "float32", "float64",
        )
        private val BOOL_LITERALS = setOf("true", "false")
        // FlatBuffers floats accept inf/nan/-inf/-nan as literal tokens.
        // `null` isn't a FlatBuffers literal but Prettier-style schemas
        // sometimes use it in attributes; harmless to include.
        private val NULL_LITERALS = setOf("null", "inf", "nan")
    }
}
