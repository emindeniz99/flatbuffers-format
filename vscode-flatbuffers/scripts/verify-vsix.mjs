#!/usr/bin/env node
// Smoke-test a packaged .vsix: does the extension the user installs
// actually activate?
//
// `vsce package` succeeding proves very little. Its validators check the
// manifest and that the `main` file is present in the archive — they do not
// load it. Two failure modes slip straight through and only show up as a
// broken install:
//
//   1. the entry point is ESM while the extension host `require()`s it, and
//   2. the entry point imports a runtime dependency that `.vscodeignore`
//      kept out of the archive (`Cannot find module 'flatbuffers-format'`).
//
// So: pull the packaged entry point straight out of the archive, drop it in
// a temp directory that has no `node_modules` anywhere above it, `require()`
// it with only `vscode` injected, and format a real schema through the
// provider it registers. Anything the bundle failed to inline is
// MODULE_NOT_FOUND here.
//
// Usage: node scripts/verify-vsix.mjs <path-to-.vsix>

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const vsixPath = process.argv[2];
if (!vsixPath) {
  console.error("verify-vsix: usage: node scripts/verify-vsix.mjs <path-to-.vsix>");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
// vsce lays the extension out under `extension/` inside the archive.
const entryInVsix = `extension/${manifest.main.replace(/^\.\//, "")}`;

// `unzip -p` writes one member to stdout; no full extraction needed.
const extracted = spawnSync("unzip", ["-p", vsixPath, entryInVsix], {
  maxBuffer: 64 * 1024 * 1024,
});
if (extracted.error || extracted.status !== 0 || extracted.stdout.length === 0) {
  console.error(
    `verify-vsix: could not read ${entryInVsix} from ${vsixPath}` +
      (extracted.error ? ` (${extracted.error.message})` : ""),
  );
  process.exit(1);
}

// Outside the workspace on purpose: module resolution must not be able to
// walk up into a node_modules that would paper over a missing bundle.
const dir = mkdtempSync(join(tmpdir(), "vsix-verify-"));
const bundlePath = join(dir, "bundle.cjs");
writeFileSync(bundlePath, extracted.stdout);

const driver = `
const assert = require("node:assert");
const Module = require("node:module");

const registered = [];
const errors = [];
class Position { constructor(offset) { this.offset = offset; } }
class Range { constructor(start, end) { this.start = start; this.end = end; } }
class TextEdit {
  constructor(range, newText) { this.range = range; this.newText = newText; }
  static replace(range, newText) { return new TextEdit(range, newText); }
}
const vscode = {
  Position, Range, TextEdit,
  languages: {
    registerDocumentFormattingEditProvider(selector, provider) {
      registered.push({ selector, provider });
      return { dispose() {} };
    },
  },
  workspace: { getConfiguration: () => ({ get: () => undefined }) },
  window: { showErrorMessage(m) { errors.push(m); return Promise.resolve(); } },
};
const origLoad = Module._load;
Module._load = (request, ...rest) =>
  request === "vscode" ? vscode : origLoad.call(Module, request, ...rest);

// The extension host loads \`main\` with require(). An ESM entry point dies here.
const ext = require(${JSON.stringify(bundlePath)});
assert.strictEqual(typeof ext.activate, "function", "activate() must be exported");
assert.strictEqual(typeof ext.deactivate, "function", "deactivate() must be exported");

ext.activate({ subscriptions: [] });
assert.strictEqual(registered.length, 1, "activate() registers one formatting provider");
assert.strictEqual(registered[0].selector, "flatbuffers");
const provider = registered[0].provider;
const doc = (text) => ({ fileName: "a.fbs", getText: () => text, positionAt: (o) => new Position(o) });

// Formatting must reach the bundled engine and produce canonical output.
const edits = provider.provideDocumentFormattingEdits(doc('table T{x:int;y:string="hi";}'), { tabSize: 2 });
assert.deepStrictEqual(errors, [], "no error notification on valid input");
assert.strictEqual(edits.length, 1, "one whole-document TextEdit");
assert.strictEqual(edits[0].newText, 'table T {\\n  x: int;\\n  y: string = "hi";\\n}\\n');

// Canonical input must produce no edits, or format-on-save would loop.
assert.deepStrictEqual(
  provider.provideDocumentFormattingEdits(doc(edits[0].newText), { tabSize: 2 }), [],
  "already-formatted input yields no edits",
);

// A parse error is a notification, never a thrown exception into the host.
assert.deepStrictEqual(
  provider.provideDocumentFormattingEdits(doc("table T { x: }"), { tabSize: 2 }), [],
);
assert.strictEqual(errors.length, 1, "parse error surfaced as one notification");

ext.deactivate();
`;
const driverPath = join(dir, "driver.cjs");
writeFileSync(driverPath, driver);

const run = spawnSync(process.execPath, [driverPath], { cwd: dir, stdio: "inherit" });
if (run.status !== 0) {
  console.error(`verify-vsix: the packaged extension failed to activate (${vsixPath})`);
  process.exit(run.status ?? 1);
}
console.log(`verify-vsix: ${vsixPath} activates and formats correctly.`);
