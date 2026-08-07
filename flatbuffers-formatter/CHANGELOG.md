# Changelog

All notable changes to `flatbuffers-format` are documented in this file.
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

First public release of `flatbuffers-format`, an opinionated formatter
for FlatBuffers (`.fbs`) schema files.

### Highlights

- ANTLR4-grammar–driven parser, pure-TypeScript runtime
  ([`antlr4ng`](https://github.com/mike-lischke/antlr4ng)) — no JVM
  required, no codegen at install time.
- Runs in Node and the browser. Ships a CLI with `--write`, `--check`,
  stdin/stdout, and gitignore-aware directory walking.
- Tracks the **latest** flatc dialect (verified against flatc 25.12.19):
  per-enum-value metadata, union with explicit underlying type,
  `(offset64)` / `(vector64)` field attributes, and C99-style hex
  float literals all parse and round-trip.
- Differential-tested: a sibling hand-rolled recursive-descent parser
  (`flatbuffers-format-handrolled`, in-repo, not published) must produce
  byte-identical output on every corpus file. The check runs in
  `prepublishOnly`, so a grammar bug in either engine cannot ship.
- Independently validated by Google's official `flatc` compiler via
  the opt-in `npm run test:flatc-conform` script. Version-aware: clearly
  skips fixtures that need newer flatc than the contributor's system
  has.

### Grammar coverage at release

Every production in the upstream FlatBuffers EBNF
([flatbuffers.dev/grammar](https://flatbuffers.dev/grammar/)) is either
implemented directly or documented as a deliberate extension. The
row-by-row audit lives at [`docs/ebnf-conformance.md`](docs/ebnf-conformance.md);
the history of gap closures is in [`docs/grammar-comparison.md`](docs/grammar-comparison.md).

No known grammar gaps remain at release time.

### Known caveats

- This is a `0.1.x` release. The CLI flag set and the formatting rules
  are unlikely to change in a backwards-incompatible way, but until
  `1.0.0` the API and config surface should be considered experimental.
- `flatc` is *not* an installation dependency. The `test:flatc-conform`
  script is opt-in and skips cleanly if `flatc` isn't on PATH.

### Test surface at release

- 29 unit tests in `test/format.test.ts`
- 24 corpus fixtures in `test/corpus/`, byte-identical output through
  both engines (24/24 OK)
- 22/22 corpus fixtures accepted by the latest upstream flatc
  (2 skipped: intentional formatter edge cases)
- 19/19 corpus fixtures accepted by Ubuntu/Debian system flatc 2.0.8
  (5 skipped: 2 formatter edge cases + 3 fixtures that need flatc ≥ 23)

<!-- Future entries below this line are managed by release-please. -->
