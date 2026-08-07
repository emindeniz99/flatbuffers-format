# Security Policy

## Scope

This policy covers every publishable artefact in this repo.

| Artefact | Registry | Identifier |
|---|---|---|
| Engine | npm | `flatbuffers-format` |
| Prettier plugin | npm | `prettier-plugin-flatbuffers` |
| Tree-sitter grammar | npm | `tree-sitter-flatbuffers` |
| VS Code extension | VS Code Marketplace + Open VSX | `emindeniz99.vscode-flatbuffers` |
| JetBrains plugin | JetBrains Marketplace | `io.github.emindeniz99.flatbuffers` |
| Browser editor integrations | npm | `flatbuffers-format-editors` |
| Native binaries | GitHub Releases | `flatbuffers-format-{linux,macos,windows}-{x64,arm64}` |
| WASI module | GitHub Releases | `flatbuffers-format.wasm` |

The unpublished `flatbuffers-formatter-handrolled` differential oracle is
not user-facing and is out of scope; vulnerabilities there are
interesting only if they also exist in the published engine.

## Supported versions

Only the latest published minor of each artefact receives security
fixes. All packages share the engine's release cadence; while the
project is pre-1.0, that means whichever `0.x` is the latest is the
only supported line.

| Version | Supported |
|---------|-----------|
| 0.1.x   | yes       |
| < 0.1   | no        |

## Reporting a vulnerability

If you've found a security-sensitive issue (anything where public
disclosure could put users at risk before a fix lands), **please do
not open a regular issue**. Use one of these private channels instead:

- **Preferred:** open a private security advisory at
  <https://github.com/emindeniz99/flatbuffers-format/security/advisories/new>.
  GitHub's advisory flow lets the maintainer reply privately and
  coordinate a fix + CVE if appropriate.
- **Fallback:** DM the maintainer on GitHub (`@emindeniz99`).

Please include:

- A minimal reproduction — a `.fbs` file or a snippet calling the
  public API, plus the package version.
- What you observe vs. what you expected.
- An assessment of impact, if you have one (DoS via parser
  pathology? Information disclosure? Memory issue in a downstream
  consumer of the AST? Sandbox escape from the WASM build?).

## Response

This is a hobby project, so response time is best-effort. Realistic
expectations:

- An acknowledgment within a week.
- A patched release coordinated with the reporter, with credit if
  desired.

## Supply-chain hardening

The release pipeline is built so that compromised maintainer
credentials are bounded in impact:

- **npm publishes** use OIDC provenance (`pnpm publish
  --provenance`), so every published version is signed by the
  GitHub Actions run that produced it. Consumers can verify
  provenance via `npm view flatbuffers-format provenance`.
- **`flatc` binary** used by the `flatc-conform` test gate is
  SHA256-pinned in `.github/workflows/flatbuffers-ci.yml`. The pinning fails
  loudly on any tarball mismatch — see the comment above the pin.
- **`javy` binary** used by the WASM build is version-pinned in
  `.github/workflows/flatbuffers-wasm-binary.yml`.
- **Native + WASM artefact equivalence** is asserted on every
  release: the WASM build round-trips against the native build
  byte-for-byte across the full corpus before either is uploaded.
- **JetBrains plugin** can ship with a Marketplace verification
  badge if `JETBRAINS_CERTIFICATE_CHAIN` / `JETBRAINS_PRIVATE_KEY` /
  `JETBRAINS_PRIVATE_KEY_PASSWORD` are configured.
- **macOS native binaries** are Developer-ID-signed and Apple-
  notarized when the `APPLE_*` secrets are configured. Without
  them the workflow falls back to an ad-hoc codesign and
  Gatekeeper quarantines downloaded copies until cleared manually.
- **Every native binary** ships with a SHA256 sidecar
  (`<asset>.sha256`) generated at build time. The IntelliJ
  plugin's bundled-engine downloader fetches the sidecar before
  the binary and refuses to install on mismatch — defence against
  in-transit tampering of the downloaded artefact.
- **Dependency cooldown** — Dependabot won't propose a new
  upstream version until it's been on the registry for 7 days
  (30 for semver-major). pnpm's `minimum-release-age=10080`
  (in `.npmrc`) enforces the same gate at install time, so a
  developer running `pnpm add foo` can't accidentally pull in a
  malicious freshly-published version. Mitigates the malicious-
  release-and-yank attack pattern (publish poisoned `foo@1.2.4`,
  let CI/devs pick it up, yank within hours so signals stay clean).
- **SLSA build provenance** on every binary artefact (native
  binaries, `.wasm`, IntelliJ plugin `.zip`, plus each
  `.sha256` sidecar). The release workflows call
  `actions/attest-build-provenance@v2`, which signs an
  attestation linking the artefact to its exact GitHub Actions
  build run (commit SHA, workflow file, runner identity) via
  Sigstore Fulcio. Consumers verify the chain without any
  pre-shared keys — see "Verifying release artefacts" below.

## Verifying release artefacts

The release pipeline ships three layers of integrity for every
binary artefact:

1. The artefact itself.
2. A `<artefact>.sha256` sidecar in the same release (matches
   `sha256sum --check`).
3. A SLSA build-provenance attestation, signed via Sigstore
   Fulcio with the workflow's OIDC identity.

To verify a download end-to-end:

Release tags are `<package>-v<version>` — substitute the release you
actually downloaded for the versions below.

```bash
# Native binary
gh release download flatbuffers-format-v0.2.0 \
  --repo emindeniz99/flatbuffers-format \
  --pattern 'flatbuffers-format-linux-x64*'
sha256sum --check flatbuffers-format-linux-x64.sha256        # bytes match sidecar
gh attestation verify flatbuffers-format-linux-x64 \
  --repo emindeniz99/flatbuffers-format                      # provenance match

# WASM module
gh release download flatbuffers-format-v0.2.0 \
  --repo emindeniz99/flatbuffers-format \
  --pattern 'flatbuffers-format.wasm*'
sha256sum --check flatbuffers-format.wasm.sha256
gh attestation verify flatbuffers-format.wasm \
  --repo emindeniz99/flatbuffers-format

# IntelliJ plugin .zip
gh release download intellij-flatbuffers-v0.2.0 \
  --repo emindeniz99/flatbuffers-format \
  --pattern 'intellij-flatbuffers-*.zip*'
sha256sum --check intellij-flatbuffers-0.2.0.zip.sha256
gh attestation verify intellij-flatbuffers-0.2.0.zip \
  --repo emindeniz99/flatbuffers-format
```

`gh attestation verify` fails loudly if:

- the artefact has no attestation in the repo (someone uploaded
  a binary outside the CI pipeline);
- the attestation was signed for a different workflow file or
  ref (someone tried to forge an attestation from an unrelated
  workflow);
- the artefact bytes don't match what the attestation covers
  (in-flight tampering).

The IntelliJ plugin's bundled-engine downloader performs the
SHA check automatically on every download; the attestation
check is currently consumer-side (gh CLI) only.

## Out of scope

- `flatbuffers-format-handrolled` is not published and is not a
  user-facing surface; vulnerabilities there are interesting only if
  they also exist in the published package.
- Reports about Google's `flatc` itself — those go to the
  [FlatBuffers project](https://github.com/google/flatbuffers/security),
  not here.
- Theoretical issues without a repro.
- Performance regressions that don't cross into denial-of-service
  territory — those are perf bugs, not security issues. Use the
  normal issue tracker.
