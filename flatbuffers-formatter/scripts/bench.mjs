#!/usr/bin/env node
// Reproducible benchmark for flatbuffers-format.
//
// Reports three numbers users care about:
//   1. In-process throughput against the test corpus
//      (files/sec + µs/file). Most useful for evaluating "is this
//      fast enough for my repo's pre-commit hook?".
//   2. Cold-start CLI time (`node dist/src/cli.js <file>`) — the
//      experience of running `npx flatbuffers-format` once.
//   3. Bundle size: minified + gzipped output of esbuild-bundling the
//      public API. Most useful for browser/CDN consumers.
//
// Run via `node scripts/bench.mjs` after `npm run build`. Numbers are
// machine-specific; this script's job is to make them reproducible.
//
// Flags:
//   --json            Emit a single JSON object to stdout (no stderr,
//                     no human-readable text). Schema documented at the
//                     bottom of this file.
//   --repeat N        Run the in-process + cold-start blocks N times
//                     and emit the per-metric MEDIAN. Bundle size is
//                     deterministic per build, so it's measured once.
//                     Default 1. Used by CI to reduce runner noise.

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { format } from "../dist/src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(here, "..");
const corpusDir = join(projectDir, "test", "corpus");
const cliPath = join(projectDir, "dist", "src", "cli.js");

// --- arg parsing ------------------------------------------------------------

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
let repeat = 1;
const repeatIdx = args.indexOf("--repeat");
if (repeatIdx !== -1 && args[repeatIdx + 1]) {
  repeat = Math.max(1, parseInt(args[repeatIdx + 1], 10) || 1);
}

// In JSON mode every print() is a no-op so stderr/stdout stay clean for
// the JSON payload (which is emitted once at the very end).
const print = jsonMode ? () => {} : (...a) => console.log(...a);

// --- 1. In-process throughput -----------------------------------------------

const files = readdirSync(corpusDir)
  .filter((f) => f.endsWith(".fbs"))
  .map((f) => readFileSync(join(corpusDir, f), "utf8"));
const totalBytes = files.reduce((a, s) => a + s.length, 0);

// Warmup so JIT settles. Done once across all repeats.
for (let i = 0; i < 100; i++) for (const src of files) format(src);

function runInProcess() {
  const N = 1000;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) for (const src of files) format(src);
  const t1 = process.hrtime.bigint();
  const elapsedNs = Number(t1 - t0);
  const callCount = N * files.length;
  return {
    iterations: N,
    elapsed_ms: elapsedNs / 1e6,
    us_per_call: elapsedNs / callCount / 1000,
    files_per_sec: (callCount / elapsedNs) * 1e9,
  };
}

const inProcessRuns = [];
for (let r = 0; r < repeat; r++) inProcessRuns.push(runInProcess());
const inProcess = medianRun(inProcessRuns, ["elapsed_ms", "us_per_call", "files_per_sec"]);

print("In-process throughput");
print(`  Corpus: ${files.length} files, ${totalBytes.toLocaleString()} bytes`);
print(
  `  Calls:  ${(inProcess.iterations * files.length).toLocaleString()} format() in ${inProcess.elapsed_ms.toFixed(1)} ms`,
);
print(
  `  Speed:  ${inProcess.us_per_call.toFixed(1)} µs/file, ${Math.round(inProcess.files_per_sec).toLocaleString()} files/sec`,
);
print();

// --- 2. Cold-start CLI time -------------------------------------------------

const sampleFile = join(corpusDir, "17-comprehensive-canonical.fbs");
const sampleBytes = statSync(sampleFile).size;

