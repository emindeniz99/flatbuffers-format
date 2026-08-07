# tree-sitter-flatbuffers

Tree-sitter grammar for FlatBuffers (`.fbs`) schema files. Pair with any
tree-sitter consumer for instant syntax highlighting and incremental,
error-tolerant parsing — Neovim's nvim-treesitter, Helix, Zed, and any
other editor that has a tree-sitter integration.

## Install

```bash
npm i -D tree-sitter-flatbuffers tree-sitter
```

`tree-sitter` is the runtime; this package supplies the grammar +
generated parser. Most editor consumers pick the grammar up via the
tree-sitter CLI directly and never `require()` the JS binding — install
order doesn't matter.

## Editor integration

### Neovim — nvim-treesitter

Until this grammar lands in [nvim-treesitter's official parser
list](https://github.com/nvim-treesitter/nvim-treesitter), wire it in
manually. In your Neovim config:

```lua
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
parser_config.flatbuffers = {
  install_info = {
    url = "https://github.com/emindeniz99/flatbuffers-format", -- or your fork
    branch = "main",
    location = "tree-sitter-flatbuffers",
    files = { "src/parser.c" },
  },
  filetype = "fbs",
}

vim.filetype.add({ extension = { fbs = "flatbuffers" } })
```

Then `:TSInstall flatbuffers` and `:TSEnable highlight`.

### Helix

In your `languages.toml`:

```toml
[[language]]
name = "flatbuffers"
scope = "source.fbs"
file-types = ["fbs"]
comment-tokens = ["//", "///"]
indent = { tab-width = 2, unit = "  " }
roots = []

[[grammar]]
name = "flatbuffers"
source = { git = "https://github.com/emindeniz99/flatbuffers-format", subpath = "tree-sitter-flatbuffers" }
```

Then `hx --grammar fetch && hx --grammar build`. Drop the
[`queries/highlights.scm`](./queries/highlights.scm) file into
`runtime/queries/flatbuffers/` (Helix follows tree-sitter's standard
query layout).

### Zed

Add a language extension entry pointing at the grammar:

```toml
# extension.toml
[grammars.flatbuffers]
repository = "https://github.com/emindeniz99/flatbuffers-format"
commit = "<pin a commit SHA here>"
path = "tree-sitter-flatbuffers"

[languages.flatbuffers]
name = "FlatBuffers"
grammar = "flatbuffers"
path_suffixes = ["fbs"]
line_comments = ["// ", "/// "]
```

### GitHub.com syntax highlighting

GitHub uses [`github-linguist`](https://github.com/github-linguist/linguist)
+ tree-sitter for code highlighting. Adding a new language requires a
PR to `linguist` listing this repo as the grammar source. Steps,
roughly:

1. Open a PR adding `FlatBuffers` to `lib/linguist/languages.yml` with
   `tm_scope: source.fbs` and `extensions: [.fbs]`.
2. Open a parallel PR to `github-linguist/linguist` upgrading the
   tree-sitter parser bundle to include this grammar.

That work is upstream and not tracked here.

## How this relates to `flatbuffers-format`

This grammar and the [`flatbuffers-format`](../flatbuffers-formatter/)
ANTLR4 grammar both implement the same FlatBuffers schema dialect — the
EBNF on [flatbuffers.dev](https://flatbuffers.dev/flatbuffers_grammar.html)
plus a few extras `flatc` accepts in practice (per-enum-value metadata,
union with explicit underlying type, C99 hex floats, bare `inf`/`nan`,
namespace re-opening, fixed-size arrays, `native_include`, end-of-file
object literals, keyword-as-field-name).

They serve different consumers:

| Use this when…                              | Pick…                       |
|---------------------------------------------|-----------------------------|
| You want syntax highlighting in your editor | `tree-sitter-flatbuffers`   |
| You want canonical formatting / `flatc` shape validation | [`flatbuffers-format`](../flatbuffers-formatter/) |
| You use Prettier and want `.fbs` formatted alongside everything else | [`prettier-plugin-flatbuffers`](../prettier-plugin-flatbuffers/) |

The tree-sitter grammar is optimised for editor consumption:
incremental, partial-parse-tolerant, error-recovering. The ANTLR
grammar drives validation and formatting where strict acceptance
matters.

For the EBNF surface itself, the formatter project is the audit trail
— see its `docs/grammar-comparison.md` and `docs/ebnf-conformance.md`.

## Development

```bash
npm install
npm run generate   # tree-sitter generate src/parser.c from grammar.js
npm test           # corpus tests + round-trip against formatter corpus
```

The test suite has two layers:

1. **`tree-sitter test`** — the [`test/corpus/basic.txt`](./test/corpus/basic.txt)
   file with 9 expected-sexp pairs covering the headline features.
2. **`scripts/parse-corpus.mjs`** — parses every `.fbs` file under
   `../flatbuffers-formatter/test/corpus/` and asserts zero `ERROR` /
   `MISSING` nodes. This is the "real schemas don't break" check; the
   formatter's 24-file corpus is the source of truth for what
   FlatBuffers syntax we have to accept.

`src/parser.c` (the generated C parser, ~hundred KB) is committed.
That's the standard practice for tree-sitter grammar repos — consumers
without the tree-sitter CLI installed need it pre-built.

## Releases

Releases are automated via [release-please](https://github.com/googleapis/release-please).
Land a Conventional Commit on `main` → a release PR appears → merging
it tags and publishes.

## License

MIT. See [LICENSE](./LICENSE).
