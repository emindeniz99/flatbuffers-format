# Changelog

All notable changes to the `FlatBuffers` VS Code extension are documented here.
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — initial release

First release of the FlatBuffers VS Code extension.

### Highlights

- **Syntax highlighting** for `.fbs` files via a TextMate grammar
  covering: keywords, built-in types, doc / line / block comments,
  string and numeric literals (including C99-style hex floats and
  `inf`/`nan`), metadata attributes, identifiers, and punctuation.
- **Format-on-save and "Format Document"** delegate to the
  [`flatbuffers-format`](https://www.npmjs.com/package/flatbuffers-format)
  engine.
- **Configuration**: a single setting,
  `flatbuffers.format.indent` (default `2`), forwarded to the engine.
- Language ID `flatbuffers`, file extension `.fbs`.
- No editor restart required — activation event is `onLanguage:flatbuffers`.

<!-- Future entries below this line are managed by release-please. -->
