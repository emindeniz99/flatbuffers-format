#!/usr/bin/env node
// Walks the compiled test output and feeds each `*.test.js` to Node's
// built-in test runner. Same pattern the engine and the sibling
// packages use — avoids the Node 22 "directory-as-CJS-module" bug we
// hit when passing `dist-test/test/` directly to `node --test`.

import { readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "dist-test", "test");

function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...collect(p));
    else if (entry.endsWith(".test.js")) out.push(p);
  }
  return out;
}

const files = collect(root);
if (files.length === 0) {
  console.error(`No *.test.js files under ${root}. Did you run \`tsc -p tsconfig.test.json\`?`);
  process.exit(1);
}

const r = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(r.status ?? 1);
