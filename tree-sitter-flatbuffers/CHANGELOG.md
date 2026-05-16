# Changelog

All notable changes to `tree-sitter-flatbuffers` are documented in
this file. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — initial release

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
