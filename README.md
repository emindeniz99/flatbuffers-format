# flatbuffers-format — FlatBuffers tooling family

> Seven sibling packages, one source of truth for FlatBuffers
> (`.fbs`) schema formatting.

This repo is the FlatBuffers tooling family. All seven packages
ultimately delegate to the same engine
([`flatbuffers-formatter/`](./flatbuffers-formatter)) and therefore
produce byte-identical output — whether you're calling the CLI, a
Prettier plugin, an editor extension, or the WASM build.

## What's here

| Package | Stack | Distributed as | What it is |
|---|---|---|---|
| [`flatbuffers-formatter/`](./flatbuffers-formatter) | TS + ANTLR4 | npm: [`flatbuffers-format`](https://www.npmjs.com/package/flatbuffers-format), `.wasm` + native binaries via GitHub Releases | **The engine.** Opinionated `.fbs` formatter, pure TypeScript (no JVM, no install-time codegen), exposes a CLI and a programmatic `format()` API. Every other package in this repo calls into it. |
| [`flatbuffers-formatter-handrolled/`](./flatbuffers-formatter-handrolled) | TS (zero deps) | not published | **Differential oracle.** Second, hand-rolled recursive-descent parser+printer. Every corpus file must produce byte-identical output through both implementations before a release ships. Never published. |
| [`prettier-plugin-flatbuffers/`](./prettier-plugin-flatbuffers) | TS | npm: [`prettier-plugin-flatbuffers`](https://www.npmjs.com/package/prettier-plugin-flatbuffers) | **Prettier 3 plugin.** Add to `.prettierrc` and `.fbs` files format alongside everything else Prettier already touches. Thin shim — routes to the engine, honours Prettier's `tabWidth` / `printWidth` / `endOfLine`. |
| [`tree-sitter-flatbuffers/`](./tree-sitter-flatbuffers) | tree-sitter DSL → generated C | npm: [`tree-sitter-flatbuffers`](https://www.npmjs.com/package/tree-sitter-flatbuffers) | **Tree-sitter grammar.** Drives syntax highlighting + incremental parsing in editors that consume tree-sitter (Neovim, Helix, Zed, GitHub.com). Grammar mirrors the engine's ANTLR4 grammar; corpus round-trips against the formatter on every CI run. |
| [`vscode-flatbuffers/`](./vscode-flatbuffers) | TS (ESM) | VS Code Marketplace + Open VSX: [`emindeniz99.vscode-flatbuffers`](https://marketplace.visualstudio.com/items?itemName=emindeniz99.vscode-flatbuffers) | **VS Code extension.** TextMate highlighting + a native ESM format-on-save provider that delegates to the engine. No third-party "Run on Save" plugin needed. |
| [`intellij-flatbuffers/`](./intellij-flatbuffers) | Kotlin (JDK 21) | JetBrains Marketplace: [`io.github.emindeniz99.fbs`](https://plugins.jetbrains.com/plugin/io.github.emindeniz99.fbs) | **JetBrains plugin.** One `.zip` covers IntelliJ IDEA, Rider, WebStorm, PyCharm, GoLand, CLion, RustRover, RubyMine, PhpStorm, Aqua, DataGrip, DataSpell, and Android Studio (all IntelliJ Platform 2024.2+). Hand-rolled lexer for highlighting; shells out to the engine CLI for Reformat Code. |
| [`flatbuffers-format-editors/`](./flatbuffers-format-editors) | TS (ESM) | npm: [`flatbuffers-format-editors`](https://www.npmjs.com/package/flatbuffers-format-editors) | **Browser editor integrations.** Three subpath exports — `/codemirror` (CodeMirror 6 language extension), `/monaco` (Monaco Monarch + format provider), and `/web-component` (drop-in `<flatbuffers-editor>` custom element). All three call the engine in-process — no CLI, no Node. |

`flatbuffers-formatter-handrolled` is the only one that stays unpublished —
it is the differential oracle every engine release is checked against.

## How they fit together

```mermaid
flowchart TB
  subgraph engine[flatbuffers-formatter — the engine]
    G[grammar/FlatBuffers.g4]
    G --> P[antlr-ng generate]
    P --> A[generated/FlatBuffers*.ts]
    A --> F["format() / check()<br/>(public API)"]
    F --> CLI[flatbuffers-format CLI]
    F --> NATIVE[Node SEA native binary]
    F --> WASM[Javy → .wasm]
  end

  HR[flatbuffers-formatter-handrolled<br/>hand-rolled parser+printer]
  HR -.->|byte-identical via crosscheck.sh| F

  F --> PRT[prettier-plugin-flatbuffers]
  F --> VSC[vscode-flatbuffers]
  F --> EDT[flatbuffers-format-editors<br/>CodeMirror + Monaco + Web Component]
  CLI -.->|shells out to| IJ[intellij-flatbuffers]

  G -.->|mirrored as grammar.js| TS[tree-sitter-flatbuffers]
```

A new grammar feature lands like this:

1. Edit `flatbuffers-formatter/grammar/FlatBuffers.g4` and run `pnpm
   --filter flatbuffers-format build`.
2. Mirror the change in `flatbuffers-formatter-handrolled/src/` (lexer
   / parser / printer / types). The crosscheck script must report
   `N/N OK` for the PR to merge.
3. Mirror the same construct in
   `tree-sitter-flatbuffers/grammar.js`; the corpus parse-test must
   stay at `24/24 zero ERROR/MISSING`.
4. Add a corpus fixture under
   `flatbuffers-formatter/test/corpus/NN-feature-name.fbs`.
5. Everything else — Prettier plugin, VS Code, IntelliJ, web editors —
   inherits the change automatically because they delegate to the
   engine.

Full instructions, including the test layers and EBNF audit
requirements, live in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Dev loop

The repo root is the pnpm workspace root. Bootstrap once, then operate
on individual packages via filters:

```bash
# from the repo root
pnpm install                                                  # installs everything, once

# scoped: just the engine
pnpm --filter flatbuffers-format build
pnpm --filter flatbuffers-format test

# scoped: build everything in this family
pnpm -r --filter './*' build

# Cross-engine differential check (byte-identical antlr vs handrolled)
bash flatbuffers-formatter/test/crosscheck.sh

# All four test layers (matches what prepublishOnly does)
pnpm --filter flatbuffers-format test
pnpm --filter flatbuffers-format-handrolled test
bash flatbuffers-formatter/test/crosscheck.sh
bash flatbuffers-formatter/scripts/flatc-conform.sh   # needs flatc on PATH
```

The IntelliJ plugin (Kotlin/Gradle) is the one outlier — its dev loop
is `./gradlew runIde` from its own directory, not part of the pnpm
workspace. See its own [README](./intellij-flatbuffers/README.md).

## Test surface (what CI gates each PR on)

Seven workflows run on every PR:

| Workflow | Gate |
|---|---|
| [`flatbuffers-ci.yml`](./.github/workflows/flatbuffers-ci.yml) | Engine + handrolled unit tests on `{linux, macOS, Windows} × node {22, 24, 26}` matrix, plus the byte-identical crosscheck and `flatc-conform` (against the upstream `flatc` binary, SHA256-pinned). |
| [`prettier-plugin-flatbuffers.yml`](./.github/workflows/prettier-plugin-flatbuffers.yml) | Prettier plugin build + 7 unit tests. |
| [`tree-sitter-flatbuffers.yml`](./.github/workflows/tree-sitter-flatbuffers.yml) | tree-sitter generate + 9 grammar tests + 24-corpus round-trip. |
| [`vscode-flatbuffers.yml`](./.github/workflows/vscode-flatbuffers.yml) | VS Code extension build + 5 unit tests on a node matrix. |
| [`intellij-flatbuffers.yml`](./.github/workflows/intellij-flatbuffers.yml) | Gradle `buildPlugin` + `verifyPlugin` (IntelliJ Plugin Verifier against every recommended IDE). |
| [`flatbuffers-format-editors.yml`](./.github/workflows/flatbuffers-format-editors.yml) | Editors package lint + build + tests. |
| [`flatbuffers-perf-regression.yml`](./.github/workflows/flatbuffers-perf-regression.yml) | Engine bench, median-of-3, sticky-comment regression report against `scripts/bench-baseline.json`. |

On `release: released`, three more workflows fire:
- [`flatbuffers-native-binaries.yml`](./.github/workflows/flatbuffers-native-binaries.yml)
  — 5-platform Node SEA matrix, attaches signed binaries to the
  release.
- [`flatbuffers-wasm-binary.yml`](./.github/workflows/flatbuffers-wasm-binary.yml) — Javy
  build + round-trip-equivalence smoke vs native + asset upload.
- [`flatbuffers-post-publish-smoke.yml`](./.github/workflows/flatbuffers-post-publish-smoke.yml)
  — install each just-published artifact from the public registry
  and exercise its public surface.

## Releases

Every publishable artifact in this repo is released by
[release-please](https://github.com/googleapis/release-please) from
the repo root:

| Package | Registry | Identifier |
|---|---|---|
| `flatbuffers-formatter/` | npm | `flatbuffers-format` |
| `prettier-plugin-flatbuffers/` | npm | `prettier-plugin-flatbuffers` |
| `tree-sitter-flatbuffers/` | npm | `tree-sitter-flatbuffers` |
| `vscode-flatbuffers/` | VS Code Marketplace (+ Open VSX, best-effort) | `emindeniz99.vscode-flatbuffers` |
| `intellij-flatbuffers/` | JetBrains Marketplace | `io.github.emindeniz99.fbs` |
| `flatbuffers-format-editors/` | npm | `flatbuffers-format-editors` |

You don't bump `version` fields by hand. The flow:

1. Land a Conventional Commit on `main` with an area scope:
   - `feat(formatter): …`
   - `feat(vscode): …`
   - `feat(intellij): …`
   - etc. — the full scope list is in
     [`CONTRIBUTING.md`](./CONTRIBUTING.md#commit-conventions).
     release-please routes the commit to a package by the files it
     touches, not by the scope string.
2. release-please opens (or updates) a single combined release PR that
   bumps each affected package's `version` + regenerates its
   `CHANGELOG.md`.
3. On merge, release-please creates one git tag per released package
   (`flatbuffers-format@X.Y.Z`, `vscode-flatbuffers@X.Y.Z`, …), plus a
   matching GitHub Release.
4. The publish job for each package fires automatically, scoped by tag.

`workspace:^` deps between packages in this repo are resolved natively
by `pnpm publish` at tarball-build time. No manual rewrite step in the
publish workflows.

Full details, including required secrets and the deploy-tree dance
for `vsce`, are in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Cross-runtime + cross-package-manager testing

Beyond the npm registry, we test downstream consumers across multiple
runtimes and package managers. The matrix lives in
[`flatbuffers-pm-compat.yml`](./.github/workflows/flatbuffers-pm-compat.yml)
and
[`flatbuffers-runtime-compat.yml`](./.github/workflows/flatbuffers-runtime-compat.yml);
TL;DR:

- **Node**: 22, 24, 26 (LTS + current).
- **Package managers** (install the published tarball): npm, pnpm,
  Yarn Classic v1, Yarn Berry v3/v4, Bun.
- **Runtimes**: Deno (`npm:` specifier), Bun (runtime), Cloudflare
  Workers (miniflare), AWS Lambda (SAM local).

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md) — features, supply-chain/security
follow-ups, release-infra to-dos, maintainer action items, and an
explicit "not planned" list (so settled decisions don't get
re-litigated).

## Contributing

Setup, the four test layers, the grammar-change procedure, commit
conventions, and the release process are all in
[`CONTRIBUTING.md`](./CONTRIBUTING.md). Security-sensitive reports go
through [`SECURITY.md`](./SECURITY.md), not the issue tracker. Licensed
[MIT](./LICENSE).
