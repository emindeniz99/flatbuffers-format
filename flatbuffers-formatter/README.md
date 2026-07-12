# flatbuffers-format

**The opinionated, zero-config formatter for FlatBuffers (`.fbs`) schemas — fast, byte-stable, type-safe, runs anywhere.**

[![npm](https://img.shields.io/npm/v/flatbuffers-format.svg)](https://www.npmjs.com/package/flatbuffers-format)
[![CI](https://github.com/emindeniz99/playground/actions/workflows/flatbuffers-ci.yml/badge.svg?branch=main)](https://github.com/emindeniz99/playground/actions/workflows/flatbuffers-ci.yml)
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

- [Why](#why)
- [What it does](#what-it-does)
- [CLI](#cli)
- [Install](#install)
- [Editor integration](#editor-integration)
- [API](#api)
- [Performance](#performance)
- [Formatting rules](#formatting-rules)
- [Standards conformance](#standards-conformance)
- [Build from source](#build-from-source)
- [Tests](#tests)
- [Releases](#releases)
- [Compatibility](#compatibility)
- [Versioning policy](#versioning-policy)
- [Roadmap](#roadmap)
- [Architecture](#architecture)
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
| `--indent <n>` | Spaces (or tabs, with `--use-tabs`) per indent level (default: 2) |
| `--use-tabs` | Indent with tab characters instead of spaces |
| `--line-width <n>` | Target column for compact/wrap decisions (default: 80) |
| `--no-compact-single-line` | Disable single-line collapsing of small enum/union/single-field bodies |
| `--max-blank-lines <n>` | Max consecutive blank lines kept between decls (default: 1) |
| `--wrap-comments` | Reflow long line comments at whitespace |
| `--comment-width <n>` | Wrap column for `--wrap-comments` (defaults to `--line-width`) |
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

### Native binary (no Node required)

Prebuilt single-file binaries are attached to every GitHub Release
(starting with `flatbuffers-format@0.1.0`). Drop one on `PATH` and run
— the embedded Node 22 runtime is byte-glued in via [Node SEA][node-sea],
so consumers don't need to install Node or npm:

[node-sea]: https://nodejs.org/api/single-executable-applications.html

| Platform     | Asset filename                          |
|--------------|------------------------------------------|
| Linux x64    | `flatbuffers-format-linux-x64`           |
| Linux arm64  | `flatbuffers-format-linux-arm64`         |
| macOS x64    | `flatbuffers-format-macos-x64`           |
| macOS arm64  | `flatbuffers-format-macos-arm64`         |
| Windows x64  | `flatbuffers-format-windows-x64.exe`     |

```bash
curl -fsSL -o flatbuffers-format \
  https://github.com/emindeniz99/playground/releases/latest/download/flatbuffers-format-linux-x64
chmod +x flatbuffers-format
./flatbuffers-format --version
```

The binaries are produced by `.github/workflows/flatbuffers-native-binaries.yml`
using `scripts/build-native.mjs`; run that script locally to build the
binary for your own machine (`npm run build:native`). The macOS
binaries carry an ad-hoc signature only — Gatekeeper will quarantine
the file on first download until you approve it via Right-click →
Open in Finder, or `xattr -dr com.apple.quarantine ./flatbuffers-format`.

### WebAssembly (runs anywhere with WASI)

A portable `flatbuffers-format.wasm` is attached to every GitHub
Release. Hand it to any WASI-compatible runtime — `wasmtime`,
`wasmer`, `wazero` (Go), `wasmtime-py`, etc. — and it reads `.fbs` on
stdin, writes formatted output on stdout. No Node, no npm, no
language-specific bindings.

```bash
curl -fsSL -o flatbuffers-format.wasm \
  https://github.com/emindeniz99/playground/releases/latest/download/flatbuffers-format.wasm
wasmtime flatbuffers-format.wasm < schema.fbs > schema.formatted.fbs
```

Use cases: embedding the formatter from non-Node hosts (Rust/Go/Python
build tools), running in sandboxed serverless environments
(Cloudflare Workers Pages, Vercel Edge), or shipping a
reproducible-by-hash formatter in tooling pipelines. The .wasm is built
by [`.github/workflows/flatbuffers-wasm-binary.yml`](../../.github/workflows/flatbuffers-wasm-binary.yml)
using [Javy](https://github.com/bytecodealliance/javy)
(QuickJS-compiled-to-WASM) from
[`scripts/build-wasm.mjs`](scripts/build-wasm.mjs); reproduce locally
with `npm run build:wasm` (requires `javy` on `PATH`).

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
and watch it format live, no install needed. The page also ships a
curated set of corpus fixtures behind a *load example* dropdown, a
*share* button (encodes the current input into the URL fragment, copies
the link to the clipboard) and a *copy* button on the output pane.

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
  indent?: number;             // default 2
  useTabs?: boolean;           // default false — tab char instead of spaces
  newline?: "\n" | "\r\n";     // default "\n"
  lineWidth?: number;          // default 80 — used by compactSingleLine and wrapComments
  compactSingleLine?: boolean; // default true — collapse small enum/union/single-field bodies
  maxBlankLines?: number;      // default 1 — cap on consecutive blank lines between decls
  wrapComments?: boolean;      // default false — reflow long line comments
  commentWidth?: number;       // default = lineWidth — wrap column for wrapComments
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

### Regression gate

Every PR runs `scripts/bench-compare.mjs` against
[`scripts/bench-baseline.json`](scripts/bench-baseline.json) and fails if
throughput regresses by more than 25% (in-process µs/file), cold-start
median by more than 30%, or bundle min+gz by more than 15%. The comparison
posts a Markdown table to the PR for visibility. To accept slower numbers
legitimately, re-baseline locally
(`npm run bench -- --json --repeat 3 > scripts/bench-baseline.json`) and
commit the new baseline in the same PR.

## Formatting rules

| Construct | Rule | Configurable? |
|---|---|---|
| Top-level | One blank line between block declarations (table/struct/enum/union/rpc_service). Single statements collapse together. | `maxBlankLines` (default 1) |
| Fields | `name:Type` (no space before colon, one space after type). Defaults: ` = value`. Metadata: ` (key, key: value)`. Trailing `;`. | fixed by design |
| Enum/union/single-field bodies | Collapse to one line if the result fits in `lineWidth`; expand otherwise. Doc/block comments and per-value metadata force expansion. | `compactSingleLine` (default on), `lineWidth` (default 80) |
| Enum values | One per line (when expanded), comma-separated, no trailing comma. | fixed by design |
| Union variants | Same as enum values. Aliases written as `Alias: Type`. | fixed by design |
| Metadata | Always inline: `(deprecated, key: "x")`. | fixed by design |
| Comments | `//`, `///`, `/* */` all preserved. Doc comments stay attached to the following declaration; trailing comments stay on their owning line. Long `//` lines optionally reflowed. | `wrapComments` (default off), `commentWidth` (default = lineWidth) |
| Indent | 2 spaces. | `indent` (count), `useTabs` (char) |
| Newlines | LF, single trailing newline at EOF. | `newline` |

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

## Compatibility

| Runtime | Status | Notes |
|---|---|---|
| **Node.js 20.x** | ✅ supported | Minimum supported version (`engines.node: ">=20"`). |
| **Node.js 22.x** | ✅ supported | CI matrix runs against both 20 and 22. |
| **Node.js 24.x** | ✅ expected to work | Not in CI yet; the package uses only stable Node APIs. |
| **Modern browsers** | ✅ supported | ESM-only. The core (`src/index.ts`) has zero Node imports; the CLI is the only Node-only entry. |
| **Bun** | ✅ supported | Installs from npm via `bun add flatbuffers-format`; the ESM entry resolves natively. |
| **Deno** | ✅ supported | Installs from npm via `npm:flatbuffers-format` or `deno add npm:flatbuffers-format`. |
| **Cloudflare Workers** | ✅ supported | ESM + zero Node imports in the core. |
| **OS** | ✅ Linux / macOS / Windows | All three covered in CI (Node 20 + 22 × ubuntu + macos + windows). |

## Versioning policy

Standard [semver](https://semver.org). Before `1.0`, the API surface is
*experimental*: minor versions may include small breaking changes
(noted in `CHANGELOG.md` and the release notes).

The "public API" — the surface where the semver promise applies once we
reach `1.0` — is exactly the named exports of
[`src/index.ts`](src/index.ts) (`format`, `check`, `FormatError`,
`FormatOptions`) and the CLI's documented flags. Everything else
(internal printer/lexer/parser classes, the generated parser, the
trivia helpers, the `scripts/` directory) is implementation detail
and may change in any release.

## Roadmap

No firm dates; this is a side project. The order below reflects what's
likely to land next, not a commitment.

**0.1.x (current)** — bugfixes, more corpus fixtures as real-world
schemas surface in the wild, minor CLI ergonomics polish. No breaking
changes.

**Landed during 0.1.x**:

- ✅ Sibling [`prettier-plugin-flatbuffers`](../prettier-plugin-flatbuffers/) — drop into `.prettierrc` and `.fbs` files format alongside the rest of your codebase
- ✅ Sibling [`vscode-flatbuffers`](../vscode-flatbuffers/) — TextMate syntax highlighting + native format-on-save via this engine, no third-party "Run on Save" needed
- ✅ Sibling [`tree-sitter-flatbuffers`](../tree-sitter-flatbuffers/) — incremental-parse + highlights for Neovim, Helix, Zed, GitHub.com, and any tree-sitter consumer

**0.2.x** — under consideration:

- Performance: experiment with parallel parsing for multi-file `--write` / `--check` runs
- Real-world conformance: a curated list of public `.fbs` schemas fetched at CI time and validated against the formatter
- A `--validate` mode that pipes through `flatc` (when installed) for semantic-layer checks beyond the grammar

**1.0** — when:

- The 0.x API has been stable for two consecutive minors without changes
- The public-API surface has had time to attract real-world feedback
- A documented [`docs/migrating-to-1.0.md`](docs/migrating-to-1.0.md) exists for any breaking changes between the last 0.x and 1.0

Contributions targeting any roadmap item are welcome — open an issue
first so we can discuss design before you spend time on a PR.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for a tour of how
the parts fit together — lexer → ANTLR parser → printer, plus the
trivia-attachment pipeline that makes comments round-trip cleanly.

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
