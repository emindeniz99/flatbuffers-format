# Contributing

Thanks for reading this — that already puts you ahead. This repo is the
FlatBuffers tooling family: seven sibling packages that all delegate to
one engine ([`flatbuffers-formatter/`](flatbuffers-formatter/)) and
therefore produce byte-identical output. Each package is versioned and
released independently.

## Picking a package

- **[`flatbuffers-formatter/`](flatbuffers-formatter/)** — the
  [`flatbuffers-format`](https://www.npmjs.com/package/flatbuffers-format)
  npm package, ANTLR4-grammar-backed. Most contributions land here.
- **[`flatbuffers-formatter-handrolled/`](flatbuffers-formatter-handrolled/)** —
  the hand-rolled recursive-descent sibling, kept unpublished as a
  differential oracle. Changes here are usually a mirror of grammar
  changes in the published package; see "Making a grammar change" below.
- **[`prettier-plugin-flatbuffers/`](prettier-plugin-flatbuffers/)** —
  Prettier 3 plugin that routes `.fbs` files through
  `flatbuffers-format`. Thin shim — most contributions belong upstream
  in the formatter itself.
- **[`tree-sitter-flatbuffers/`](tree-sitter-flatbuffers/)** —
  Tree-sitter grammar for `.fbs` schemas, mirrors the formatter's
  ANTLR4 grammar. Drives syntax highlighting + incremental parsing in
  editors that consume tree-sitter (Neovim, Helix, Zed, GitHub.com).
  Grammar changes here must keep parity with the formatter's grammar.
- **[`vscode-flatbuffers/`](vscode-flatbuffers/)** — VS Code extension:
  TextMate highlighting + format-on-save delegating to
  `flatbuffers-format`. Same shim story as the Prettier plugin — most
  logic upstream.
- **[`intellij-flatbuffers/`](intellij-flatbuffers/)** —
  JetBrains-family IDE plugin (IntelliJ IDEA, Rider, WebStorm, PyCharm,
  GoLand, CLion, RustRover, …). Hand-rolled Kotlin lexer for
  highlighting; shells out to the `flatbuffers-format` CLI on Reformat
  Code. Single `.zip` covers every IntelliJ-Platform-based IDE. Same
  shim story as the VS Code and Prettier packages.
- **[`flatbuffers-format-editors/`](flatbuffers-format-editors/)** —
  browser editor integrations (CodeMirror 6, Monaco editor, drop-in
  `<flatbuffers-editor>` Web Component). All three call the engine
  in-process via the `flatbuffers-format` API — no CLI, no Node. Same
  shim story as the other editor packages.

If you're not sure where your change belongs, open an issue first.

## Local setup

The repo root is the pnpm workspace root. Clone, install once, then use
`pnpm --filter <pkg>` to scope commands to one package:

```bash
git clone https://github.com/emindeniz99/flatbuffers-format.git
cd flatbuffers-format
pnpm install                                           # installs everything
pnpm --filter flatbuffers-format build                 # build the engine
pnpm --filter flatbuffers-format test                  # run engine unit tests
pnpm -r build                                          # build every package
pnpm -r test                                           # test every package
```

Requirements:

- **Node `>=20`** (the published packages target 20; CI matrices 20/22/24/26).
- **pnpm `>=11`** (pinned via the `packageManager` field on the root
  `package.json`). `corepack enable && corepack prepare` picks the
  pinned version up automatically.

The workspace's intra-repo deps are spelled `"workspace:^"` in source.
`pnpm publish` rewrites that to the resolved `^X.Y.Z` range in the
published tarball — no manual rewrite step at release time.

Node version is pinned for any version manager that reads either format:

- **[mise](https://mise.jdx.dev/)** — `.mise.toml` lists Node 22; run
  `mise trust && mise install` once at clone time, then `cd` into the
  repo auto-switches.
- **nvm / fnm / volta / asdf** — read `.nvmrc` (also pinned to 22)
  automatically on `cd` (or via `nvm use` / equivalent).

Either is fine; the two files agree on Node 22 and must be bumped
together when changing versions.

## Running the full test surface for `flatbuffers-format`

There are four independent test layers. Each catches a different class
of bug; running all four is what `prepublishOnly` does.

| Command (from the repo root) | What it catches |
|---|---|
| `pnpm --filter flatbuffers-format test` | Unit-level grammar/printer behavior. 56 tests at last release. |
| `bash flatbuffers-formatter/test/crosscheck.sh` | Differential: every corpus file must produce byte-identical output through both the ANTLR-backed engine and the hand-rolled sibling. Builds the sibling first via `pnpm --filter flatbuffers-format-handrolled build`. |
| `bash flatbuffers-formatter/scripts/flatc-conform.sh` | Opt-in: every corpus file must be accepted by Google's official `flatc` compiler. Requires `flatc` on `PATH`; the script skips with a clear hint if it isn't. Version-aware — fixtures using post-2.0.8 syntax are skipped on older `flatc`. |
| `pnpm --filter flatbuffers-format-handrolled test` | Unit tests for the sibling parser (28 tests). |

Installing `flatc` (Linux):
- Ubuntu/Debian: `sudo apt-get install -y flatbuffers-compiler` (currently ships flatc 2.0.8 — fine for most checks)
- Latest: download the prebuilt Linux binary from <https://github.com/google/flatbuffers/releases/latest>

### Benchmarking

A fifth, perf-only layer runs in CI as its own workflow
(`.github/workflows/flatbuffers-perf-regression.yml`) on every PR and on push to
`main`. Locally, reproduce it with:

```bash
cd flatbuffers-formatter
pnpm bench                                       # human-readable text
pnpm bench --json --repeat 3 | node scripts/bench-compare.mjs
```

The compare script diffs the current run against
`scripts/bench-baseline.json` and exits non-zero if in-process µs/file
regresses by >25%, cold-start CLI median by >30%, or bundle min+gz by
>15%. To accept slower numbers (e.g. correctness fix worth the cost),
re-baseline locally — `pnpm bench --json --repeat 3 >
scripts/bench-baseline.json` (then strip the volatile `node` and
`commit` fields) — and commit the new baseline in the same PR with a
body explaining the tradeoff.

## Making a grammar change

Grammar lives in
[`flatbuffers-formatter/grammar/FlatBuffers.g4`](flatbuffers-formatter/grammar/FlatBuffers.g4).
The published package uses an ANTLR4-generated parser; the sibling has
a hand-rolled recursive-descent parser. Both must agree.

1. Edit `grammar/FlatBuffers.g4` for the syntactic change.
2. Run `pnpm --filter flatbuffers-format build` to regenerate `generated/FlatBuffers*.ts` and
   recompile.
3. Mirror the change in the sibling:
   - `flatbuffers-formatter-handrolled/src/types.ts` (AST type)
   - `flatbuffers-formatter-handrolled/src/parser.ts` (parse logic)
   - `flatbuffers-formatter-handrolled/src/printer.ts` (emit logic)
   - Sometimes `flatbuffers-formatter-handrolled/src/lexer.ts`
     (only if a new token is needed)
4. Mirror the same construct in `tree-sitter-flatbuffers/grammar.js`;
   its corpus parse-test must stay at zero `ERROR`/`MISSING` nodes.
5. Add a corpus fixture under `test/corpus/NN-feature-name.fbs` that
   exercises the new construct. Use the existing fixtures as a style
   guide.
6. Run all four test layers — `pnpm --filter flatbuffers-format test`,
   `crosscheck.sh`, `flatc-conform.sh`, and
   `pnpm --filter flatbuffers-format-handrolled test`. The crosscheck
   must report `N/N OK` with zero mismatches.
7. Update the EBNF audit doc
   ([`flatbuffers-formatter/docs/ebnf-conformance.md`](flatbuffers-formatter/docs/ebnf-conformance.md))
   if the change closes or alters a row.

Non-grammar changes (printer tweaks, CLI flags, docs) don't need steps
3–4, but the crosscheck must still pass.

## Commit conventions

This repo uses [Conventional Commits](https://www.conventionalcommits.org/)
with a **mandatory scope**. Same rules are restated for AI assistants in
[`CLAUDE.md`](CLAUDE.md).

```
<type>(<scope>): <subject>

[optional body — wrap at 72 chars, explain *why*]

[optional footer — BREAKING CHANGE: …, Refs: …, etc.]
```

### Scope — required, and it's an area of this repo

| Scope | Covers |
|---|---|
| `formatter` | `flatbuffers-formatter/` — the engine (`flatbuffers-format`) |
| `handrolled` | `flatbuffers-formatter-handrolled/` — the differential oracle |
| `prettier-plugin` | `prettier-plugin-flatbuffers/` |
| `tree-sitter` | `tree-sitter-flatbuffers/` |
| `vscode` | `vscode-flatbuffers/` |
| `intellij` | `intellij-flatbuffers/` |
| `editors` | `flatbuffers-format-editors/` |
| `ci` | `.github/workflows/`, CI config |
| `docs` | docs that aren't owned by a single package (this file, README, SECURITY) |
| `repo` | root config — pnpm workspace, `.gitignore`, release-please config, tool pins |

Never write a bare `feat: …`. If a change genuinely spans two areas,
split it into one commit per area.

Note: release-please routes a commit to a package by the **files it
touches**, not by the scope string — the scope is there so `git log`
reads clearly to humans.

### Types

| Type | Use for |
|---|---|
| `feat` | New user-visible feature or capability |
| `fix` | Bug fix |
| `docs` | README, comments, doc-only changes |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests only |
| `chore` | Tooling, deps, config, build glue — no runtime behavior change |
| `build` | Dockerfile, packaging, lockfiles |
| `ci` | GitHub Actions, CI config |
| `revert` | Reverts a prior commit (include the reverted SHA in the body) |

If none fit, prefer `chore`.

### Subject line

- Imperative mood: "add X", not "added X" / "adds X".
- Lowercase first letter, no trailing period.
- ≤72 chars for the whole header line (`type(scope): subject`).

### Body — explain *why*

Skip the body for trivial commits. Write one when:

- The *why* isn't obvious from the diff (constraint, incident, upstream bug).
- The change has non-local consequences (deprecates an API, changes a
  default, requires a migration).
- You picked a non-obvious approach over an obvious one — note the trade-off.

Don't restate what the diff already shows. Don't paste tool output.
Useful things to cover, in whatever structure fits: problem/symptoms,
root cause, what you changed and why it fixes it, evidence, impact if
left unfixed, alternatives rejected and why, how you validated it, and
rollback notes.

### Breaking changes

Mark with `!` after the scope **and** a `BREAKING CHANGE:` footer:

```
feat(formatter)!: drop the legacy format() options bag

BREAKING CHANGE: `format(src, { legacy: true })` is gone. Callers pass
`format(src, { printWidth })` instead.
```

### AI-assisted commits

If an AI assistant wrote or co-wrote the change, credit it with a
trailer:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

### Focused commits

One commit = one reason. When several unrelated changes sit in the
working tree, stage by pathspec rather than `git add -A`:

```bash
git commit --only -m "<message>" -- <path1> <path2>
```

If `--only` is awkward (dirty index, tricky globs, deleted files), fall
back to `git add <paths> && git diff --cached --name-only && git commit`
— same rule: one topic per commit.

## Merging pull requests

**Always a real merge commit. Never squash, never rebase-merge.**

1. Use the `merge` method (GitHub API: `merge_method: "merge"`; locally
   `git merge --no-ff`). This is the default, every time.
2. **Never squash.** Squashing collapses the branch into one commit and
   throws away the per-commit history — on `main` that loss is
   irreversible. Per-commit history here is the record of how each
   package was built.
3. **Never rebase-merge** either — it rewrites commit SHAs and loses the
   merge topology.
4. The only exception is the maintainer explicitly asking for a squash
   on a specific PR, in that PR.
5. Don't delete the source branch as part of the merge unless asked.

## How releases happen

All six publishable artifacts are released by
[release-please](https://github.com/googleapis/release-please):

| Package | Registry | Identifier |
|---|---|---|
| `flatbuffers-formatter/` | npm | `flatbuffers-format` |
| `prettier-plugin-flatbuffers/` | npm | `prettier-plugin-flatbuffers` |
| `tree-sitter-flatbuffers/` | npm | `tree-sitter-flatbuffers` |
| `vscode-flatbuffers/` | VS Code Marketplace (+ Open VSX, best-effort) | `emindeniz99.vscode-flatbuffers` |
| `intellij-flatbuffers/` | JetBrains Marketplace | `io.github.emindeniz99.fbs` |
| `flatbuffers-format-editors/` | npm | `flatbuffers-format-editors` |

You do not bump `version` in any `package.json` and you do not edit any
`CHANGELOG.md`. The flow:

1. You land a Conventional Commit on `main` (e.g. `feat(formatter): …`).
   The files it touches determine which package(s) get a release entry.
2. release-please opens (or updates) a SINGLE combined "release PR"
   that bumps `package.json` and regenerates `CHANGELOG.md` for every
   package with eligible commits.
3. The maintainer reviews and merges the release PR.
4. CI tags each released package (e.g. `flatbuffers-format@0.1.1`),
   creates GitHub Releases, and publishes to the corresponding
   registry automatically. The VS Code extension is also uploaded as
   a `.vsix` asset on its GitHub Release.
5. The
   [`post-publish-smoke`](.github/workflows/flatbuffers-post-publish-smoke.yml)
   workflow runs automatically once release-please completes. For
   each just-published artifact it: waits for the registry to
   propagate, installs the published version on a clean runner,
   exercises the public surface (CLI `--version` + a tiny format
   round-trip; Prettier integration check; tree-sitter parse;
   Marketplace listing check), and fails loudly if anything is
   broken. If a smoke job fails, the publish succeeded but the
   artifact is broken — deprecate that version with
   `npm deprecate <pkg>@<version> "broken; use the next release"`
   and push a fix as a new release.

### Required repository secrets

The release workflow needs a handful of one-time configuration items.
The maintainer sets these in **Settings → Secrets and variables →
Actions**:

| Secret | Used by | How to create |
|---|---|---|
| `NPM_TOKEN` | 3 npm-publish jobs (engine, prettier plugin, tree-sitter) | [npmjs.com → Account → Access Tokens](https://www.npmjs.com/settings/~/tokens) → New Granular Token, **Publish** scope on the three packages, type **Automation** (skips 2FA). |
| `VSCE_PAT` | VS Code Marketplace publish | [Azure DevOps → User settings → Personal access tokens](https://dev.azure.com/) → **Marketplace (Manage)** scope. Full guide: [Publishing Extensions: get a PAT](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token). |
| `OVSX_PAT` | Open VSX publish (optional) | [open-vsx.org → User Settings → Tokens](https://open-vsx.org/user-settings/tokens). The step is marked `continue-on-error: true`, so missing/expired tokens won't block a Marketplace publish — but no Open VSX update will happen either. |
| `JETBRAINS_MARKETPLACE_TOKEN` | JetBrains Marketplace publish | [plugins.jetbrains.com → Author Profile → Tokens](https://plugins.jetbrains.com/author/me) → New token with **Plugin Developer** scope. |
| `JETBRAINS_CERTIFICATE_CHAIN`, `JETBRAINS_PRIVATE_KEY`, `JETBRAINS_PRIVATE_KEY_PASSWORD` | IntelliJ plugin signing (optional) | Generate per the [plugin-signing docs](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html). If unset, the plugin publishes unsigned (Marketplace allows it — signing just adds a verification badge). |
| `APPLE_DEVELOPER_ID_CERT_P12_BASE64`, `APPLE_DEVELOPER_ID_CERT_PASSWORD`, `APPLE_ID`, `APPLE_ID_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | macOS native-binary Developer-ID signing + Apple notarization (optional) | Generate a Developer ID Application certificate from [Apple Developer → Certificates](https://developer.apple.com/account/resources/certificates/list), export as `.p12`, base64-encode (`base64 -w0 cert.p12`), and store as `APPLE_DEVELOPER_ID_CERT_P12_BASE64`. Generate an app-specific password from [appleid.apple.com → Security](https://appleid.apple.com/account/manage) and store as `APPLE_ID_APP_SPECIFIC_PASSWORD`. The team ID comes from the certificate. If unset, the native-binaries workflow falls back to an ad-hoc codesign — binaries still run, but downloaded copies hit macOS Gatekeeper quarantine until cleared manually. |

Plus the one-time repo setting:

- **Settings → Actions → General → "Allow GitHub Actions to create and
  approve pull requests"** — needed so the default `GITHUB_TOKEN` can
  open the release PR. Without this, the workflow run will succeed but
  no release PR will appear.

### Dry-running a publish locally

To inspect what would actually ship for any package without touching a
registry, run (from the package's own directory):

- npm packages: `pnpm --filter <pkg> publish --dry-run --no-git-checks --provenance --access public`
- VS Code extension: `npx vsce ls` to list files; `npx vsce package` to
  build the `.vsix` locally.
- Open VSX equivalent: `npx ovsx ls` (lists what would publish to Open VSX).

The repo also ships `.github/workflows/flatbuffers-publish.yml`, a manual
`workflow_dispatch` "dry-run" that builds `flatbuffers-format` and runs
`pnpm publish --dry-run`. The `flatbuffers-republish.yml` workflow lets
the maintainer re-trigger a single package's publish without opening a
new release PR (useful for retrying a transient publish failure).

### How the `workspace:^` dependency is handled at publish time

`prettier-plugin-flatbuffers`, `vscode-flatbuffers`, and
`flatbuffers-format-editors` all declare their engine dep as
`"flatbuffers-format": "workspace:^"` in source. That keeps local dev
and CI trivially in sync — the dep resolves to the on-disk sibling
under `flatbuffers-formatter/`.

For npm publishes, `pnpm publish` automatically rewrites
`workspace:^` to the resolved `^<engine-version>` range in the
published tarball. The source on disk keeps `workspace:^`. No manual
rewrite step in the workflow.

For VS Code Marketplace publishes, `vsce` doesn't understand
`workspace:^`. The publish workflow runs `pnpm deploy --filter
vscode-flatbuffers --prod --legacy deploy/vscode`, which materialises
a standalone tree with all `workspace:^` deps resolved, then runs
`vsce package` against that tree. Same source-tree-friendly outcome,
just via a deployable directory instead of an in-place rewrite.

## Pull request expectations

- Small and scoped. If your PR touches more than one package, split it.
- All four test layers green where applicable (CI runs them automatically).
- New behavior pinned by at least one fixture + at least one unit test.
- Commit messages follow the conventions above.
- For grammar changes: update
  [`flatbuffers-formatter/docs/ebnf-conformance.md`](flatbuffers-formatter/docs/ebnf-conformance.md)
  and (if applicable)
  [`flatbuffers-formatter/docs/grammar-comparison.md`](flatbuffers-formatter/docs/grammar-comparison.md).

## Reporting issues

Use the [issue templates](.github/ISSUE_TEMPLATE/) — they ask for the
minimum info I need to repro. For security-sensitive reports, please
follow [`SECURITY.md`](SECURITY.md) instead.

## Conduct

Be kind, be patient, assume good faith. Reports of behavior that isn't
go to the maintainer (`@emindeniz99`).
