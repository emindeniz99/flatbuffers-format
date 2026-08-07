# Architecture

Tour of how `flatbuffers-format` is put together, for contributors and
the curious. Companion to [`grammar-comparison.md`](grammar-comparison.md)
(which compares the two parser implementations) and
[`ebnf-conformance.md`](ebnf-conformance.md) (which audits the grammar
against the upstream EBNF).

## High-level pipeline

```
.fbs source string
       │
       ▼
┌────────────────────────────────┐
│ ANTLR4 lexer (generated)       │   ← grammar/FlatBuffers.g4
│   src/generated/               │
│     FlatBuffersLexer.ts        │
└──────────────┬─────────────────┘
               │ token stream (CommonTokenStream)
               │   includes hidden-channel tokens
               │   for comments and whitespace
               ▼
┌────────────────────────────────┐
│ ANTLR4 parser (generated)      │   ← same .g4
│   src/generated/               │
│     FlatBuffersParser.ts       │
└──────────────┬─────────────────┘
               │ parse tree (SchemaContext)
               ▼
┌────────────────────────────────┐
│ Printer                        │
│   src/printer.ts               │
│ + Trivia recovery              │
│   src/trivia.ts                │
└──────────────┬─────────────────┘
               │ canonical .fbs source string
               ▼
┌────────────────────────────────┐
│ Public API                     │
│   src/index.ts                 │
│     format(), check(),         │
│     FormatError, FormatOptions │
└────────────────────────────────┘
```

Three independent surfaces sit on top of `format()`:

- **`src/cli.ts`** — Node-only CLI: arg parsing, stdin handling,
  directory walking, gitignore-aware discovery, `--write` / `--check` /
  `--diff` modes, IDE-link-friendly error reports.
- **`web/index.html`** — Browser playground using an import map.
- **The Prettier plugin** (sibling project `prettier-plugin-flatbuffers/`,
  if present) — wraps `format()` for Prettier 3.

## Why ANTLR + a hand-rolled differential oracle?

The grammar is small (~155 lines of `.g4`, ~12 keywords, basically
unchanged since flatc 1.x). Two factors made the ANTLR choice
non-obvious:

1. **The bundle weight.** ANTLR's runtime adds ~50 kB gzipped on top
   of the parser. A hand-rolled recursive-descent parser for the same
   grammar bundles to ~4 kB.
2. **The maintenance cost.** Codegen is a build step (`antlr-ng`),
   and the generated parser drags ~3,500 LOC of generated code into
   the published tarball.

We picked ANTLR anyway because:

1. The `.g4` IS the spec. Reviewers can compare it line-for-line with
   the upstream EBNF at flatbuffers.dev/grammar without parsing
   TypeScript first.
2. ANTLR's error recovery is industry-leading. We get useful
   "expected X but got Y" diagnostics for free.
3. The grammar surface is stable enough that the build-step cost
   amortizes well.

To hedge bet #1 (i.e. "is our grammar actually right?"), there's a
**hand-rolled recursive-descent parser** in
`flatbuffers-formatter-handrolled/` — a private sibling
package, not published. The cross-check at
`test/crosscheck.sh` runs every corpus file through both engines and
requires byte-identical output. Two independent implementations
agreeing is much stronger evidence than "we trust ANTLR".

See [`grammar-comparison.md`](grammar-comparison.md) for the perf,
LOC, and bundle-size comparison side by side.

## Trivia handling — the hardest part

A formatter only matters if it preserves comments and paragraph
breaks. The tricky bits:

### Comments live on a hidden channel

ANTLR's lexer routes line comments (`//`), doc comments (`///`), and
block comments (`/* */`) to `channel(HIDDEN)`. The parser ignores
them; they don't appear in the parse tree. The printer recovers them
from the underlying token stream via
`BufferedTokenStream.getHiddenTokensToLeft / Right(tokenIndex)`.

Same idea in the hand-rolled sibling, but the lexer there attaches
trivia directly to the next token as a property, since there's no
ANTLR channel concept.

### Doc-comments stay glued to their target

A doc comment immediately above a `table T { ... }` must travel with
the table — not float up to attach to the previous declaration. The
trivia helpers in `src/trivia.ts` use the rule of "everything before
the first newline after the token X belongs to X's trailing trivia;
everything after that belongs to the leading trivia of whatever comes
next".

### Blank lines as paragraph separators

Two or more consecutive newlines = a paragraph break. The lexer
collapses runs of newlines to a single `blank_line` trivia marker;
the printer emits exactly one blank line wherever the marker
appears. This matches what users intuitively expect ("a blank line
means I want a blank line; multiple blank lines are not meaningful").

### The trailing-comment edge case

Block comments after `;` are ambiguous:

```
field: int; /* this comment belongs to `field` */
next_field: string;
```

The printer must decide: does the block comment stay on the same
line as `field`, or jump to its own line? Convention: if the comment
is on the **same line** as its preceding token, it stays trailing.
The trivia helper checks for an intervening newline; if there isn't
one, the comment is marked `trailing`. If the same token is also a
leading hidden token of the next declaration, dedupe — otherwise the
comment gets emitted twice.

This bit caused the most bugs during grammar-gap closure. The
hand-rolled and ANTLR engines arrived at the same rule by different
routes; cross-check caught the off-by-one in trivia dedup multiple
times.

## Why the public API is small

The exports from `src/index.ts` are deliberately minimal:

```ts
export function format(source: string, options?: FormatOptions): string;
export function check(source: string, options?: FormatOptions): boolean;
export class FormatError extends Error { line: number; column: number }
export type FormatOptions = { indent?: number; newline?: "\n" | "\r\n" };
```

That's it. **Nothing else is considered public**.

The lexer, parser context types, printer class, trivia helpers, and
generated parser are all reachable from `src/` but aren't re-exported
from `index.ts`. They may change in any patch release without notice.
If you find yourself wanting to import something from a deeper path,
open an issue first — there's likely a way to do what you need
through the public API, or a public-API addition is warranted.

This tight surface is a deliberate pre-1.0 stance. See
[the README's Versioning policy section](../README.md#versioning-policy).

## Test layers

There are four independent test layers, and they're independent on
purpose — each catches a class of bug the others can't:

| Layer | Catches |
|---|---|
| `npm test` (29+ unit tests) | Grammar/printer behavior on specific constructs; CLI flag semantics. |
| `bash test/crosscheck.sh` (24 corpus files × 2 engines) | "Did the grammar change break the other implementation?" Differential. |
| `bash scripts/flatc-conform.sh` (24 corpus files × upstream flatc) | "Is our corpus actual valid FlatBuffers, or just our-parser-accepts-it?" |
| Sibling package's `npm test` | The hand-rolled parser's own unit tests. |

The first three all run in `prepublishOnly`. The fourth is implicitly
covered by the crosscheck but also runnable standalone.

## Build outputs

`npm run build` produces:

- `generated/FlatBuffers{Lexer,Parser,Listener}.ts` — emitted by
  `antlr-ng` from `grammar/FlatBuffers.g4`. Checked into git so a
  fresh clone without `antlr-ng` installed can still build (`tsc`
  alone won't run the codegen).
- `dist/src/*.js` + `dist/src/*.d.ts` — the published library + types.
- `dist/generated/*.js` — the generated parser, compiled.
- `dist-test/**` — same trees as above but with the test compiler
  config, used by `node --test`.

`dist/` and `dist-test/` are gitignored. `generated/` is committed.

## What's next

See [the Roadmap section in the README](../README.md#roadmap).
