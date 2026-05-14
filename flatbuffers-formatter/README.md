# flatbuffers-format-antlr

[![npm](https://img.shields.io/npm/v/flatbuffers-format-antlr.svg)](https://www.npmjs.com/package/flatbuffers-format-antlr)

FlatBuffers (`.fbs`) schema formatter built on an **ANTLR4-generated
parser**. Sibling of [`flatbuffers-format`](../flatbuffers-formatter)
(hand-rolled). Same CLI surface, same output, different engine —
useful if you'd rather depend on a real parser generator.

```bash
npx flatbuffers-format-antlr schema.fbs           # to stdout
npx flatbuffers-format-antlr --write src/         # rewrite recursively
npx flatbuffers-format-antlr --check src/         # CI gate
```

## What it does

- A `.g4` grammar in `grammar/FlatBuffers.g4` describes the FlatBuffers
  schema language.
- [`antlr-ng`](https://github.com/mike-lischke/antlr-ng) — a pure-TS
  port of the ANTLR tool — generates `FlatBuffersLexer.ts`,
  `FlatBuffersParser.ts`, and `FlatBuffersListener.ts` into
  `generated/`. **No Java required at any point**.
- `src/printer.ts` walks the ANTLR parse tree (`SchemaContext`,
  `TableDeclContext`, etc.) and emits formatted source.
- `src/trivia.ts` extracts comments and blank lines from ANTLR's
  hidden channel via `BufferedTokenStream.getHiddenTokensToLeft / Right`.

## Install

```bash
npm i -D flatbuffers-format-antlr     # local dev dep
npm i -g flatbuffers-format-antlr     # global CLI
npx flatbuffers-format-antlr ...      # one-shot, no install
```

## CLI

```bash
flatbuffers-format-antlr [options] <file-or-dir...>   # stdout
flatbuffers-format-antlr --write   <file-or-dir...>   # rewrite in place
flatbuffers-format-antlr --check   <file-or-dir...>   # CI gate (exit 1)
flatbuffers-format-antlr fix       <file-or-dir...>   # alias for --write
cat foo.fbs | flatbuffers-format-antlr -              # stdin
```

Directories are walked recursively. Inside a git repository,
`.gitignore` is respected via `git ls-files` — pass `--no-gitignore`
to disable. Outside a repo (or if `git` isn't in `PATH`),
`node_modules`, `.git`, `dist`, `build`, `out`, `.next`, `.turbo`,
`.cache`, `.hg`, and `.svn` are skipped automatically.

## Local build

```bash
cd projects/flatbuffers-formatter-antlr
npm install
npm run build         # generate parser + tsc
node dist/src/cli.js examples/sample.fbs
```

### Browser

`src/index.ts` and the generated parser only depend on `antlr4ng`,
which ships an ES-module build. After `npm run build`, serve the
project root statically and open `web/index.html`:

```bash
npx http-server -p 8080 .
# http://localhost:8080/web/
```

The page resolves `antlr4ng` via an import map pointing at
`node_modules/antlr4ng/dist/index.mjs`.

## Tests

```bash
npm test
```

Compiles and runs 13 tests with the built-in `node --test` runner.
The same suite as the hand-rolled sibling project — both formatters
pass it.

## ANTLR vs. hand-rolled — apples to apples

| | `flatbuffers-formatter` (hand-rolled) | `flatbuffers-formatter-antlr` (this) |
|---|---|---|
| Source files (formatter logic) | `lexer.ts`, `parser.ts`, `printer.ts`, `types.ts` (~900 LOC) | `printer.ts`, `trivia.ts`, `index.ts` (~450 LOC) |
| Generated code | none | `generated/FlatBuffers{Lexer,Parser,Listener}.ts` (~2,700 LOC) |
| Build steps | `tsc` | `antlr-ng` → `tsc` |
| Runtime dependencies | none | `antlr4ng` (~150 KB min+gz) |
| Dev dependencies | `typescript`, `@types/node` | + `antlr-ng` |
| Grammar source of truth | TypeScript code | `grammar/FlatBuffers.g4` (~80 LOC, declarative) |
| Adding a new construct | edit lexer + parser + AST + printer | edit `.g4` + regen + add a printer case |
| Error recovery | manual `throw` on first error | ANTLR's built-in error recovery + listener |
| Comment preservation | trivia attached to tokens during lex | trivia recovered from `HIDDEN` channel via token-index lookups |
| Cold-start parse cost | ~0 — direct functions | ANTLR builds an ATN simulator on first parse |
| Output on `examples/sample.fbs` | identical | identical |

The two were checked byte-for-byte against the same input:

```bash
diff <(node ../flatbuffers-formatter/dist/cli.js examples/sample.fbs) \
     <(node dist/src/cli.js examples/sample.fbs)
# (empty — they match exactly)
```

### Why pick one over the other?

- **ANTLR** wins when the grammar is large, evolving, or shared
  across multiple language targets — `flatc` itself, code generators,
  IDE tooling. The `.g4` is the single source of truth and you get
  a Java / Python / C# / Go parser for free.
- **Hand-rolled** wins when the grammar is small, stable, and you
  care about zero runtime deps, fast cold start, and full control
  over error messages and trivia handling. The whole formatter fits
  in your head.

For a tiny DSL like FlatBuffers schema (~12 keywords), the hand-rolled
version is arguably the better fit — but this project exists so the
two can be compared on the same task.

## Notes / learnings

- `antlr-ng` is a pure-TypeScript reimplementation of the ANTLR tool.
  Generated parsers use the `antlr4ng` runtime, which is the
  TypeScript successor to `antlr4ts`. The whole pipeline is JS, no JVM.
- ANTLR routes whitespace and comments to a hidden channel; recovering
  them is straightforward but **deduping is tricky**. A trailing
  comment after `;` is also a leading hidden token of the next decl —
  if you don't filter, comments get emitted twice. Fix in
  `src/trivia.ts`: only treat hidden tokens *before the first newline*
  as already-claimed by the previous node.
- ANTLR's `INT_LITERAL` / `FLOAT_LITERAL` tokens are scoped per lexer
  rule, so you can't easily share a `NUMBER` rule between them.
  Keeping them separate matches `flatc`'s lexer and makes the parser
  rules read more naturally (`('+' | '-')? INT_LITERAL`).
- The grammar uses inline string literals (`'table'`, `'struct'`,
  `':'`, …) so ANTLR generates anonymous `T__0`, `T__1`, … tokens.
  That's fine for parsing but means the generated `.tokens` file
  isn't human-readable — a named lexer pass (`TABLE: 'table';`) would
  be the polished move if you need cross-language reuse.
