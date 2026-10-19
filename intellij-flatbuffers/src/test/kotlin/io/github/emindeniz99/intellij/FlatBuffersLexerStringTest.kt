package io.github.emindeniz99.intellij

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * flatc reads strings in either quote style (`include 'a.fbs';` appears
 * in flatbuffers' own tests). A single-quoted string lexed as anything
 * else would read a `//` inside it as the start of a comment.
 */
class FlatBuffersLexerStringTest {

    private fun tokens(text: String): List<Pair<String, String>> {
        val lexer = FlatBuffersLexer()
        lexer.start(text, 0, text.length, 0)
        val out = mutableListOf<Pair<String, String>>()
        while (lexer.tokenType != null) {
            out += lexer.tokenType.toString() to text.substring(lexer.tokenStart, lexer.tokenEnd)
            lexer.advance()
        }
        return out
    }

    @Test
    fun singleAndDoubleQuotedStringsAreOneStringToken() {
        for (literal in listOf("'https://a//b'", "\"https://a//b\"", "'say \"hi\"'", "'it\\'s'")) {
            val strings = tokens("x = $literal;").filter { it.first == FlatBuffersTokenTypes.STRING.toString() }
            assertEquals(literal, listOf(literal), strings.map { it.second })
        }
    }
}
