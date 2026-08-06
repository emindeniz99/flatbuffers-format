# flatbuffers-format-handrolled

> ⚠️ **Not published to npm.** This is the differential-oracle sibling of
> the public [`flatbuffers-format`](../flatbuffers-formatter) package.
> If you want to install a FlatBuffers formatter, use that one.

[![CI](https://github.com/emindeniz99/playground/actions/workflows/flatbuffers-ci.yml/badge.svg?branch=main)](https://github.com/emindeniz99/playground/actions/workflows/flatbuffers-ci.yml)

Hand-rolled recursive-descent FlatBuffers (`.fbs`) schema formatter with
**zero runtime dependencies**. Lives in this monorepo to cross-check the
published ANTLR-backed implementation: every commit, every release, both
formatters are run against `test/corpus/` and required to produce
byte-identical output.

```
flatbuffers-format-handrolled (this dir)  ──┐
                                            ├──► test/crosscheck.sh ──► 16/16 OK
flatbuffers-format        (ANTLR sibling)  ──┘
```

## Why this exists

A formatter only matters if its output matches the spec. The spec for
FlatBuffers schema is the EBNF at
[flatbuffers.dev/flatbuffers_grammar.html](https://flatbuffers.dev/flatbuffers_grammar.html).
The published package implements that EBNF as an ANTLR4 grammar (`.g4`).
This sibling implements it again from scratch as recursive descent.

**Trusting one implementation is "we hope ANTLR is right". Two
independent implementations agreeing byte-for-byte on a 16-file corpus
is much stronger evidence.** That's the only job this package has.

The cross-check script lives in the published sibling
(`../flatbuffers-formatter/test/crosscheck.sh`) and runs in *its*
`prepublishOnly` hook, so a regression in either parser blocks the next
release.

## Architecture (in one screen)

| File | LOC | Role |
|---|---|---|
| `src/lexer.ts` | 260 | Tokenize `.fbs` into a stream with attached trivia |
| `src/parser.ts` | 587 | Recursive-descent parse → AST |
| `src/printer.ts` | 380 | Pretty-print AST back to canonical source |
| `src/types.ts` | 206 | AST node definitions |
| `src/cli.ts` | 234 | Node-only CLI wrapper |
| `src/index.ts` | 19  | Public API |

The trickiest part isn't parsing — it's faithfully round-tripping
trivia: `//`, `///`, `/* */`, blank lines as paragraph separators, and
"trailing" comments that must stay on the same line as the token they
follow.

## Running it locally

```bash
npm install
npm run build               # tsc, no codegen needed
node dist/cli.js examples/sample.fbs
npm test                    # 14 unit tests
```

The bin (`flatbuffers-format-handrolled`) only exists for the
cross-check script's convenience. End users should never see it.

## Comparison vs. the published (ANTLR) build

| | this (hand-rolled) | `flatbuffers-format` (ANTLR) |
|---|---|---|
| Runtime deps | 0 | `antlr4ng` |
| Build step | `tsc` | `antlr-ng` codegen → `tsc` |
| Source lines (own) | ~1,690 | ~880 + 155-line `.g4` + 3,446 generated |
| Browser bundle, gzipped | ~4 kB | ~60 kB |
| In-process throughput | ~5× faster | baseline |
| Grammar source of truth | the TS code | declarative `.g4` file |
| Error recovery | manual `throw` | ANTLR's built-in |

For the published package the canonical grammar (`.g4`) and the active
ecosystem story (auditable spec, multi-language portability) outweighed
the perf/bundle savings. This sibling keeps the perf/bundle data point
honest, and serves as the second voter in the differential check.

## See also

- [`../flatbuffers-formatter`](../flatbuffers-formatter) —
  the published `flatbuffers-format` package, ANTLR-backed.
- [`../flatbuffers-formatter/test/crosscheck.sh`](../flatbuffers-formatter/test/crosscheck.sh)
  — the byte-for-byte differential test.
- [FlatBuffers grammar spec](https://flatbuffers.dev/flatbuffers_grammar.html)
  — the EBNF both implementations conform to.
