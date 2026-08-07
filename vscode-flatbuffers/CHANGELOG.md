# Changelog

All notable changes to the `FlatBuffers` VS Code extension are documented here.
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Not yet listed on the marketplace.** This package was developed inside a
> monorepo beforehand, so notes generated from that history — including
> "breaking changes" between internal names — describe pre-publication
> development rather than migrations for an installed version.

## [0.1.2](https://github.com/emindeniz99/flatbuffers-format/compare/vscode-flatbuffers-v0.1.1...vscode-flatbuffers-v0.1.2) (2026-08-07)


### Bug Fixes

* **vscode:** make the extension actually packageable and loadable ([c74d712](https://github.com/emindeniz99/flatbuffers-format/commit/c74d712ddc302f2c5f4fbb07a91af036f05b001a))
* **vscode:** pin @types/vscode to the 1.94 line so packaging can't re-break ([2e75531](https://github.com/emindeniz99/flatbuffers-format/commit/2e755314b4dbd8e0bc1966174772968fcd42a5a3))

## [0.1.1](https://github.com/emindeniz99/flatbuffers-format/compare/vscode-flatbuffers-v0.1.0...vscode-flatbuffers-v0.1.1) (2026-08-07)


### Bug Fixes

* **flatbuffers:** make the family publish-ready before it graduates ([d7379d4](https://github.com/emindeniz99/flatbuffers-format/commit/d7379d4eae51c36d0dd98c44cf4f96c5b19ba137))

## [0.1.0] - Unreleased

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
