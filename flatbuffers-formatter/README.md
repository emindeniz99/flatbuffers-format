# flatbuffers-formatter

A formatter for [FlatBuffers](https://flatbuffers.dev) schema files
(`.fbs`). Written in pure TypeScript — no runtime dependencies, no
Node-only APIs in the core, so the same module powers both the CLI
(`fbs-fmt`) and the in-browser playground.

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

### A note on parser generators

The MIT 6.005 lecture on
[parser generators](https://web.mit.edu/6.005/www/fa15/classes/18-parser-generators/)
walks through the case for tools like ANTLR. They shine on big,
evolving grammars. FlatBuffers schema is small and stable enough
([grammar](https://flatbuffers.dev/flatbuffers_grammar.html)) that
hand-written recursive descent is a better fit here: no codegen step,
no runtime dependency, easy to keep comments and trivia attached to
the right AST nodes for a faithful pretty-printer.

## How to run

```bash
cd projects/flatbuffers-formatter
npm install        # only installs typescript + @types/node (dev deps)
npm run build      # tsc → dist/

# format to stdout
node dist/cli.js examples/sample.fbs

# fix files in place (recurses into directories)
node dist/cli.js --write examples/

# check formatting in CI
node dist/cli.js --check examples/

# read from stdin
cat examples/sample.fbs | node dist/cli.js -

# custom indent
node dist/cli.js --indent 4 examples/sample.fbs
```

If you `npm link` (or publish) the package the CLI is exposed as
`fbs-fmt`:

```bash
fbs-fmt --write path/to/schemas/
fbs-fmt fix schema.fbs      # `fix` is an alias for --write
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
import { format, check, parse, print } from "flatbuffers-formatter";

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
