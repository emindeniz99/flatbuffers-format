#!/usr/bin/env node
// Cross-platform test runner. Same pattern as the formatter's runner —
// see flatbuffers-formatter/scripts/run-tests.mjs for the
// full rationale.

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dir = "dist-test/test";
if (!existsSync(dir)) {
  console.error(`run-tests: ${dir} not found. Did you build first?`);
  process.exit(1);
}

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".test.js"))
  .map((f) => join(dir, f));

if (files.length === 0) {
  console.error(`run-tests: no *.test.js files in ${dir}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
