# flatbuffers-format

[![npm](https://img.shields.io/npm/v/flatbuffers-format.svg)](https://www.npmjs.com/package/flatbuffers-format)

Opinionated formatter for [FlatBuffers](https://flatbuffers.dev) schema files
(`.fbs`). Pure TypeScript, **zero runtime dependencies**, runs in Node and the
browser. Ships a CLI.

```bash
# Format a single file (prints to stdout)
npx flatbuffers-format schema.fbs

# Fix a tree in place — recurses; skips node_modules / .git / dist
npx flatbuffers-format --write src/

# Use as a CI check
npx flatbuffers-format --check src/
```

## What it does

- Lexes `.fbs` source into a token stream with attached trivia
  (comments, blank lines).
- Parses tokens into an AST via hand-rolled recursive descent.
- Pretty-prints the AST back to canonical, deterministic source.
- Preserves doc comments (`///`), line comments (`//`), block
  comments (`/* */`), and paragraph breaks between top-level
  declarations.
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

### A note on parser generators

The MIT 6.005 lecture on
[parser generators](https://web.mit.edu/6.005/www/fa15/classes/18-parser-generators/)
walks through the case for tools like ANTLR. They shine on big,
evolving grammars. FlatBuffers schema is small and stable enough
([grammar](https://flatbuffers.dev/flatbuffers_grammar.html)) that
hand-written recursive descent is a better fit here: no codegen step,
no runtime dependency, easy to keep comments and trivia attached to
the right AST nodes for a faithful pretty-printer. See the
[sibling project](../flatbuffers-formatter-antlr) for the
ANTLR-backed variant.

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

The core module (`src/index.ts`) has zero Node imports. After
`npm run build`, serve the project directory statically and open
`web/index.html`:

```bash
npx http-server -p 8080 .
# then open http://localhost:8080/web/
```

The page imports `../dist/index.js` directly as an ES module and
formats input live as you type.

You can also embed the formatter in your own page:

```html
<script type="module">
  import { format } from "./dist/index.js";
  document.getElementById("out").textContent = format(src);
</script>
```

## API

```ts
import { format, check, parse, print } from "flatbuffers-format";

format(source: string, opts?: FormatOptions): string
check(source: string, opts?: FormatOptions): boolean   // true if already formatted
parse(source: string): Schema
print(schema: Schema, opts?: FormatOptions): string

type FormatOptions = {
  indent?: number;        // default 2
  newline?: "\n" | "\r\n"; // default "\n"
};
```

`parse` throws `ParseError` on invalid input; `tokenize` throws
`LexError`. Both errors carry line/column info.

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

## Tests

```bash
npm test
```

Compiles tests + sources to `dist-test/` and runs them with the
built-in `node --test` runner — no extra test deps.

## Notes / learnings

- The grammar is small (~12 top-level keywords) so the parser fits in
  one file at ~400 lines. The trickiest part wasn't parsing, it was
  faithfully round-tripping trivia: line vs. doc vs. block comments,
  blank lines as paragraph separators, and "trailing" comments that
  must stay on the same line as the token they follow.
- We deliberately do **not** try to be `flatc`-compatible at the
  validator level — unknown attributes, weird default expressions,
  etc. parse fine, since the goal is to format what the user wrote,
  not police it.
- Object literals (the JSON-shaped form used in `flatc`'s
  text-to-binary mode) are supported, but pretty-printed multi-line
  rather than reformatted aggressively — the upstream parser is
  itself lenient there.
