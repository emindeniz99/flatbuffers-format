# prettier-plugin-flatbuffers

If you use Prettier, this plugin gives you canonical FlatBuffers schema
formatting with no extra commands. It's a thin shim over
[`flatbuffers-format`](../flatbuffers-formatter/) — same output, same
guarantees, just Prettier-routed. Install it, add it to your
`.prettierrc`, and `.fbs` files start formatting alongside everything
else your editor already touches.

## Install

```bash
npm i -D prettier prettier-plugin-flatbuffers flatbuffers-format
```

`flatbuffers-format` is a regular runtime dependency, so npm will pull
it in for you — the third entry above is just for clarity in your
`package.json`.

## Activate

`.prettierrc`:

```json
{
  "plugins": ["prettier-plugin-flatbuffers"]
}
```

That's it. Any `.fbs` file Prettier sees from then on is formatted by
this plugin.

```bash
npx prettier --write 'src/**/*.fbs'
```

Editor integrations (VS Code, Neovim, etc.) pick up the plugin
automatically as long as Prettier itself does.

## Behavior

If a `.flatbuffers-format.json` applies to the file (the nearest one in
its directory or any parent), the plugin uses it and ignores Prettier's
options below, so Prettier formats exactly as the `flatbuffers-format`
CLI and the other editor plugins do. See the
[config file docs](../flatbuffers-formatter/README.md#config-file).

Without one, the plugin maps Prettier's options to `flatbuffers-format`'s
`FormatOptions`:

| Prettier option            | Effect                                                                          |
|----------------------------|---------------------------------------------------------------------------------|
| `tabWidth` (default `2`)   | Forwarded as the engine's `indent` (count of indent characters per level).      |
| `useTabs` (default `false`)| One tab per indent level, as in Prettier; `tabWidth` then only sets how wide a tab looks in your editor. |
| `printWidth` (default `80`)| Forwarded as the engine's `lineWidth`. Drives the "does it fit on one line" decision for small enums/unions/single-field bodies and for line-comment wrapping. |
| `trailingComma` (default `"all"`) | `"all"` and `"es5"` put a comma after the last value of an expanded enum or union; `"none"` leaves it off. |
| `bracketSpacing` (default `true`) | `{ A, B }` or `{A, B}` for bodies on one line. |
| `objectWrap` (default `"preserve"`) | `"preserve"` keeps a body expanded when the source has a line break after its `{`; `"collapse"` puts every body that fits on one line. |
| `endOfLine`                | Handled by Prettier itself (`"lf"`, `"crlf"`, `"cr"`, `"auto"`). The engine always emits `\n`; Prettier post-processes the output to the requested line ending. |
| `requirePragma`, `checkIgnorePragma`, `insertPragma` | Work as in Prettier: the pragmas are `@format` / `@prettier` and `@noformat` / `@noprettier` in a comment at the top of the file. |

A `.flatbuffers-format.json` with `requirePragma: true` should not be
combined with Prettier's `insertPragma: true`. Prettier inserts the
pragma before the plugin can read the config file, so every file gets
formatted. Set `requirePragma` in Prettier's own config instead, or
drop `insertPragma`.

`// prettier-ignore` above a declaration keeps it as written. Other
Prettier options (`singleQuote`, `semi`, …) are ignored, as `.fbs` has
no syntax for them.

## How it works

Prettier 3 plugins normally define a `parse` function that builds an
AST and a `print` function that turns it back into a `Doc` tree.
That's the right shape when the formatter is *of* Prettier, not just
plugged into it. Here, the canonical form is defined entirely by
`flatbuffers-format`, so we use Prettier's `preprocess` hook to run
`format()` on the source. The text Prettier's printer receives is
already canonical; the printer just returns it verbatim. No AST
round-tripping, no risk of drift between the engine and a duplicated
Prettier-side implementation.

For everything about the formatting rules themselves (idempotency
guarantees, what's preserved, what's normalized, comment handling, the
cookbook of before/after examples) see the
[`flatbuffers-format` README](../flatbuffers-formatter/README.md).

## Development setup

Inside the monorepo, the `flatbuffers-format` dependency is wired to
the sibling project via a relative `file:` install:

```json
"dependencies": {
  "flatbuffers-format": "file:../flatbuffers-formatter"
}
```

That means the sibling must be built first:

```bash
cd flatbuffers-formatter && npm ci && npm run build
cd ../prettier-plugin-flatbuffers && npm ci && npm run build && npm test
```

When this plugin is published to npm, the `file:` reference will be
swapped for a pinned `^0.1` range against the published
`flatbuffers-format` package.

## Releases

Releases are automated via [release-please](https://github.com/googleapis/release-please).
Land a Conventional Commit on `main` → a release PR appears → merging
it tags and publishes.

## License

MIT. See [LICENSE](./LICENSE).
