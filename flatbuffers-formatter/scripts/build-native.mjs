#!/usr/bin/env node
// Build a single-file native executable of `flatbuffers-format` using
// Node 22's Single Executable Application (SEA) feature.
// See https://nodejs.org/api/single-executable-applications.html
//
// What this produces:
//   build/native/flatbuffers-format[.exe] — a standalone binary that
//   embeds the Node runtime + the bundled CLI. Drop it on PATH and run
//   `flatbuffers-format --check schema.fbs` without needing Node
//   installed. Same CLI surface as the npm-installed version.
//
// Why Node SEA over alternatives:
//   - `bun build --compile`: requires Bun on the build machine, and
//     locks consumers to Bun-compatible runtime semantics.
//   - `deno compile`: same, but for Deno.
//   - `pkg`: deprecated since 2023.
//   - `nexe`: still alive but third-party, and SEA-style is now first-
//     party.
//   Node SEA is the official path, ships with Node 22, and uses the
//   exact runtime our tests already gate. No new runtime gap.
//
// Cross-platform builds:
//   You can only build a SEA for the platform you're currently on (the
//   blob is byte-glued to the host `node` binary). The
//   .github/workflows/native-binaries.yml matrix runs this script on
//   {linux-x64, linux-arm64, macos-13/x64, macos-14/arm64,
//   windows-2022/x64} and uploads the artifacts.
//
// Local usage:
//   cd flatbuffers-formatter
//   npm run build          # produces dist/
//   node scripts/build-native.mjs
//   ./build/native/flatbuffers-format --version
//
// Flags:
//   --out-dir <dir>   Override the output directory (default: build/native).
//   --no-sign         Skip macOS codesign (the binary still runs, but
//                     macOS Gatekeeper will quarantine downloaded
//                     copies until manually approved).
//   --developer-id "Developer ID Application: …"
//                     macOS only. Sign with a proper Developer ID
//                     Application certificate instead of the
//                     default ad-hoc signature. Required for
//                     Apple notarization (CI runs `xcrun
//                     notarytool submit` after this script when
//                     the secret is configured).
//   --no-sha          Skip writing a .sha256 sidecar alongside the
//                     binary. Sidecars are how the IntelliJ plugin
//                     (and any downstream consumer) verifies the
//                     downloaded binary matches what the release
//                     pipeline produced.

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { platform, arch } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(here, "..");

const args = process.argv.slice(2);
const outDir = (() => {
  const idx = args.indexOf("--out-dir");
  if (idx !== -1 && args[idx + 1]) return resolve(args[idx + 1]);
  return join(projectDir, "build", "native");
})();
const skipSign = args.includes("--no-sign");
const skipSha = args.includes("--no-sha");
const developerId = (() => {
  const idx = args.indexOf("--developer-id");
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
})();

const exeName = platform() === "win32" ? "flatbuffers-format.exe" : "flatbuffers-format";
const exePath = join(outDir, exeName);
const bundlePath = join(outDir, "cli.bundle.js");
const seaConfigPath = join(outDir, "sea-config.json");
const blobPath = join(outDir, "cli.blob");

console.log(`Target: ${platform()}-${arch()}`);
console.log(`Out:    ${outDir}`);

// --- 0. Sanity: dist/ must exist (npm run build) ----------------------------

const cliEntry = join(projectDir, "dist", "src", "cli.js");
try {
  statSync(cliEntry);
} catch {
  console.error("dist/src/cli.js not found. Run `npm run build` first.");
  process.exit(1);
}

// --- 1. Fresh out dir -------------------------------------------------------

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// --- 2. Bundle the CLI into a single, dep-free .js --------------------------
// esbuild is a declared devDependency, invoked through its resolved
// entry point rather than through `npx --yes esbuild`.
//
// The npx form avoided declaring a devDep and never worked: every leg
// of flatbuffers-native-binaries.yml died with `sh: 1: esbuild: not
// found`, so that workflow had never once succeeded and no release ever
// received a binary. npx resolves against the working directory, and in
// a pnpm workspace this package's node_modules has no esbuild to find.
// It looked fine locally only because an unrelated sibling package had
// pulled esbuild into the store.
//
// Resolving it here also pins the version to the lockfile instead of
// running whatever npm serves at build time — no unpinned download
// during a release.

// Read the version out of the engine's package.json so we can bake
// it into the bundle — the SEA blob has no runtime access to a real
// package.json (`import.meta.url` doesn't resolve there).
const pkgVersion = JSON.parse(
  readFileSync(join(projectDir, "package.json"), "utf8"),
).version;
console.log(`Embedding version: ${pkgVersion}`);

console.log("Bundling CLI with esbuild...");
const esbuildBin = createRequire(import.meta.url).resolve("esbuild/bin/esbuild");
const esbuildRes = spawnSync(
  process.execPath,
  [
    esbuildBin,
    cliEntry,
    "--bundle",
    "--platform=node",
    "--target=node22",
    "--format=cjs", // SEA blobs are CJS today; v22 doesn't support ESM blob entry.
    "--outfile=" + bundlePath,
    // Drop the shebang — the SEA-injected runtime owns the entry point.
    "--banner:js=",
    // Substitute the version-read env lookup with a string literal.
    // cli.ts checks `process.env.FLATBUFFERS_FORMAT_VERSION` first
    // before falling back to the (unreachable from a SEA blob)
    // package.json read.
    `--define:process.env.FLATBUFFERS_FORMAT_VERSION=${JSON.stringify(pkgVersion)}`,
  ],
  { stdio: "inherit", shell: process.platform === "win32" },
);
if (esbuildRes.status !== 0) {
  console.error("esbuild failed");
  process.exit(esbuildRes.status ?? 1);
}

