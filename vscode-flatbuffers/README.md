# FlatBuffers — VS Code extension

Syntax highlighting and format-on-save for FlatBuffers (`.fbs`) schema
files. The format provider delegates to the
[`flatbuffers-format`](https://www.npmjs.com/package/flatbuffers-format)
engine — same opinionated rules, same byte-stable output, no extra
commands to learn.

## Install

In VS Code: search the marketplace for **FlatBuffers** and install.

Or from the command line:

```bash
code --install-extension emindeniz99.vscode-flatbuffers
```

## Use

Open any `.fbs` file. Highlighting is automatic.

To format on save, add to your settings:

```json
{
  "[flatbuffers]": {
    "editor.defaultFormatter": "emindeniz99.vscode-flatbuffers",
    "editor.formatOnSave": true
  }
}
```

Or invoke "Format Document" (Shift+Alt+F) anytime.

## Configuration

| Setting | Default | What it does |
|---|---|---|
| `flatbuffers.format.indent` | `2` | Indent count per level. With `useTabs`, this is the number of tabs per level. Falls back to `editor.tabSize` if unset. |
| `flatbuffers.format.useTabs` | `false` | Use literal tab characters for indentation instead of spaces. |
| `flatbuffers.format.lineWidth` | `80` | Target column for compact/wrap decisions. Drives the engine's `lineWidth` option. |
| `flatbuffers.format.compactSingleLine` | `true` | Collapse small enum/union/single-field bodies onto one line when they fit in `lineWidth`. |
| `flatbuffers.format.maxBlankLines` | `1` | Maximum consecutive blank lines preserved between top-level declarations. |
| `flatbuffers.format.wrapComments` | `false` | Reflow long line comments at whitespace boundaries. Block comments and doc comments are left untouched. |
| `flatbuffers.format.commentWidth` | `80` | Wrap column for `wrapComments`. Defaults to `lineWidth` when unset. |

For details on what each option does, see the
[`flatbuffers-format` README](https://www.npmjs.com/package/flatbuffers-format#api).

## How it relates to `flatbuffers-format`

The format provider is a thin shim:

```
VS Code "Format Document"
        │
        ▼
DocumentFormattingEditProvider
        │
        ▼
flatbuffers-format → format(text, { indent })
        │
        ▼
TextEdit replacing the whole document
```

Errors from the formatter (parse failures with line:col) surface as
notifications. The extension does not re-implement formatting itself
— upstream `flatbuffers-format` releases land here automatically when
the bundled dependency is bumped.

## Development

```bash
git clone https://github.com/emindeniz99/playground.git
cd playground/projects/vscode-flatbuffers
npm ci --no-audit --no-fund
npm run build
npm test
```

The bundled `flatbuffers-format` is referenced via
`file:../flatbuffers-formatter` while both projects live in this
monorepo. `npm run package` builds a `.vsix` for sideload testing;
`npm run publish` requires a `vsce` publisher token.

See the repo-wide [CONTRIBUTING guide](../../CONTRIBUTING.md) for
commit conventions and the four-layer test surface for the formatter
itself.

## Releases

Releases are automated via [release-please](https://github.com/googleapis/release-please).
Land a Conventional Commit on `main` → a release PR appears → merging
it tags, publishes to the VS Code Marketplace, and attempts an Open
VSX publish (best-effort).

## License

MIT — see [LICENSE](LICENSE).
