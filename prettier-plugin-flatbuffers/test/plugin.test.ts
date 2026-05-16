import { strict as assert } from "node:assert";
import { test } from "node:test";
import prettier from "prettier";
import plugin from "../src/index.js";

// All tests run prettier.format with our plugin in-memory; nothing
// touches the filesystem so the suite stays hermetic.

test("round-trip: ugly .fbs becomes canonical", async () => {
  const ugly = "table T{x:int;y:string=\"hi\";}\n";
  const out = await prettier.format(ugly, {
    parser: "flatbuffers-format",
    plugins: [plugin],
  });
  // The flatbuffers-format engine's canonical form: opening brace on the
  // same line, two-space indent, one field per line, trailing newline.
  // We pin the WHOLE output, not just shape, because the entire point of
  // this plugin is "byte-identical to flatbuffers-format". If this string
  // ever needs updating, the engine's behavior — not the plugin — changed.
  assert.equal(out, 'table T {\n  x: int;\n  y: string = "hi";\n}\n');
});

test("auto-detection by .fbs extension picks our parser", async () => {
  // Multi-field input keeps the table expanded under default
  // compactSingleLine: true.
  const src = "table T{x:int;y:string;}\n";
  const out = await prettier.format(src, {
    filepath: "schema.fbs",
    plugins: [plugin],
  });
  assert.equal(out, "table T {\n  x: int;\n  y: string;\n}\n");
});

test("tabWidth: 4 produces 4-space indent", async () => {
  const src = "table T{x:int;y:string;}\n";
  const out = await prettier.format(src, {
    parser: "flatbuffers-format",
    plugins: [plugin],
    tabWidth: 4,
  });
  // 4 leading spaces in front of each field — verifies tabWidth flows
  // to flatbuffers-format's `indent` option.
  assert.equal(out, "table T {\n    x: int;\n    y: string;\n}\n");
});

test("useTabs: true forwards to the engine and produces tab indentation", async () => {
  // The engine now supports tab indentation natively (since
  // flatbuffers-format 0.2.0), so Prettier's `useTabs: true` is
  // honored end-to-end instead of silently degrading to spaces.
  const src = "table T{x:int;y:string;}\n";
  const out = await prettier.format(src, {
    parser: "flatbuffers-format",
    plugins: [plugin],
    useTabs: true,
    tabWidth: 1,
  });
  assert.ok(out.includes("\t"), "expected tab characters in output");
  assert.equal(out, "table T {\n\tx: int;\n\ty: string;\n}\n");
});

test("printWidth: 40 forwards to the engine's lineWidth", async () => {
  // Small enum that would collapse at the default printWidth of 80
  // must expand when printWidth is small enough that the compact form
  // no longer fits.
  const src = "enum Color: byte { Red, Green, Blue, Alpha, Magenta }\n";
  const out = await prettier.format(src, {
    parser: "flatbuffers-format",
    plugins: [plugin],
    printWidth: 30,
  });
  // Expanded form: one value per line.
  assert.match(out, /^  Red,$/m, "narrow printWidth must force expansion");
});

test("endOfLine: 'crlf' produces CRLF newlines", async () => {
  // Multi-field stays expanded so we exercise CRLF on every emitted line.
  const src = "table T{x:int;y:string;}\n";
  const out = await prettier.format(src, {
    parser: "flatbuffers-format",
    plugins: [plugin],
    endOfLine: "crlf",
  });
  assert.ok(out.includes("\r\n"), "expected CRLF in output");
  assert.equal(out, "table T {\r\n  x: int;\r\n  y: string;\r\n}\r\n");
});

test("bad input surfaces a SyntaxError with loc.start", async () => {
  // `x: ` with nothing after the colon is a hard parse error in the engine.
  const bad = "table T { x: }\n";
  let err: unknown;
  try {
    await prettier.format(bad, {
      parser: "flatbuffers-format",
      plugins: [plugin],
    });
  } catch (e) {
    err = e;
  }
  assert.ok(err, "expected prettier.format to throw on invalid input");
  // Prettier wraps thrown errors but preserves the `loc` shape in its
  // own diagnostic. We assert on the message + presence of a line:col
  // hint — that proves the FormatError → SyntaxError mapping is reaching
  // Prettier's diagnostic layer.
  const msg = String((err as Error).message);
  assert.match(msg, /line\s*\d+/i, `expected line/col in error message, got: ${msg}`);
});
