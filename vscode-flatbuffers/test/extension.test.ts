// Unit tests for the parts of the extension that can run outside a
// real VS Code host. The activation function itself touches the
// `vscode` module which only exists when the extension is loaded by
// VS Code or @vscode/test-electron — we don't take that dependency
// here. The pure `formatText` helper covers the actual logic.

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatText } from "../src/format.js";

test("formatText: ugly input returns kind='ok' with canonical text", () => {
  // Multi-field input keeps the table expanded under default
  // compactSingleLine: true.
  const result = formatText("table T{x:int;y:string;}\n", { indent: 2 });
  assert.equal(result.kind, "ok");
  if (result.kind === "ok") {
    assert.equal(result.text, "table T {\n  x: int;\n  y: string;\n}\n");
  }
});

test("formatText: already-canonical input returns kind='noop'", () => {
  const result = formatText("table T {\n  x: int;\n  y: string;\n}\n", { indent: 2 });
  assert.equal(result.kind, "noop");
});

test("formatText: indent option is forwarded", () => {
  const result = formatText("table T{x:int;y:string;}\n", { indent: 4 });
  assert.equal(result.kind, "ok");
  if (result.kind === "ok") {
    assert.equal(result.text, "table T {\n    x: int;\n    y: string;\n}\n");
  }
});

test("formatText: parse error returns kind='error' with line:col", () => {
  const result = formatText("table T { foo bar }\n", { indent: 2 });
  assert.equal(result.kind, "error");
  if (result.kind === "error") {
    // Format: "<line>:<col>: <message without 'line N:M ' prefix>"
    assert.match(result.message, /^\d+:\d+:/);
  }
});

test("formatText: new options round-trip — useTabs + compactSingleLine off", () => {
  // Pin that the full FormatOptions shape flows through the wrapper.
  const result = formatText("table T{x:int;}\n", {
    indent: 1,
    useTabs: true,
    compactSingleLine: false,
  });
  assert.equal(result.kind, "ok");
  if (result.kind === "ok") {
    // useTabs=true with indent=1 → one tab per level.
    // compactSingleLine=false → single-field table stays expanded.
    assert.equal(result.text, "table T {\n\tx: int;\n}\n");
  }
});