function runColdStart() {
  const samples = [];
  for (let i = 0; i < 3; i++) spawnSync(process.execPath, [cliPath, sampleFile], { stdio: "ignore" }); // warmup
  for (let i = 0; i < 25; i++) {
    const u0 = process.hrtime.bigint();
    spawnSync(process.execPath, [cliPath, sampleFile], { stdio: "ignore" });
    const u1 = process.hrtime.bigint();
    samples.push(Number(u1 - u0) / 1e6);
  }
  samples.sort((a, b) => a - b);
  return {
    min_ms: samples[0],
    median_ms: samples[Math.floor(samples.length / 2)],
    p90_ms: samples[Math.floor(samples.length * 0.9)],
  };
}

const coldRuns = [];
for (let r = 0; r < repeat; r++) coldRuns.push(runColdStart());
const cold = medianRun(coldRuns, ["min_ms", "median_ms", "p90_ms"]);

print("Cold-start CLI (`node dist/src/cli.js <file>`)");
print(`  Sample file: ${sampleFile.split("/").slice(-3).join("/")} (${sampleBytes.toLocaleString()} bytes)`);
print(`  median: ${cold.median_ms.toFixed(1)} ms,  p90: ${cold.p90_ms.toFixed(1)} ms,  min: ${cold.min_ms.toFixed(1)} ms`);
print();

// --- 3. Bundle size ---------------------------------------------------------
// Uses esbuild via npx; only installed at bench time, not as a dep.
// Deterministic per build — measured once even with --repeat.

print("Minified + gzipped browser bundle");
const tmpFile = "/tmp/flatbuffers-format-bundle.mjs";
writeFileSync(tmpFile, `export { format } from "${join(projectDir, "dist", "src", "index.js")}";\n`);
const r = spawnSync(
  "npx",
  [
    "--yes",
    "esbuild",
    tmpFile,
    "--bundle",
    "--minify",
    "--format=esm",
    "--target=es2022",
    "--outfile=/tmp/flatbuffers-format-bundle.min.js",
  ],
  { encoding: "utf8" },
);
let bundle = null;
if (r.status === 0) {
  const min = readFileSync("/tmp/flatbuffers-format-bundle.min.js");
  const gz = gzipSync(min, { level: 9 });
  bundle = { min_bytes: min.length, min_gz_bytes: gz.length };
  print(`  min:     ${min.length.toLocaleString()} bytes (${(min.length / 1024).toFixed(1)} kB)`);
  print(`  min+gz:  ${gz.length.toLocaleString()} bytes (${(gz.length / 1024).toFixed(1)} kB)`);
} else {
  print("  (esbuild not available; skipped)");
  print("  rerun with esbuild on PATH, or `npx --yes esbuild` to install ephemerally");
}

// --- JSON output ------------------------------------------------------------

if (jsonMode) {
  const shortSha = (() => {
    const g = spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" });
    return g.status === 0 ? g.stdout.trim() : "unknown";
  })();
  const payload = {
    schema_version: 1,
    node: process.version,
    commit: shortSha,
    in_process: {
      corpus_files: files.length,
      corpus_bytes: totalBytes,
      iterations: inProcess.iterations,
      elapsed_ms: round1(inProcess.elapsed_ms),
      us_per_call: round1(inProcess.us_per_call),
      files_per_sec: Math.round(inProcess.files_per_sec),
    },
    cold_start_cli: {
      sample_bytes: sampleBytes,
      min_ms: round1(cold.min_ms),
      median_ms: round1(cold.median_ms),
      p90_ms: round1(cold.p90_ms),
    },
    bundle: bundle ?? { min_bytes: 0, min_gz_bytes: 0 },
  };
  // Single-line write to avoid any interleaving with subprocesses.
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

// --- helpers ---------------------------------------------------------------

function medianRun(runs, numericKeys) {
  // Per-key median across runs. Non-numeric keys (e.g. `iterations`)
  // are copied from the first run since they're constant.
  if (runs.length === 1) return runs[0];
  const out = { ...runs[0] };
  for (const k of numericKeys) {
    const sorted = runs.map((r) => r[k]).sort((a, b) => a - b);
    out[k] = sorted[Math.floor(sorted.length / 2)];
  }
  return out;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
