# Style survey: how flatbuffers' own schemas are written

[Issue #16](https://github.com/emindeniz99/flatbuffers-format/issues/16)
asked for `x:int` instead of `x: int`. The formatter had no option for
it, and nobody knew until a user reported it. This survey looks for the
other layouts in the same position: ones real schemas use and the
formatter rewrites with no way to opt out.

It records what was measured, what was decided, and how to measure
again.

## What was measured

The 82 `.fbs` files under `tests/` and `samples/` of
[google/flatbuffers](https://github.com/google/flatbuffers) at
v25.12.19 (commit `7e163021`), the same checkout CI formats in
`scripts/upstream-schemas.sh`. Measured in November 2026, before the
0.6.0 release.

Two measurements:

- **Constructs:** how upstream writes each construct the formatter has
  an opinion about. Counted with regular expressions over the source
  with comments removed, so the counts are close, not exact.
- **Unchanged files:** how many schemas the formatter leaves exactly as
  written. `scripts/style-survey.mjs` computes this and is the number
  to track.

## How upstream writes each construct

| Construct | Upstream | Formatter default | Option for the other form |
|---|---|---|---|
| Field colon | `x:T` 789, `x: T` 135, `x : T` 6, `x :T` 1 | `x: T` | `spaceAfterTypeColon: false` prints `x:T` |
| Enum colon | `E : T` 36, `E:T` 12, `E: T` 9 | `E: T` | `spaceAroundEnumColon: true` prints `E : T`; `spaceAfterTypeColon: false` prints `E:T` |
| Attribute colon | `(id: 1)` 220 in 14 files, `(id:1)` 37 in 4 files | `(id: 1)` | `spaceAfterAttributeColon: false` |
| Empty body | `{}` on one line, 10 of 10 | `{` and `}` on two lines | `collapseEmptyBodies: true` |
| Blank line between one-line declarations | none in 2 files (3 places), one everywhere else | always one | `separateDeclarations: "multiline"` |
| Around `=` | spaces 284, none 2 | spaces | none; the style guide asks for spaces |
| Comma after the last value of a multi-line enum or union | present 52 in 31 files, absent 13 in 7 files | present | `trailingComma: "none"` |
| Indent | 2 spaces in 66 files, 4 spaces in 8, tabs in 1 | 2 spaces | `indent`, `useTabs` |
| Opening brace | declaration's line, except 10 declarations in 6 files | declaration's line | none; the style guide asks for this |
| Final newline | missing in 21 files | always written | none |

The style guide's rule for the field colon is the majority form
upstream (85%). The formatter's default is the minority form. That is
what issue #16 ran into.

## How many schemas come out unchanged

`scripts/style-survey.mjs`, ignoring a missing final newline:

| Options | 0.5.0 | 0.6.0 |
|---|---|---|
| Defaults | 7 of 82 | 7 of 82 |
| The README's style guide options | n/a | 27 of 82 |
| Best fit per file | 8 of 82 | 40 of 82 |

"Best fit" tries every combination of the options that choose between
two layouts and keeps the one that changes the fewest lines. The
defaults row did not move because no default changed.

## What still changes

The 42 schemas that change under their best fit fall into two groups.

**Files that mix layouts.** Most of them. `monster_test.fbs` writes
`color: Color` on one line and `id:ulong` on the next; several files
mix tabs and spaces; some put the brace on its own line for one
declaration and not the next. No option should keep these as written.
Making them uniform is the formatter's job.

**Layouts with no option.** These are consistent choices the formatter
overrides:

| Layout | Upstream | Decision |
|---|---|---|
| Trailing comments aligned in a column, or two spaces before `//` | 21 lines in 5 files | Not yet. Needs alignment across lines in both printers. |
| A table or struct with several fields on one line | 3 files | Not yet. Waiting for someone to need it. |
| Several enum values per line in a multi-line enum | 8 lines in 4 files | Not yet. |
| Attribute lists longer than `lineWidth` | not counted | Not yet. They are never wrapped. |
| Opening brace on its own line | 6 files | Not planned. The style guide says otherwise. |

The "not yet" rows are in [`ROADMAP.md`](../../ROADMAP.md).

One more was fixed outright in 0.6.0. A comment after a one-line body
(`union Equipment { Weapon } // …`, a line in the tutorial's
`monster.fbs`) used to force the body open. It no longer does.

## Decisions

- **Defaults do not change to match a style.** The editor plugins
  bundle the engine and update on their own. A new default would
  reformat every user's files without them asking. Each layout arrives
  as an option whose default is the old output.
- **Options are named for what they control**, in the shape other
  formatters use: IntelliJ's Kotlin code style has
  `space_after_type_colon`, rustfmt has `space_after_colon`, and
  clang-format has `BitFieldColonSpacing`.
- **The enum colon has its own option** because the style guide's
  example mixes the two: `pos:Vec3` for a field, `Color : byte` for the
  enum. One colon option cannot print both.
- **A layout gets an option when real schemas use it consistently.**
  A layout that only shows up in files mixing several is not evidence.
  `separateDeclarations` is the thin one by that test: upstream keeps
  one-line declarations together in only 2 files. It is there because
  the style guide's own example does (`table Weapon {}` directly above
  `table Pickup {}`), and without it that example cannot come out
  unchanged.

## Measuring again

```bash
git clone --depth 1 --branch v25.12.19 https://github.com/google/flatbuffers /tmp/flatbuffers
pnpm --filter flatbuffers-format build
node flatbuffers-formatter/scripts/style-survey.mjs /tmp/flatbuffers --list
```

`--list` names the schemas that still change. Diff one against its
formatted output to see which layout it is. Run it after adding a
layout option, and after moving the flatbuffers version CI pins; update
the table above with the new counts.
