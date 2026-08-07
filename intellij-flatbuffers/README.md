# intellij-flatbuffers

> FlatBuffers schema support for IntelliJ IDEA, Rider, WebStorm,
> PyCharm, GoLand, CLion, RustRover, RubyMine, PhpStorm, Aqua,
> DataGrip, DataSpell, and Android Studio.

[![JetBrains Marketplace][marketplace-badge]][marketplace-url]
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[marketplace-badge]: https://img.shields.io/jetbrains/plugin/v/io.github.emindeniz99.flatbuffers?label=Marketplace
[marketplace-url]: https://plugins.jetbrains.com/plugin/io.github.emindeniz99.flatbuffers

Syntax highlighting and format-on-save for FlatBuffers
(`.fbs`) schema files. Format delegates to the published
[`flatbuffers-format`][engine-npm] CLI so the output is byte-for-byte
identical to what you'd get from the VS Code extension, the Prettier
plugin, `npx flatbuffers-format`, or the pre-commit hook.

[engine-npm]: https://www.npmjs.com/package/flatbuffers-format

## Why

JetBrains IDEs ship no FlatBuffers support out of the box: `.fbs` files
open as plain text and there's no formatter. This plugin fixes both.
It's the JetBrains-family counterpart of the VS Code extension —
same engine, same output, no surprise across teams that use both.

## Install

### From Marketplace (recommended)

1. **Settings → Plugins → Marketplace**
2. Search for **FlatBuffers**
3. Install, restart.

Or via JetBrains Toolbox `jb plugin install io.github.emindeniz99.flatbuffers`.

### From a `.zip`

Grab the latest release from
[GitHub Releases](https://github.com/emindeniz99/flatbuffers-format/releases?q=intellij-flatbuffers)
and install it via **Settings → Plugins → ⚙ → Install from disk…**.

### Install the engine

The plugin shells out to the `flatbuffers-format` binary. Install
once via npm:

```bash
npm install -g flatbuffers-format
```

Verify:

```bash
flatbuffers-format --version
```

The plugin auto-detects the binary on `PATH`; if you keep it elsewhere
(corporate npm prefix, nvm-per-project, etc.), set the path manually:

**Settings → Tools → FlatBuffers → Binary path**.

## Features

- **File-type association** — `.fbs` files now show as "FlatBuffers
  schema" in the IDE; previously they fell into the generic text
  bucket.
- **Syntax highlighting** — keywords (`namespace`, `table`, `struct`,
  `enum`, `union`, `root_type`, `attribute`, `rpc_service`, …),
  builtin types (`int32`, `uint64`, `float`, `string`, …), constants
  (`true`, `false`, `null`, `inf`, `nan`), numbers (decimal, hex, C99
  hex float, exponent form), strings (with `\"` and `\\` escapes),
  line/doc/block comments. Driven by a hand-rolled lexer mirroring
  the engine grammar.
- **Reformat code** — Ctrl/⌘ + Alt + L runs `flatbuffers-format`
  on the current `.fbs` file. The plugin uses
  `AsyncDocumentFormattingService` (since IntelliJ 2022.2) so
  formatting happens off the EDT and you can cancel it mid-flight.
- **Format on save** — opt-in toggle under Settings → Tools →
  FlatBuffers; off by default.
- **Line/block comment toggle** — Ctrl/⌘ + / inserts `//`; Ctrl/⌘
  + Shift + / wraps with `/* … */`.
- **Color scheme entry** — Preferences → Editor → Color Scheme →
  FlatBuffers lets you tweak per-token colours without touching the
  global scheme.

## Settings (Preferences → Tools → FlatBuffers)

| Setting          | Default       | What it does |
|------------------|---------------|--------------|
| Binary path      | *(auto)*      | Absolute path to `flatbuffers-format`. Leave blank to look it up on `PATH`. |
| Extra arguments  | *(none)*      | Whitespace-separated CLI args appended to every invocation. Example: `--use-tabs --line-width 120`. |
| Format on save   | off           | Runs the formatter on every save. Independent of any "Save Actions" plugin. |

The full CLI option set is documented in the
[engine's README](../flatbuffers-formatter/README.md#cli) — every
flag works here too.

## Supported IDEs

| IDE                        | Minimum version | Verified  |
|----------------------------|-----------------|-----------|
| IntelliJ IDEA (Community)  | 2024.2          | ✅        |
| IntelliJ IDEA (Ultimate)   | 2024.2          | ✅        |
| Rider                      | 2024.2          | ✅        |
| WebStorm                   | 2024.2          | ✅        |
| PyCharm (both editions)    | 2024.2          | ✅        |
| GoLand                     | 2024.2          | ✅        |
| CLion                      | 2024.2          | ✅        |
| RustRover                  | 2024.2          | ✅        |
| RubyMine                   | 2024.2          | ✅        |
| PhpStorm                   | 2024.2          | ✅        |
| Aqua                       | 2024.2          | ✅        |
| DataGrip / DataSpell       | 2024.2          | ✅        |
| Android Studio (Ladybug+)  | 2024.2-aligned  | ✅        |

The single `<depends>` line in `plugin.xml` is on
`com.intellij.modules.platform`, which every IntelliJ-family IDE ships;
that's what lets one `.zip` cover the entire matrix.

## Dev setup

```bash
cd intellij-flatbuffers
./gradlew runIde            # boots a sandbox IDE with the plugin loaded
./gradlew buildPlugin       # produces build/distributions/*.zip
./gradlew verifyPlugin      # Marketplace pre-flight validation
./gradlew test              # JUnit tests run against the platform fixture
```

First `runIde` invocation downloads the IDE (~700 MB) into
`~/.gradle/caches/modules-2/files-2.1/com.jetbrains.intellij.idea/`;
subsequent runs reuse the cache.

JDK 21 required (matches what IntelliJ 2024.2 ships).

## How releases happen

This package is part of the
[flatbuffers-format repo](https://github.com/emindeniz99/flatbuffers-format) and
its release flow is governed by
[release-please](https://github.com/googleapis/release-please) —
exactly the same flow as the four npm packages in the repo. You don't
bump `pluginVersion` manually; it's bumped automatically when a
Conventional Commit lands on `main` with the
`feat(intellij-flatbuffers):` or `fix(intellij-flatbuffers):` prefix.

When release-please merges the bump PR, the
[`intellij-flatbuffers.yml`](../../.github/workflows/intellij-flatbuffers.yml)
workflow:

1. Builds the plugin distribution.
2. Runs the IntelliJ Plugin Verifier against every recommended IDE.
3. Signs the `.zip` with the Marketplace certificate
   (`JETBRAINS_CERTIFICATE_CHAIN` + `JETBRAINS_PRIVATE_KEY` +
   `JETBRAINS_PRIVATE_KEY_PASSWORD` secrets).
4. Uploads the signed `.zip` as a GitHub Release asset.
5. Publishes to JetBrains Marketplace via
   `./gradlew publishPlugin` using the
   `JETBRAINS_MARKETPLACE_TOKEN` secret.

The same `.zip` is also published to a GitHub Release for
sideloading-friendly distribution.

## Limitations (v0.1)

- **No semantic features** — no go-to-definition, find-usages,
  rename, or completion. The plugin is highlighter + formatter only.
  These need a PSI tree, which we deliberately defer until we know
  there's demand.
- **No range formatting** — the engine is whole-file. Format Selection
  formats the entire document.
- **No bundled CLI** — you install the Node engine separately. A
  native (GraalVM-compiled) build of the engine is on the roadmap and
  will eliminate this once it lands.

## License

MIT. See [LICENSE](LICENSE).
