#!/usr/bin/env node
// Cross-platform test runner: discovers compiled test files under
// dist-test/test/ and invokes `node --test` with them as explicit args.
//
// Why this exists: `node --test dist-test/test/*.test.js` works on
// bash but breaks on Windows cmd.exe (no glob expansion), and Node
// 22's bare `--test <dir>` tries to *load* the directory as a CJS
// module instead of walking it for test files. This runner does the
// directory walk in JS, so it works the same on Linux, macOS, and
// Windows — and the test scripts in package.json stay one line.

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
