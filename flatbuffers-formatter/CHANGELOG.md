# Changelog

All notable changes to `flatbuffers-format` are documented in this file.
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **First published release: `0.1.0`.** This package was developed inside a
> monorepo beforehand, so notes generated from that history — including
> "breaking changes" between internal package names — describe
> pre-publication development. Nothing installed from the registry needs
> to migrate for them.

## [0.2.0](https://github.com/emindeniz99/flatbuffers-format/compare/flatbuffers-format-v0.1.0...flatbuffers-format-v0.2.0) (2026-08-07)


### ⚠ BREAKING CHANGES

* **flatbuffers-formatter:** With compactSingleLine: true (the new default), small enum/union and single-field table/struct bodies now collapse onto one line. Pass `compactSingleLine: false` (or `--no-compact-single-line` on the CLI) to restore the previous always-expanded output.
* **flatbuffers-formatter-antlr:** The CLI binary changes from `flatbuffers-format-antlr` to `flatbuffers-format`, and the package name changes accordingly. Users on the previous (unpublished, internal-only) name should reinstall under the new name. The previously published `flatbuffers-format` name is now backed by this implementation; the hand-rolled implementation remains in the repo as `flatbuffers-format-handrolled` (private).

### Features

* **flatbuffers-formatter-antlr:** add ANTLR-backed .fbs formatter sibling ([0164211](https://github.com/emindeniz99/flatbuffers-format/commit/0164211993ff5e224eae1cfd2062c4482d99c929))
* **flatbuffers-formatter-antlr:** claim the published flatbuffers-format name ([f1f4863](https://github.com/emindeniz99/flatbuffers-format/commit/f1f4863e5b083f276640c4ccefcf1a29ad0a0a47))
* **flatbuffers-formatter-antlr:** close grammar gaps and publish as flatbuffers-format-antlr ([1ddb48e](https://github.com/emindeniz99/flatbuffers-format/commit/1ddb48ebdbaea508d88b70ff1b7287175fd517c7))
* **flatbuffers-formatter-antlr:** respect .gitignore, parseArgs refactor, bump node floor ([4723af8](https://github.com/emindeniz99/flatbuffers-format/commit/4723af88c725d1f37ffce03557c3e25254062b4d))
* **flatbuffers-formatter:** add --version, --diff, and source-snippet error reports ([e87ce5c](https://github.com/emindeniz99/flatbuffers-format/commit/e87ce5ccaacfec774a27c3944312f1068499a396))
* **flatbuffers-formatter:** add .fbs schema formatter with CLI and browser playground ([60dfef3](https://github.com/emindeniz99/flatbuffers-format/commit/60dfef3b1e66403ae55b1834de98f908e6e88b12))
* **flatbuffers-formatter:** add comprehensive corpus + integration tests ([7be7845](https://github.com/emindeniz99/flatbuffers-format/commit/7be78458c1908480ff995c894187b06a2f90ec39))
* **flatbuffers-formatter:** add flatc-based corpus conformance check ([0b35fe4](https://github.com/emindeniz99/flatbuffers-format/commit/0b35fe4b90db14e037eb491c6ce49feaa3b237ab))
* **flatbuffers-formatter:** bench JSON output + baseline + comparison ([b3a154f](https://github.com/emindeniz99/flatbuffers-format/commit/b3a154fb1a2f27038e824fc6403ea690250dba6f))
* **flatbuffers-formatter:** close grammar gaps and publish as flatbuffers-format ([0308581](https://github.com/emindeniz99/flatbuffers-format/commit/0308581460cd163792e2f573a67a5e8cc366e715))
* **flatbuffers-formatter:** close hex-float literal gap + add CHANGELOG ([67e7e10](https://github.com/emindeniz99/flatbuffers-format/commit/67e7e103fe5111b57b866aa2d9a4a03884db7d26))
* **flatbuffers-formatter:** configurable layout (useTabs, lineWidth, compactSingleLine, maxBlankLines, wrapComments, commentWidth) ([555c4c9](https://github.com/emindeniz99/flatbuffers-format/commit/555c4c981d2dd1c3d8027eb0e2ce73e483d91e44))
* **flatbuffers-formatter:** native single-file binaries via Node SEA ([9be0e2a](https://github.com/emindeniz99/flatbuffers-format/commit/9be0e2ac1332e0fb191a481be68b78880ebd0eac))
* **flatbuffers-formatter:** respect .gitignore, parseArgs refactor, bump node floor ([d900e3d](https://github.com/emindeniz99/flatbuffers-format/commit/d900e3dc5f8abf0bdb0001ebf7dba34967ca6b65))
* **flatbuffers-formatter:** track latest flatc dialect (25.12.x) ([4ab4250](https://github.com/emindeniz99/flatbuffers-format/commit/4ab4250157bbd78a39f457d67f9b1f5f8131d0fe))
* **flatbuffers-formatter:** WASI .wasm build via Javy ([5d3f267](https://github.com/emindeniz99/flatbuffers-format/commit/5d3f267eb6bc06e39dca8d065d569484a9085dc8))
* **flatbuffers-formatter:** web playground load examples, share, copy ([aca49e5](https://github.com/emindeniz99/flatbuffers-format/commit/aca49e50523e7480cd219e777693b3a7b20d5b8c))
* **repo:** add GitHub Actions CI, dependabot, and publish dry-run workflow ([4585edf](https://github.com/emindeniz99/flatbuffers-format/commit/4585edf3cf95a721c56c2e3219a436b9ee7b414d))
* **repo:** add GitHub Pages workflow for live demo + TypeDoc API docs ([329c57e](https://github.com/emindeniz99/flatbuffers-format/commit/329c57e3bd9ecd591ea82f44270391bcfdb8a3df))
* **repo:** SHA256 sidecars + Apple notarization for native binaries ([dbbadd6](https://github.com/emindeniz99/flatbuffers-format/commit/dbbadd697b4bfb17ae062b0a1942420200097bbb))


### Bug Fixes

* **flatbuffers-formatter-antlr:** dedupe tail trivia, fix closing-brace position, add crosscheck ([3317f51](https://github.com/emindeniz99/flatbuffers-format/commit/3317f51e9abc7d9f56a48eba272cbb7196d754a0))
* **flatbuffers-formatter:** make existing corpus fixtures flatc-conformant ([8b78bc9](https://github.com/emindeniz99/flatbuffers-format/commit/8b78bc9e1d337437019c8b35546234c330b1718a))
* **flatbuffers-formatter:** preserve closing-brace and EOF trivia ([8d44ebc](https://github.com/emindeniz99/flatbuffers-format/commit/8d44ebca194c4fd76941f92ecfdddc081bc42613))
* **flatbuffers-formatter:** skip symlinks in walk + add CSP to web playground ([47f6196](https://github.com/emindeniz99/flatbuffers-format/commit/47f6196320f623334d859c905fe68604810790af))
* **flatbuffers:** make the family publish-ready before it graduates ([d7379d4](https://github.com/emindeniz99/flatbuffers-format/commit/d7379d4eae51c36d0dd98c44cf4f96c5b19ba137))
* **formatter:** clear the two lint errors, and stop building the grammar in engine CI ([07c49b0](https://github.com/emindeniz99/flatbuffers-format/commit/07c49b04cb77763b5f8bc4e053ba09e73c7a957f))
* **repo:** native binary --version, wasm build, intellij plugin id ([747217e](https://github.com/emindeniz99/flatbuffers-format/commit/747217e9949c5b12336d07bc4abfa51cb54d1293))

## [0.1.0] - 2026-08-07

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
