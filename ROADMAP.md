# FlatBuffers family — roadmap

Things discussed but not yet shipped for the FlatBuffers tooling
family, so the next person — human or AI agent — can pick up without
re-deriving everything from conversation history.

**Convention.** Discuss-but-don't-ship → add a one-liner here.
Ship it → delete the entry in the same commit.

Each bullet is a direction, not a promise — if a row matters to you,
file an issue and we can prioritise it.

---

## Features

### Likely next (0.2.x)

- **Extend multi-PM post-publish smoke to the non-engine packages.**
  `post-publish-smoke.yml`'s engine job already fans out across
  npm / pnpm / yarn-classic / yarn-berry / bun; the prettier-plugin,
  tree-sitter, vscode-extension, and editors smoke jobs still test
  npm only. *Next step:* mirror the matrix from
  `smoke-flatbuffers-format` into the other four jobs.

### Maybe (0.3.x — 0.x)

- **Lezer grammar for CodeMirror** to replace the StreamLanguage in
  `flatbuffers-format-editors/codemirror`. Gets incremental parsing
  + PSI access; cost is a second grammar to keep in sync with the
  engine.
- **Code-fold ranges + outline view** on every editor surface (VS
  Code, IntelliJ, web). Mostly platform glue around the engine's AST.
- **Schema-level diagnostics** beyond parse errors: undefined symbol
  refs, illegal vtable IDs, conflicting `(id: N)` attributes, etc.
  The engine already builds an AST that would support these — needs a
  `lint()` API alongside `format()` and `check()`.
- **Sourcemap for Prettier integration** so the plugin can offer
  in-place fixes via Prettier's error-on-format mode.

## Supply chain / security

- **SBOM emission on every published artefact.** No CycloneDX or SPDX
  bill-of-materials today. `anchore/sbom-action@v0` would attach an
  SBOM to each GitHub Release and produce npm-tarball-shaped output.
  *Next step:* add it to native-binaries.yml, wasm-binary.yml, and
  release-please.yml's npm + intellij publish jobs.

- **Cosign-side attestation verification in `BundledEngine.kt`.** The
  IntelliJ downloader verifies the SHA sidecar but not the SLSA
  build-provenance attestation shipped alongside it (see
  [`SECURITY.md`](../../SECURITY.md)). Verifying it would close the
  "attacker replaces both binary AND sidecar" gap — they still
  couldn't forge an attestation tied to our workflow OIDC.
  *Next step:* add a Kotlin Sigstore client
  ([`sigstore-java`](https://github.com/sigstore/sigstore-java)) and
  verify after the SHA check. ~5 MiB size adder on the plugin .zip —
  hence deferred.

- **Embed expected engine SHAs in the plugin at compile time.**
  Instead of trusting the runtime-fetched sidecar, the plugin's
  release pipeline would codegen the engine binary SHAs into a Kotlin
  file at build time; mismatch = hard error. *Next step:* Gradle task
  fetching each platform's `.sha256` from the matching engine release
  → `ExpectedEngineHashes.kt`. Tightens plugin↔engine release
  coupling (must bump engine ref atomically) — deferred for that
  reason.

- **`security.txt` for the Pages site.** No `/.well-known/security.txt`
  on the published Pages site. *Next step:* drop one into `pages.yml`'s
  `site-out/.well-known/` with the same contact info as SECURITY.md.

## Release infrastructure

- **Open VSX publish is `continue-on-error: true`.** A missing/expired
  `OVSX_PAT` silently skips Open VSX today. Flip to load-bearing once
  the token's reliably configured. *Next step:* remove
  `continue-on-error: true` from the `Publish to Open VSX` step in
  `release-please.yml` + `republish.yml`.

- **Marketplace screenshots / GIFs.** Both the VS Code and JetBrains
  listings show placeholders until we add real assets. Pure asset
  work. *Next step:* record an "open .fbs → Reformat Code" loop per
  IDE, drop into each plugin's README + a `marketplace/` asset dir.

## Maintainer action items (outside the repo)

Only the repo owner can do these — account/secret config.

- **Publishing secrets** (Settings → Secrets and variables → Actions):
  `NPM_TOKEN`, `VSCE_PAT`, `OVSX_PAT` (optional),
  `JETBRAINS_MARKETPLACE_TOKEN`, and the optional IntelliJ signing trio
  `JETBRAINS_CERTIFICATE_CHAIN` / `JETBRAINS_PRIVATE_KEY` /
  `JETBRAINS_PRIVATE_KEY_PASSWORD`.
- **macOS notarization secrets** for signed + Apple-notarized native
  binaries: `APPLE_DEVELOPER_ID_CERT_P12_BASE64`,
  `APPLE_DEVELOPER_ID_CERT_PASSWORD`, `APPLE_ID`,
  `APPLE_ID_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Without them the
  macOS binaries fall back to ad-hoc-sign and need
  `xattr -dr com.apple.quarantine` on download.
- **Enable "Allow GitHub Actions to create and approve pull
  requests"** (Settings → Actions → General) so release-please can
  open release PRs.

## Not planned

So a future session doesn't re-litigate decisions already made.

- **Bundle all 5 platform binaries inside the IntelliJ plugin .zip.**
  Rejected — would push the .zip from ~100 KiB to ~600 MiB.
  Download-on-demand is the chosen path.
- **Reading FlatBuffers binary buffers in the engine.** `flatc` is the
  authoritative tool; reimplementing a moving target adds no value.
- **A bytecode VM / interpreter for `.fbs` schemas.** Out of scope for
  a formatter.
- **Codegen for TS / Go / Rust / Swift from `.fbs`.** Same reason —
  `flatc` owns that surface.
- **A Language Server Protocol implementation.** The engine isn't
  structured to provide LSP-shaped queries (definitions, references)
  over `.fbs`. If demand materialises, the right move is a separate
  project, not retrofitting the formatter engine.

---

## Repo-wide CI / security

These live in repo-shared infra (`.github/workflows/`, root config)
rather than in a single package, but were raised while hardening this
family's supply chain.

- **OSSF Scorecard workflow.** `ossf/scorecard-action@v2` runs weekly
  + badges the root README; catches posture drift (unpinned actions,
  missing policy files, etc.). *Next step:* add
  `.github/workflows/scorecard.yml` from the
  [canonical template](https://github.com/ossf/scorecard-action#installation).

- **SHA-pin third-party GitHub Actions.** Every external action is
  referenced by tag (`actions/checkout@v4`), not a commit SHA — a
  compromised maintainer can retag silently. *Next step:* sweep
  `.github/workflows/**`, replace `@vN` with `@<sha>`; Dependabot's
  `github-actions` entry already proposes the bumps.

- **gitleaks secret scanning.** No active scanning beyond GitHub's
  built-in. *Next step:* `.github/workflows/gitleaks.yml` on PR;
  optionally extend `.pre-commit-hooks.yaml` with `gitleaks-protect`.

- **Verified-commits via GPG/SSH signing.** Many session commits show
  "Unverified" on GitHub. Fixing needs either a signing key on the AI
  runner (ongoing key mgmt) or rewriting committer metadata (loses the
  human-vs-agent author signal). *Next step:* if you want the Verified
  badge, set up SSH commit signing per
  [GitHub's guide](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification).
