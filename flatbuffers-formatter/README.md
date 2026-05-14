# flatbuffers-format

**The opinionated, zero-config formatter for FlatBuffers (`.fbs`) schemas — fast, byte-stable, type-safe, runs anywhere.**

[![npm](https://img.shields.io/npm/v/flatbuffers-format.svg)](https://www.npmjs.com/package/flatbuffers-format)
[![CI](https://github.com/emindeniz99/playground/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/emindeniz99/playground/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/flatbuffers-format.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/flatbuffers-format.svg)](package.json)
[![Types](https://img.shields.io/badge/types-included-blue.svg)](dist/src/index.d.ts)
[![Bundle](https://img.shields.io/bundlephobia/minzip/flatbuffers-format.svg?label=min%2Bgzip)](https://bundlephobia.com/package/flatbuffers-format)

> **▸ [Try it in your browser](https://emindeniz99.github.io/playground/)** — no install. Paste a `.fbs`, see canonical output as you type. API docs at the same URL.

```bash
# Format a single file (prints to stdout)
npx flatbuffers-format schema.fbs

# Fix a tree in place — recurses; skips node_modules / .git / dist
npx flatbuffers-format --write src/

# Use as a CI check (silent / diff / version)
npx flatbuffers-format --check src/
npx flatbuffers-format --diff  src/
npx flatbuffers-format --version
```

See [`docs/cookbook.md`](docs/cookbook.md) for 8 copy-paste recipes — CI gates,
pre-commit hooks, programmatic Node/browser use, Prettier integration, repo
migration tips.

## Contents

- [What it does](#what-it-does)
- [CLI](#cli)
- [Install](#install)
- [Editor integration](#editor-integration)
- [API](#api)
- [Performance](#performance)
- [Formatting rules](#formatting-rules)
- [Standards conformance](#standards-conformance)
- [Build from source](#build-from-source)
- [Releases](#releases)
- [Notes / learnings](#notes--learnings)

## Why

A FlatBuffers schema is a small declarative DSL — like Protobuf, Cap'n Proto,
or Thrift. Unlike Protobuf and the rest, there's no official formatter. Schemas
drift into per-author whitespace styles, code-review noise from "whitespace
only" PRs accumulates, and CI has no `--check`-style gate. `flatbuffers-format`
fixes that: one binary, zero config, deterministic output, exit-code semantics
that drop straight into existing CI patterns.

Opinionated for the same reason `gofmt` and `rustfmt` are opinionated — the
formatter's value is in *not* relitigating style. Two knobs (indent width,
newline) and that's it.

## What it does

- A canonical FlatBuffers schema grammar lives in
  [`grammar/FlatBuffers.g4`](grammar/FlatBuffers.g4) (~155 lines of
  ANTLR4 EBNF, mirrors the
  [official grammar](https://flatbuffers.dev/flatbuffers_grammar.html)).
- [`antlr-ng`](https://github.com/mike-lischke/antlr-ng) — a pure-TS
  reimplementation of the ANTLR tool — generates
  `FlatBuffersLexer.ts`, `FlatBuffersParser.ts`, and
  `FlatBuffersListener.ts` into `generated/`. **No Java at any point.**
- `src/printer.ts` walks the ANTLR parse tree (`SchemaContext`,
  `TableDeclContext`, etc.) and emits formatted source.
- `src/trivia.ts` recovers comments and blank lines from ANTLR's
  hidden channel via `BufferedTokenStream.getHiddenTokensToLeft / Right`.
- `format(source)` is a fixed point: running it twice gives the same
  output as running it once.

### Supported FlatBuffers features

- `table`, `struct`, `enum`, `union`, `rpc_service` declarations
- Namespaced type references (`field: a.b.Foo;`)
- Fixed-size arrays (`pts: [float:3];`)
- `native_include` directives
- Keywords as field names (`table T { enum: int; }`)
- Object literals (the `flatc` text format)
- All metadata: `(deprecated)`, `(key: "value")`, etc.

## CLI

```bash
flatbuffers-format [options] <file-or-dir...>   # print formatted output to stdout
flatbuffers-format --write   <file-or-dir...>   # rewrite files in place
flatbuffers-format --check   <file-or-dir...>   # exit 1 if any file is unformatted
flatbuffers-format fix       <file-or-dir...>   # alias for --write
cat foo.fbs | flatbuffers-format -              # read source from stdin
```

Options:

| Flag | Meaning |
|---|---|
| `-w`, `--write` | Rewrite files in place |
| `-c`, `--check` | Check formatting; exit 1 on diff (silent) |
| `-d`, `--diff` | Print unified diff for each file that would change; exit 1 if any |
| `--indent <n>` | Spaces per indent level (default: 2) |
| `--no-gitignore` | Don't consult `.gitignore` when walking directories |
| `-V`, `--version` | Print version and exit |
| `-h`, `--help` | Show help |

On a parse error, the CLI emits an IDE-link-friendly report
(`path:line:col: …`) with a source-snippet and a caret under the
offending column, so editors that auto-link compiler diagnostics
(VS Code's terminal, neovim's `:cw`, IntelliJ's run console) jump
straight to the problem.

Directories are walked recursively. **Inside a git repository**,
`.gitignore` is respected via `git ls-files` — pass `--no-gitignore`
to disable. **Outside a repo** (or if `git` isn't in `PATH`),
`node_modules`, `.git`, `dist`, `build`, `out`, `.next`, `.turbo`,
`.cache`, `.hg`, and `.svn` are skipped automatically.

## Install

```bash
npm i -D flatbuffers-format         # local dev dep
npm i -g flatbuffers-format         # global CLI
npx flatbuffers-format ...          # one-shot, no install
```

See [docs/cookbook.md](docs/cookbook.md) for copy-paste recipes (CI gates, pre-commit hooks, programmatic use, browser, Prettier integration, migration tips).

## Editor integration

There's no dedicated editor plugin yet. Until there is, run the CLI from
your editor's "format on save" or "run command" hook.

**VS Code** — install
[emeraldwalk.runonsave](https://marketplace.visualstudio.com/items?itemName=emeraldwalk.RunOnSave)
and add to `.vscode/settings.json`:

```json
{
  "emeraldwalk.runonsave": {
    "commands": [
      {
        "match": "\\.fbs$",
        "cmd": "npx flatbuffers-format --write ${file}"
      }
    ]
  }
}
```

**Neovim** — drop in an autocmd:

```lua
vim.api.nvim_create_autocmd("BufWritePost", {
  pattern = "*.fbs",
  callback = function(args)
    vim.fn.jobstart({ "npx", "flatbuffers-format", "--write", args.file })
  end,
})
```

**Pre-commit hook** (with [lint-staged](https://github.com/lint-staged/lint-staged)):

```json
{
  "lint-staged": {
    "*.fbs": "flatbuffers-format --write"
  }
}
```

**GitHub Actions** — fail the build on unformatted `.fbs`:

```yaml
- run: npx flatbuffers-format --check .
```

### Browser

A hosted playground is available at
<https://emindeniz99.github.io/playground/playground/> — paste a schema
and watch it format live, no install needed.

To run the same page locally: `src/index.ts` and the generated parser
only depend on `antlr4ng`, which ships an ES-module build. After
`npm run build`, serve the project root statically and open
`web/index.html`:

```bash
npx http-server -p 8080 .
# then open http://localhost:8080/web/
```

The page resolves the `antlr4ng` bare specifier via an import map
pointing at `node_modules/antlr4ng/dist/index.mjs`. If you bundle for
production with esbuild / Rollup / Vite, the bare specifier resolves
normally and no import map is needed.

You can also embed the formatter in your own page:

```html
<script type="module">
  import { format } from "flatbuffers-format";
  document.getElementById("out").textContent = format(src);
</script>
```

## API

```ts
import { format, check, FormatError } from "flatbuffers-format";

format(source: string, opts?: FormatOptions): string
check(source: string, opts?: FormatOptions): boolean   // true if already formatted

type FormatOptions = {
  indent?: number;        // default 2
  newline?: "\n" | "\r\n"; // default "\n"
};
```

Both `format` and `check` throw `FormatError` (with `.line` and
`.column`) on invalid input.

## Performance

Measured against the 24-file test corpus (22.6 kB total) on a modern Linux
laptop; reproduce with `node scripts/bench.mjs` after `npm run build`.

| | Measurement |
|---|---|
| In-process throughput | **3,164 files/sec**, ~316 µs/file |
| Cold-start CLI (single small file, includes Node startup) | **~164 ms** median, ~155 ms min |
| Browser bundle (`esbuild --bundle --minify`, includes `antlr4ng` runtime) | **234 kB** min · **58 kB** min+gz |

What this means in practice:

- **Pre-commit hook** on a repo with a few `.fbs` files: cost is dominated by
  Node startup; you're paying ~160 ms regardless of file count. Once warm in a
  watcher process, formatting a typical schema is sub-millisecond.
- **CI `--check`** gate: a 100-file `.fbs` repo formats in well under a second
  of wall-clock plus Node startup. Cheap to wire into every PR.
- **Browser usage**: 58 kB gzipped includes the entire ANTLR4 runtime. The
  hand-rolled sibling (kept in this repo as a differential oracle, not
  published) bundles to ~4 kB gzip if you ever need a lighter alternative —
  see [`docs/grammar-comparison.md`](docs/grammar-comparison.md).

## Formatting rules

| Construct | Rule |
|---|---|
| Top-level | One blank line between block declarations (table/struct/enum/union/rpc_service). Single statements collapse together. |
| Fields | `name:Type` (no space before colon, one space after type). Defaults: ` = value`. Metadata: ` (key, key: value)`. Trailing `;`. |
| Enum values | One per line, comma-separated, no trailing comma. |
| Union variants | Same as enum values. Aliases written as `Alias: Type`. |
| Metadata | Always inline: `(deprecated, key: "x")`. |
| Comments | `//`, `///`, `/* */` all preserved. Doc comments stay attached to the following declaration; trailing comments stay on their owning line. |
| Indent | 2 spaces (configurable). |
| Newlines | LF, single trailing newline at EOF. |

## Standards conformance

The canonical FlatBuffers grammar is the EBNF at
[flatbuffers.dev/flatbuffers_grammar.html](https://flatbuffers.dev/flatbuffers_grammar.html).
This project's `grammar/FlatBuffers.g4` is an ANTLR4 encoding of that
EBNF, kept declaratively close to the upstream spec — the file is the
auditable source of truth, not the TypeScript that consumes it.

A sibling implementation (hand-rolled recursive-descent parser, no
runtime deps) lives at
[`../flatbuffers-formatter-handrolled`](../flatbuffers-formatter-handrolled) in the same
monorepo. Both formatters are **differential-tested**: every file in
`test/corpus/` must produce byte-identical output from both engines, on
every commit, via `bash test/crosscheck.sh` — currently **23/23 pass**.
That cross-check runs in `prepublishOnly` before any release, so a
grammar bug in either implementation cannot ship.

### Validating the corpus against `flatc`

A second, *independent* check verifies that the corpus is built out of
real FlatBuffers schemas — not just schemas our two parsers happen to
agree on. Every `test/corpus/*.fbs` file is fed to Google's official
[`flatc`](https://github.com/google/flatbuffers) compiler via:

```bash
npm run test:flatc-conform
```

The script (`scripts/flatc-conform.sh`) runs
`flatc -b --schema --no-warnings` on each corpus file and reports a
pass/fail summary. It is **deliberately not** part of `prepublishOnly`,
because `flatc` is a *system* dependency (installed via
`apt-get install flatbuffers-compiler`, `brew install flatbuffers`,
etc.), not an npm one — wiring it into the publish chain would break
maintainer machines that don't have it. The script skips with a clear
warning (exit 0) when `flatc` isn't on PATH, so it stays friendly to
fresh checkouts.

The grammar is kept up to date with the **latest** flatc release
(currently 25.12.x), which adds syntax not present in the Ubuntu/Debian
apt package (still flatc 2.0.8 as of writing). Fixtures that exercise
post-2.0.8 features — per-enum-value metadata, the `(offset64)` /
`(vector64)` field attributes, and union with explicit underlying type
(`union W : uint8 { … }`) — carry a `MIN_FLATC_MAJOR` entry in the
conformance script, so contributors on older flatc see a clear
`SKIP — needs flatc >= 23.x` message and the script still exits 0. To
test against the dialect this formatter targets, install flatc from
source or grab a prebuilt binary from
[`google/flatbuffers/releases`](https://github.com/google/flatbuffers/releases).

This check is intentionally stricter than the formatter's own parser:
flatc applies semantic rules (root-type required for object literals,
attributes must be declared before use, fixed vector nesting, etc.) on
top of the grammar. Files that pass the grammar but fail flatc are
flagged for human review — they may be genuine formatter-edge-case
schemas (which is fine), or they may indicate the corpus has drifted
from real-world FlatBuffers (which is not).

## Build from source

```bash
git clone https://github.com/emindeniz99/playground.git
cd playground/projects/flatbuffers-formatter
npm install
npm run build          # antlr-ng codegen → tsc
node dist/src/cli.js examples/sample.fbs
```

## Tests

```bash
npm test               # local suite (14 tests)
npm run test:crosscheck # differential check vs hand-rolled sibling
```

Both suites use the built-in `node --test` runner — no extra test deps.

## Releases

Releases are automated via [release-please](https://github.com/googleapis/release-please). The CHANGELOG is generated from Conventional Commits on `main`.

## Notes / learnings

- `antlr-ng` is a pure-TypeScript reimplementation of the ANTLR tool;
  generated parsers use the `antlr4ng` runtime, which is the active
  TypeScript successor to the dormant `antlr4ts`. The whole pipeline
  is JS — no JVM, no `*.jar`, nothing to install beyond `npm`.
- ANTLR routes whitespace and comments to a hidden channel. Recovering
  them is straightforward but **deduping is tricky**: a trailing comment
  after `;` is also a leading hidden token of the next declaration. If
  you don't filter, comments get emitted twice. Fix in `src/trivia.ts`:
  only treat hidden tokens *before the first newline* as already-claimed
  by the previous node.
- ANTLR's `INT_LITERAL` / `FLOAT_LITERAL` tokens are scoped per lexer
  rule, so you can't easily share a single `NUMBER` rule between them.
  Keeping them separate matches `flatc`'s lexer and makes the parser
  rules read more naturally (`('+' | '-')? INT_LITERAL`).
- The grammar uses inline string literals (`'table'`, `'struct'`, `':'`,
  …) so ANTLR generates anonymous `T__0`, `T__1`, … tokens. That's fine
  for parsing but means the generated `.tokens` file isn't
  human-readable — a named lexer pass (`TABLE: 'table';`) would be the
  polished move if you ever need cross-language reuse via the `.g4`.
