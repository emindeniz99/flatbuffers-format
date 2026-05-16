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
//   cd projects/flatbuffers-formatter
//   npm run build          # produces dist/
//   node scripts/build-native.mjs
//   ./build/native/flatbuffers-format --version
//
// Flags:
//   --out-dir <dir>   Override the output directory (default: build/native).
//   --no-sign         Skip macOS codesign (the binary still runs, but
//                     macOS Gatekeeper will quarantine downloaded
//                     copies until manually approved).

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
// esbuild is invoked via `npx --yes` so we don't need it as a devDep.
// Same pattern used by scripts/bench.mjs for the size-measurement bundle.

// Read the version out of the engine's package.json so we can bake
// it into the bundle — the SEA blob has no runtime access to a real
// package.json (`import.meta.url` doesn't resolve there).
const pkgVersion = JSON.parse(
  readFileSync(join(projectDir, "package.json"), "utf8"),
).version;
console.log(`Embedding version: ${pkgVersion}`);

console.log("Bundling CLI with esbuild...");
const esbuildRes = spawnSync(
  "npx",
  [
    "--yes",
    "esbuild",
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
// `codesign --sign -` is the ad-hoc signature: enough for local use
// and CI artifact upload. Real distribution wants a proper Developer
// ID signature + notarization, which is out of scope for v0.1 and
// needs paid Apple Developer Program enrollment.

if (platform() === "darwin" && !skipSign) {
  console.log("Ad-hoc codesigning (macOS)...");
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

// --- 7. Report --------------------------------------------------------------

const size = statSync(exePath).size;
console.log(`\nDone. ${exePath} (${(size / 1024 / 1024).toFixed(1)} MiB)`);
console.log(`Test:   ${exePath} --version`);
