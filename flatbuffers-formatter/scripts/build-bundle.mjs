#!/usr/bin/env node
// Bundle the CLI into a single, dependency-free JavaScript file.
//
// This is the one place the esbuild invocation lives. Two consumers:
//
//   1. `build-native.mjs` — imports `bundleCli()` and glues the result
//      into a Node SEA blob (the ~105 MiB self-contained binary).
//   2. `intellij-flatbuffers` — its Gradle `bundleEngineJs` task runs
//      this file as a CLI and drops the result into the plugin's
//      resources, so the plugin ships the ~620 KiB *formatter* instead
//      of forcing every user to fetch the 105 MiB *runtime + formatter*.
//
// Keeping the flags here (rather than copied into the Gradle build)
// means the two artifacts can never drift: same entry point, same
// bundler version from the lockfile, same baked-in version string.
//
// Usage:
//   node scripts/build-bundle.mjs --outfile <path> [--target node20]
//
// Flags:
//   --outfile <path>  Where to write the bundle. Required. Parent
//                     directories are created by esbuild.
//   --target <t>      esbuild target (default: `node<engines.node floor>`).

import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
export const projectDir = resolve(here, "..");

function readPackageJson() {
  return JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8"));
}

/**
 * Lowest Node major the engine claims to support, parsed out of
 * `engines.node`. Consumers that need to gate a runtime (the IntelliJ
 * plugin refuses to run the bundle on an older Node) must read the
 * floor from here rather than hardcoding a number that silently drifts
 * when package.json changes.
 */
export function nodeMajorFloor() {
  const range = readPackageJson().engines?.node ?? "";
  const match = /(\d+)/.exec(range);
  if (!match) {
    throw new Error(
      `cannot derive a Node major floor from engines.node = ${JSON.stringify(range)}`,
    );
  }
  return Number(match[1]);
}

/**
 * Bundles `dist/src/cli.js` (and everything it imports) into `outFile`.
 *
 * @param {{ outFile: string, target?: string }} options
 * @returns {{ outFile: string, version: string, target: string }}
 */
export function bundleCli({ outFile, target = `node${nodeMajorFloor()}` }) {
  if (!outFile) throw new Error("bundleCli: outFile is required");

  const cliEntry = join(projectDir, "dist", "src", "cli.js");
  try {
    statSync(cliEntry);
  } catch {
    throw new Error(
      `${cliEntry} not found. Run \`pnpm --filter flatbuffers-format build\` first.`,
    );
  }

  // Read the version out of the engine's package.json so we can bake it
  // into the bundle. Neither consumer can read a real package.json at
  // runtime: a SEA blob has no `import.meta.url` that resolves, and the
  // IntelliJ plugin extracts a lone .cjs into the IDE system directory.
  const version = readPackageJson().version;

  // esbuild is a declared devDependency, invoked through its resolved
  // entry point rather than through `npx --yes esbuild`. The npx form
  // never worked in CI: npx resolves against the working directory, and
  // in a pnpm workspace this package's node_modules has no esbuild to
  // find. Resolving it here also pins the version to the lockfile
  // instead of running whatever npm serves at build time.
  const esbuildBin = createRequire(import.meta.url).resolve("esbuild/bin/esbuild");

  const result = spawnSync(
    process.execPath,
    [
      esbuildBin,
      cliEntry,
      "--bundle",
      "--platform=node",
      `--target=${target}`,
      // CJS, not ESM: SEA blobs are CJS-only today, and a lone `.cjs`
      // dropped anywhere on disk runs as CommonJS regardless of what
      // `"type"` the nearest ancestor package.json happens to declare.
      "--format=cjs",
      `--outfile=${outFile}`,
      // Drop the shebang — the SEA-injected runtime owns the entry point.
      "--banner:js=",
      // Substitute the version-read env lookup with a string literal.
      // cli.ts checks `process.env.FLATBUFFERS_FORMAT_VERSION` first
      // before falling back to the (unreachable here) package.json read.
      `--define:process.env.FLATBUFFERS_FORMAT_VERSION=${JSON.stringify(version)}`,
    ],
    // No `shell` here, deliberately. Routing this through cmd/pwsh on
    // Windows STRIPS the quotes that JSON.stringify puts around the
    // version, and esbuild then rejects `--define:...=0.2.0` with
    // "Invalid define value (must be an entity name or JS literal)".
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`esbuild failed with exit code ${result.status ?? "unknown"}`);
  }

  return { outFile, version, target };
}

// --- CLI --------------------------------------------------------------------

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const readFlag = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };
  const outFile = readFlag("--outfile");
  if (!outFile) {
    console.error("usage: node scripts/build-bundle.mjs --outfile <path> [--target node20]");
    process.exit(2);
  }
  try {
    const built = bundleCli({
      outFile: resolve(outFile),
      target: readFlag("--target") ?? undefined,
    });
    const size = statSync(built.outFile).size;
    console.log(
      `Bundled flatbuffers-format ${built.version} (${built.target}) -> ` +
        `${built.outFile} (${(size / 1024).toFixed(0)} KiB)`,
    );
  } catch (err) {
    console.error(`build-bundle: ${err.message}`);
    process.exit(1);
  }
}
