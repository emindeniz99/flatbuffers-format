#!/usr/bin/env node
// Layer-2 round-trip test:
//   parse every .fbs file in flatbuffers-formatter/test/corpus/
//   and assert the parse tree contains zero ERROR / MISSING nodes.
//
// This is the "real schemas don't break" check. The formatter's corpus
// is the canonical body of FlatBuffers syntax we have to support — if
// any file produces errors, the grammar is the source of truth that
// must be widened.
//
// Uses `tree-sitter parse` from the CLI rather than the JS bindings
// so we don't need a compiled native .node — the CLI shells out to
// the generated parser.c via its own internal build.

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const corpusDir = resolve(projectRoot, "..", "flatbuffers-formatter", "test", "corpus");

const files = readdirSync(corpusDir)
  .filter((f) => f.endsWith(".fbs"))
  .sort();

if (files.length === 0) {
  console.error(`No .fbs files found in ${corpusDir}`);
  process.exit(1);
}

let pass = 0;
const failures = [];

for (const file of files) {
  const fullPath = join(corpusDir, file);
  // `tree-sitter parse --quiet` exits non-zero if the parse contains
  // ERROR nodes; the printed sexp on stdout still includes them so we
  // can grep as a belt-and-braces check.
  const result = spawnSync("npx", ["--no-install", "tree-sitter", "parse", "--quiet", fullPath], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  const out = `${result.stdout}\n${result.stderr}`;
  const hasError = /ERROR|MISSING/.test(out) || result.status !== 0;
  if (hasError) {
    failures.push({ file, output: out.trim().slice(0, 400) });
  } else {
    pass++;
  }
}

const total = files.length;
console.log(
  `[parse-corpus] ${pass}/${total} formatter-corpus files parsed with zero ERROR/MISSING nodes`,
);

if (failures.length > 0) {
  console.error("\nFailures:");
  for (const { file, output } of failures) {
    console.error(`\n--- ${file} ---`);
    console.error(output);
  }
  process.exit(1);
}
