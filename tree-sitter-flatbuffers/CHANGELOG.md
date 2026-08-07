# Changelog

All notable changes to `tree-sitter-flatbuffers` are documented in
this file. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **First published release: `0.1.0`.** This package was developed inside a
> monorepo beforehand, so notes generated from that history — including
> "breaking changes" between internal package names — describe
> pre-publication development. Nothing installed from the registry needs
> to migrate for them.

## [0.1.1](https://github.com/emindeniz99/flatbuffers-format/compare/tree-sitter-flatbuffers-v0.1.0...tree-sitter-flatbuffers-v0.1.1) (2026-08-07)


### Bug Fixes

* **flatbuffers:** make the family publish-ready before it graduates ([d7379d4](https://github.com/emindeniz99/flatbuffers-format/commit/d7379d4eae51c36d0dd98c44cf4f96c5b19ba137))

## [0.1.0] - 2026-08-07

- Tree-sitter grammar for FlatBuffers (`.fbs`) schema files.
- Accepts the same dialect as `flatbuffers-format` 0.1.0:
  per-enum-value metadata, union with explicit underlying type, C99
  hex floats, bare `inf`/`nan` literals, namespace re-opening,
  fixed-size arrays `[T:N]`, `native_include`, end-of-file object
  literals, keyword-as-field-name.
- Ships `queries/highlights.scm`, `queries/injections.scm`, and
  `queries/tags.scm` for editor + ctags consumers.
- 9 corpus tests in `test/corpus/basic.txt` and a round-trip script
  asserting zero `ERROR` nodes across the 24-file
  `flatbuffers-format` corpus.

<!-- Future entries below this line are managed by release-please. -->
