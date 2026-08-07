package io.github.emindeniz99.intellij

/**
 * Turns the persisted format settings into the argument list the engine
 * is invoked with.
 *
 * Pure and IDE-free on purpose. This is the one place where a misspelled
 * flag, an inverted boolean, or a dropped zero silently changes how
 * every user's schemas come out — none of which a running IDE would
 * report, because the engine simply formats with a default the user did
 * not choose. [FormatterCliArgsTest] is the guard, and it can only exist
 * because this function takes a plain state object and returns a list.
 *
 * ## The rule: emit nothing for a value that is already the default
 *
 * The engine owns its defaults. If the plugin spelled every option out
 * on the command line, those literals would become a second, competing
 * copy of the defaults — frozen on the day this file was written, and
 * silently overriding the engine the first time it changed one of them
 * (or grew a project-level config file). So each option below is emitted
 * only when it differs from what the engine would do unprompted, and the
 * defaults recorded here exist only to answer "is this still the
 * default?".
 *
 * Defaults verified against `flatbuffers-format --help`:
 * `--indent 2`, `--use-tabs` off, `--line-width 80`, single-line
 * collapsing on, `--max-blank-lines 1`, `--wrap-comments` off,
 * `--comment-width` following `--line-width`.
 */
object FormatterCliArgs {

    /** Engine default for `--indent`. */
    const val DEFAULT_INDENT: Int = 2

    /** Engine default for `--line-width`. */
    const val DEFAULT_LINE_WIDTH: Int = 80

    /** Engine default for `--max-blank-lines`. */
    const val DEFAULT_MAX_BLANK_LINES: Int = 1

    /**
     * Stored `commentWidth` meaning "let the engine follow
     * `--line-width`", which is what it does when the flag is absent.
     *
     * Zero is a safe sentinel rather than a magic number that could
     * collide with a real preference: the engine rejects
     * `--comment-width 0` outright ("expects a positive integer"), so no
     * user can ever mean it literally.
     */
    const val COMMENT_WIDTH_INHERIT: Int = 0

    /**
     * The arguments for [state], in the order they are passed to the
     * engine. Never includes the file to format — the caller appends
     * that after these.
     */
    fun of(state: FlatBuffersSettings.State): List<String> = buildList {
        if (state.indent != DEFAULT_INDENT) {
            add("--indent")
            add(state.indent.toString())
        }

        // The booleans are written as "is this the non-default state?"
        // instead of a comparison against the defaults, because each
        // flag only exists in one direction. `--no-compact-single-line`
        // is the negative of a setting we persist positively, and this
        // line is the single place that inversion happens — keeping it
        // out of the stored state is what stops "compactSingleLine =
        // false" from ever meaning "collapsing on" after a later edit.
        if (state.useTabs) add("--use-tabs")

        if (state.lineWidth != DEFAULT_LINE_WIDTH) {
            add("--line-width")
            add(state.lineWidth.toString())
        }

        if (!state.compactSingleLine) add("--no-compact-single-line")

        // Deliberately `!=` and not a truthiness test: 0 is a meaningful
        // value here ("delete every blank line between declarations"),
        // and it is exactly the value a `if (maxBlankLines > 0)` shortcut
        // would swallow.
        if (state.maxBlankLines != DEFAULT_MAX_BLANK_LINES) {
            add("--max-blank-lines")
            add(state.maxBlankLines.toString())
        }

        if (state.wrapComments) add("--wrap-comments")

        if (state.commentWidth != COMMENT_WIDTH_INHERIT) {
            add("--comment-width")
            add(state.commentWidth.toString())
        }

        // Last, always: the free-text box is the escape hatch for
        // options this panel does not model, and for overriding one that
        // it does. The engine keeps the last occurrence of a repeated
        // option, so "last" is what makes it an override rather than a
        // coin toss.
        addAll(split(state.extraArgs))
    }

    /**
     * Splits the free-text argument box the way the caller used to
     * inline it: on whitespace, with no quote handling. An argument that
     * needs a space inside it cannot be expressed — that has always been
     * true here, and the typed fields above now cover the options where
     * it would matter.
     */
    fun split(raw: String): List<String> =
        raw.split(' ', '\t', '\n', '\r').filter { it.isNotBlank() }
}
