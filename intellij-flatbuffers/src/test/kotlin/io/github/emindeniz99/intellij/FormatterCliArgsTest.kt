package io.github.emindeniz99.intellij

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The command line the engine actually receives, pinned.
 *
 * Nothing else can catch a mistake here. The plugin shells out to a
 * formatter that accepts every one of these options and has a default
 * for each, so a dropped flag, a flipped boolean or a swallowed zero
 * does not crash, does not warn, and does not show up in any log — it
 * just returns the user's schema formatted the way they explicitly
 * asked it not to be. The whole reason [FormatterCliArgs.of] is a pure
 * function over a plain state object is so this file can exist without
 * an IDE.
 *
 * Two properties are load-bearing and tested from several angles:
 *
 *  * **A default is never emitted.** The engine owns its defaults; the
 *    moment the plugin starts spelling them out, they are frozen at the
 *    values in this repo and every future engine change is silently
 *    overridden for every user.
 *  * **`extraArgs` goes last.** It is the documented override for
 *    everything above it, which is only true if it is appended after.
 */
class FormatterCliArgsTest {

    /** Args for a fresh install, with [configure] applied on top. */
    private fun args(configure: FlatBuffersSettings.State.() -> Unit = {}): List<String> =
        FormatterCliArgs.of(FlatBuffersSettings.State().apply(configure))

    @Test
    fun aFreshInstallPassesNoFormatOptionsAtAll() {
        // The upgrade contract: someone who never opens the settings
        // page must get the exact command line the plugin built before
        // these fields existed — engine defaults, applied by the engine.
        assertEquals(emptyList<String>(), args())
    }

    @Test
    fun theStoredDefaultsAreTheEnginesOwnDefaults() {
        // The claim the test above depends on but cannot prove:
        // "unset" must mean the same thing on both sides of the process
        // boundary. Values from `flatbuffers-format --help`; changing
        // one here is a change to what a fresh install does, so it
        // should have to be typed twice.
        val fresh = FlatBuffersSettings.State()

        assertEquals(2, fresh.indent)
        assertFalse(fresh.useTabs)
        assertEquals(80, fresh.lineWidth)
        assertTrue("the engine collapses small bodies unless told not to", fresh.compactSingleLine)
        assertEquals(1, fresh.maxBlankLines)
        assertFalse(fresh.wrapComments)
        assertEquals(
            "comment width must start out following the line width",
            FormatterCliArgs.COMMENT_WIDTH_INHERIT,
            fresh.commentWidth,
        )
        assertEquals("", fresh.extraArgs)
    }

    @Test
    fun eachChangedOptionEmitsItsOwnFlagAndNothingElse() {
        // One option at a time, exact-list assertions: this is what
        // catches a flag that is misspelled, that carries the wrong
        // value, or that drags an unrelated option along with it.
        assertEquals(listOf("--indent", "4"), args { indent = 4 })
        assertEquals(listOf("--use-tabs"), args { useTabs = true })
        assertEquals(listOf("--line-width", "120"), args { lineWidth = 120 })
        assertEquals(listOf("--max-blank-lines", "3"), args { maxBlankLines = 3 })
        assertEquals(listOf("--wrap-comments"), args { wrapComments = true })
        assertEquals(listOf("--comment-width", "72"), args { commentWidth = 72 })
    }

    @Test
    fun zeroMaxBlankLinesIsEmittedBecauseItIsARealSetting() {
        // "Remove every blank line between declarations" is a setting a
        // user can choose, and it is precisely the one a truthiness
        // check (`if (maxBlankLines > 0)`, `if (maxBlankLines)`) drops
        // on the floor — leaving the engine on its default of 1 while
        // the settings page insists it is 0.
        assertEquals(listOf("--max-blank-lines", "0"), args { maxBlankLines = 0 })
    }

    @Test
    fun singleLineCollapsingIsOnlyDisabledWhenTheUserDisabledIt() {
        // The one option stored as the opposite of its flag. Getting
        // this backwards would reformat every small enum body in every
        // schema of every user who never touched the setting.
        assertEquals(
            listOf("--no-compact-single-line"),
            args { compactSingleLine = false },
        )
        assertEquals(
            "the engine already collapses; saying so again is drift waiting to happen",
            emptyList<String>(),
            args { compactSingleLine = true },
        )
    }

    @Test
    fun inheritedCommentWidthEmitsNothingSoTheEngineCanFollowTheLineWidth() {
        // `--comment-width` defaults to `--line-width`. Emitting the
        // sentinel, or resolving it here into a number, would freeze
        // comment wrapping at whatever the line width happened to be —
        // so raising the line width later would silently stop moving
        // the comments with it.
        assertEquals(
            emptyList<String>(),
            args { commentWidth = FormatterCliArgs.COMMENT_WIDTH_INHERIT },
        )
        assertEquals(
            listOf("--line-width", "120"),
            args {
                lineWidth = 120
                commentWidth = FormatterCliArgs.COMMENT_WIDTH_INHERIT
            },
        )
    }

    @Test
    fun extraArgsComeLastSoTheyStillOverrideEveryTypedField() {
        // The escape hatch only works if it is appended after the
        // options it is documented to override — the engine keeps the
        // last occurrence of a repeated option.
        val result = args {
            indent = 4
            useTabs = true
            lineWidth = 120
            compactSingleLine = false
            maxBlankLines = 0
            wrapComments = true
            commentWidth = 60
            extraArgs = "--indent 8 --no-gitignore"
        }

        assertEquals(
            listOf(
                "--indent", "4",
                "--use-tabs",
                "--line-width", "120",
                "--no-compact-single-line",
                "--max-blank-lines", "0",
                "--wrap-comments",
                "--comment-width", "60",
                "--indent", "8",
                "--no-gitignore",
            ),
            result,
        )
    }

    @Test
    fun theExtraArgsBoxSplitsOnWhitespaceAndAnEmptyBoxAddsNothing() {
        // Behaviour inherited verbatim from the formatting service,
        // where this splitting used to be inlined: keeping it identical
        // is what makes this refactor invisible to existing users.
        assertEquals(
            listOf("--line-width", "100", "--use-tabs"),
            args { extraArgs = "  --line-width\t100 \n --use-tabs  " },
        )
        assertEquals(emptyList<String>(), args { extraArgs = "   " })
    }
}
