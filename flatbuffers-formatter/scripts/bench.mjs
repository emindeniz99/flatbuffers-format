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

// --- 1. In-process throughput -----------------------------------------------

const files = readdirSync(corpusDir)
  .filter((f) => f.endsWith(".fbs"))
  .map((f) => readFileSync(join(corpusDir, f), "utf8"));
const totalBytes = files.reduce((a, s) => a + s.length, 0);

// Warmup so JIT settles.
for (let i = 0; i < 100; i++) for (const src of files) format(src);

const N = 1000;
const t0 = process.hrtime.bigint();
for (let i = 0; i < N; i++) for (const src of files) format(src);
const t1 = process.hrtime.bigint();

const elapsedNs = Number(t1 - t0);
const callCount = N * files.length;
const usPerCall = elapsedNs / callCount / 1000;
const filesPerSec = (callCount / elapsedNs) * 1e9;

console.log("In-process throughput");
console.log(`  Corpus: ${files.length} files, ${totalBytes.toLocaleString()} bytes`);
console.log(`  Calls:  ${callCount.toLocaleString()} format() in ${(elapsedNs / 1e6).toFixed(1)} ms`);
console.log(`  Speed:  ${usPerCall.toFixed(1)} µs/file, ${Math.round(filesPerSec).toLocaleString()} files/sec`);
console.log();

// --- 2. Cold-start CLI time -------------------------------------------------

const sampleFile = join(corpusDir, "17-comprehensive-canonical.fbs");
const samples = [];
for (let i = 0; i < 3; i++) spawnSync(process.execPath, [cliPath, sampleFile], { stdio: "ignore" }); // warmup
for (let i = 0; i < 25; i++) {
  const u0 = process.hrtime.bigint();
  spawnSync(process.execPath, [cliPath, sampleFile], { stdio: "ignore" });
  const u1 = process.hrtime.bigint();
  samples.push(Number(u1 - u0) / 1e6);
}
samples.sort((a, b) => a - b);
const median = samples[Math.floor(samples.length / 2)];
const p90 = samples[Math.floor(samples.length * 0.9)];

console.log("Cold-start CLI (`node dist/src/cli.js <file>`)");
console.log(`  Sample file: ${sampleFile.split("/").slice(-3).join("/")} (${statSync(sampleFile).size.toLocaleString()} bytes)`);
console.log(`  median: ${median.toFixed(1)} ms,  p90: ${p90.toFixed(1)} ms,  min: ${samples[0].toFixed(1)} ms`);
console.log();

// --- 3. Bundle size ---------------------------------------------------------
// Uses esbuild via npx; only installed at bench time, not as a dep.

console.log("Minified + gzipped browser bundle");
const tmpFile = "/tmp/flatbuffers-format-bundle.mjs";
writeFileSync(tmpFile, `export { format } from "${join(projectDir, "dist", "src", "index.js")}";\n`);
const r = spawnSync("npx", ["--yes", "esbuild", tmpFile,
  "--bundle", "--minify", "--format=esm", "--target=es2022",
  "--outfile=/tmp/flatbuffers-format-bundle.min.js"],
  { encoding: "utf8" });
if (r.status === 0) {
  const min = readFileSync("/tmp/flatbuffers-format-bundle.min.js");
  const gz = gzipSync(min, { level: 9 });
  console.log(`  min:     ${min.length.toLocaleString()} bytes (${(min.length / 1024).toFixed(1)} kB)`);
  console.log(`  min+gz:  ${gz.length.toLocaleString()} bytes (${(gz.length / 1024).toFixed(1)} kB)`);
} else {
  console.log("  (esbuild not available; skipped)");
  console.log("  rerun with esbuild on PATH, or `npx --yes esbuild` to install ephemerally");
}
