package io.github.emindeniz99.intellij

import com.intellij.psi.TokenType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

/**
 * flatc accepts a sign on special floats (`d: double = -inf;`, used by
 * flatbuffers' own monster_test.fbs). The highlighter must take the sign
 * and the word as one literal, not flag the sign as a bad character.
 */
class FlatBuffersLexerSignedScalarTest {

    private fun tokens(text: String): List<Pair<Any?, String>> {
        val lexer = FlatBuffersLexer()
        lexer.start(text, 0, text.length, 0)
        val out = mutableListOf<Pair<Any?, String>>()
        while (lexer.tokenType != null) {
            out += lexer.tokenType to text.substring(lexer.tokenStart, lexer.tokenEnd)
            lexer.advance()
        }
        return out
    }

    @Test
    fun signedSpecialFloatsAreOneLiteral() {
        for (literal in listOf("-inf", "+inf", "-nan", "+infinity")) {
            val toks = tokens("d: double = $literal;")
            assertFalse(literal, toks.any { it.first == TokenType.BAD_CHARACTER })
            assertEquals(literal, FlatBuffersTokenTypes.NULL_LITERAL to literal, toks.first { it.second.endsWith(literal.drop(1)) })
        }
    }
}