// --- 3. Generate the SEA blob -----------------------------------------------

writeFileSync(
  seaConfigPath,
  JSON.stringify(
    {
      main: bundlePath,
      output: blobPath,
      // disableExperimentalSEAWarning silences the runtime nag when the
      // resulting binary is invoked. Users see clean output.
      disableExperimentalSEAWarning: true,
      // useSnapshot=true would faster-start but requires the bundle to
      // be designed for V8 snapshotting (no side-effects at top-level
      // beyond what is also fine on resume). Our CLI does CLI parsing
      // at top level which is fine to repeat → leave off until measured.
      useSnapshot: false,
      // useCodeCache=true is generally a free win — V8 bytecode is
      // serialized into the blob, cutting startup by ~30% on a cold
      // run. No downsides for our CLI.
      useCodeCache: true,
    },
    null,
    2,
  ) + "\n",
);

console.log("Generating SEA blob...");
const seaRes = spawnSync(
  process.execPath,
  ["--experimental-sea-config", seaConfigPath],
  { stdio: "inherit" },
);
if (seaRes.status !== 0) {
  console.error("SEA blob generation failed");
  process.exit(seaRes.status ?? 1);
}

// --- 4. Copy host node binary as the new exe --------------------------------

copyFileSync(process.execPath, exePath);

// --- 5. Inject the blob via postject ---------------------------------------
// postject is a thin CLI over the platform's binary section editor
// (objcopy on Linux, machoman-ish on macOS, EditBin equivalent on
// Windows). It's the documented tool from the Node SEA guide.

console.log("Injecting SEA blob with postject...");
const postjectArgs = [
  "--yes",
  "postject",
  exePath,
  "NODE_SEA_BLOB",
  blobPath,
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
];
if (platform() === "darwin") {
  postjectArgs.push("--macho-segment-name", "NODE_SEA");
}
const postjectRes = spawnSync("npx", postjectArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (postjectRes.status !== 0) {
  console.error("postject failed");
  process.exit(postjectRes.status ?? 1);
}

// --- 6. Sign (macOS) so Gatekeeper doesn't quarantine downloads -------------
// Two modes:
//
//   (a) `--developer-id "Developer ID Application: <Name> (<TEAM>)"`
//       provided → full Developer ID signing with hardened runtime
//       (`--options=runtime`). Required for Apple notarization.
//       The certificate must already be in the host keychain
//       (the CI workflow imports it from a `p12` secret before
//       calling this script).
//
//   (b) Otherwise → `codesign --sign -` ad-hoc signature. Enough for
//       local use and to ship via "Install from disk" sideloading,
//       but downloaded copies will be quarantined by Gatekeeper
//       until `xattr -dr com.apple.quarantine`.

if (platform() === "darwin" && !skipSign) {
  if (developerId) {
    console.log(`Codesigning with Developer ID: ${developerId}`);
    const signRes = spawnSync(
      "codesign",
      [
        "--sign", developerId,
        "--force",
        "--timestamp",
        "--options", "runtime",
        exePath,
      ],
      { stdio: "inherit" },
    );
    if (signRes.status !== 0) {
      console.error("Developer ID codesign failed — refusing to produce an unsigned/badly-signed binary.");
      process.exit(signRes.status ?? 1);
    }
  } else {
    console.log("Ad-hoc codesigning (macOS, --developer-id not provided)...");
    const signRes = spawnSync(
      "codesign",
      ["--sign", "-", "--force", "--timestamp=none", exePath],
      { stdio: "inherit" },
    );
    if (signRes.status !== 0) {
      console.warn(
        "codesign failed; binary still runs locally but downloaded copies will be quarantined by Gatekeeper.",
      );
    }
  }
}

// --- 7. Emit SHA256 sidecar -------------------------------------------------
// Consumers (the IntelliJ plugin downloader, anyone curling the
// binary) verify the bytes against this sidecar before trusting
// them. The sidecar is plain `<sha256>  <filename>\n` — same format
// `sha256sum` emits — so it round-trips with `sha256sum --check
// <file>.sha256`.
//
// Note: the sidecar is a defense against tampering of the BINARY
// during transit / storage. It is NOT itself signed; an attacker
// who can replace the binary on GitHub Releases can also replace
// the sidecar. The stronger guarantee comes from GitHub
// attestations / cosign, which is a follow-up.

if (!skipSha) {
  const sha = createHash("sha256").update(readFileSync(exePath)).digest("hex");
  const sidecarPath = `${exePath}.sha256`;
  writeFileSync(sidecarPath, `${sha}  ${basename(exePath)}\n`);
  console.log(`SHA256: ${sha}`);
  console.log(`Sidecar: ${sidecarPath}`);
}

// --- 7. Report --------------------------------------------------------------

const size = statSync(exePath).size;
console.log(`\nDone. ${exePath} (${(size / 1024 / 1024).toFixed(1)} MiB)`);
console.log(`Test:   ${exePath} --version`);
