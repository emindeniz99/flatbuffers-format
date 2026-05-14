# flatbuffers-format

[![npm](https://img.shields.io/npm/v/flatbuffers-format.svg)](https://www.npmjs.com/package/flatbuffers-format)

Opinionated formatter for [FlatBuffers](https://flatbuffers.dev) schema files
(`.fbs`). Built on an **ANTLR4 grammar** and the pure-TypeScript
[`antlr4ng`](https://github.com/mike-lischke/antlr4ng) runtime — no JVM
required, no codegen at install time. Runs in Node and the browser.
Ships a CLI.

```bash
# Format a single file (prints to stdout)
npx flatbuffers-format schema.fbs

# Fix a tree in place — recurses; skips node_modules / .git / dist
npx flatbuffers-format --write src/

# Use as a CI check
npx flatbuffers-format --check src/
```

## What it does

- A canonical FlatBuffers schema grammar lives in
  [`grammar/FlatBuffers.fbs`](grammar/FlatBuffers.g4) (~155 lines of
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
| `-c`, `--check` | Check formatting; exit 1 on diff |
| `--indent <n>` | Spaces per indent level (default: 2) |
| `--no-gitignore` | Don't consult `.gitignore` when walking directories |
| `-h`, `--help` | Show help |

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

`src/index.ts` and the generated parser only depend on `antlr4ng`,
which ships an ES-module build. After `npm run build`, serve the
project root statically and open `web/index.html`:

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
[`../flatbuffers-formatter`](../flatbuffers-formatter) in the same
monorepo. Both formatters are **differential-tested**: every file in
`test/corpus/` must produce byte-identical output from both engines, on
every commit, via `bash test/crosscheck.sh` — currently **16/16 pass**.
That cross-check runs in `prepublishOnly` before any release, so a
grammar bug in either implementation cannot ship.

## Build from source

```bash
git clone https://github.com/emindeniz99/playground.git
cd playground/projects/flatbuffers-formatter-antlr
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
