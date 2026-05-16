import { test } from "node:test";
import assert from "node:assert/strict";
import { format, parse, check } from "../src/index.js";

test("formats a basic table declaration", () => {
  const input = `table Foo{x:int;y:string=  "hi";}`;
  const expected = `table Foo {
  x: int;
  y: string = "hi";
}
`;
  assert.equal(format(input), expected);
});

test("is a fixed point — running format twice gives the same output", () => {
  const input = `// header
namespace A.B;

/// doc
table T {
  f:int (deprecated);
  g:[ubyte];
}

enum E: byte {
  A = 1,
  B,
}

union U { A, alt: B }

rpc_service S {
  M(Req): Res;
}

root_type T;
file_identifier "ABCD";
`;
  const once = format(input);
  const twice = format(once);
  assert.equal(once, twice);
});

test("preserves line, doc, and trailing comments", () => {
  const input = `// top of file
namespace N;

/// describes a thing
table T {
  /// the id field
  id: int; // primary key
  /* block
     comment */
  name: string;
}
`;
  const out = format(input);
  assert.match(out, /\/\/ top of file/);
  assert.match(out, /\/\/\/ describes a thing/);
  assert.match(out, /\/\/\/ the id field/);
  assert.match(out, /id: int; \/\/ primary key/);
  assert.match(out, /\/\* block/);
});

test("collapses runs of blank lines to one", () => {
  const input = `namespace A;



table T { x:int; }




root_type T;
`;
  const out = format(input);
  // exactly one blank line between top-level decls
  assert.equal(out.includes("\n\n\n"), false);
  // but there is a blank between decls
  assert.match(out, /namespace A;\n\ntable T/);
});

test("metadata on a table and field", () => {
  const input = `table T (force_align: 8) { x:int (key); }`;
  const out = format(input);
  assert.equal(
    out,
    `table T (force_align: 8) {
  x: int (key);
}
`,
  );
});

test("vector and nested vector types", () => {
  const input = `table T { a:[int]; b:[[ubyte]]; }`;
  const out = format(input);
  assert.equal(
    out,
    `table T {
  a: [int];
  b: [[ubyte]];
}
`,
  );
});

test("enum with base type, trailing comma in source is dropped", () => {
  // Small enum collapses under the default compactSingleLine: true.
  const input = `enum Color : byte { Red = 0, Green, Blue = 2, }`;
  const out = format(input);
  assert.equal(out, `enum Color: byte { Red = 0, Green, Blue = 2 }\n`);
});

test("union with alias", () => {
  // Small union collapses under the default compactSingleLine: true.
  const input = `union U{X,alias:Y}`;
  const out = format(input);
  assert.equal(out, `union U { X, alias: Y }\n`);
});

test("rpc_service formatting", () => {
  const input = `rpc_service S{M(Req):Res(streaming:"server");}`;
  const out = format(input);
  assert.equal(
    out,
    `rpc_service S {\n  M(Req): Res (streaming: "server");\n}\n`,
  );
});

test("include / root_type / file_identifier / namespace", () => {
  const input = `include   "x.fbs"  ;
namespace  A . B  ;
root_type T;
file_identifier "ABCD";
file_extension "fbs";`;
  const out = format(input);
  assert.equal(
    out,
    `include "x.fbs";
namespace A.B;
root_type T;
file_identifier "ABCD";
file_extension "fbs";
`,
  );
});

test("check() detects unformatted input", () => {
  assert.equal(check(`table T{x:int;}`), false);
  // Canonical for a single-field table under default compactSingleLine.
  assert.equal(check(`table T { x: int; }\n`), true);
});

test("parse round-trips the example file", () => {
  const input = `// example
namespace Example;

table T {
  a: int = 1;
  b: string;
}

root_type T;
`;
  const schema = parse(input);
  assert.equal(schema.items.length, 3);
  assert.equal(schema.items[0]!.kind, "namespace");
  assert.equal(schema.items[1]!.kind, "table");
  assert.equal(schema.items[2]!.kind, "root_type");
});

test("rejects malformed input with a useful error", () => {
  assert.throws(() => format(`table {`), /expected/);
  assert.throws(() => format(`table T { x: }`), /expected/);
});

test("attribute decl, both quoted and unquoted", () => {
  assert.equal(format(`attribute "priority";`), `attribute "priority";\n`);
  assert.equal(format(`attribute priority;`), `attribute priority;\n`);
});

// ---------------------------------------------------------------------------
// FormatOptions: per-option coverage mirroring the published engine's
// suite. Each new option gets a default-behavior test and an explicit-
// value test so the two engines stay byte-identical on every knob.
// ---------------------------------------------------------------------------

test("FormatOptions.useTabs: default is spaces", () => {
  const out = format(`table T { a:int; b:int; }`);
  assert.ok(!out.includes("\t"), "default output must not contain tabs");
});

test("FormatOptions.useTabs: true emits tab indentation", () => {
  const out = format(`table T { a:int; b:int; }`, { useTabs: true, indent: 1 });
  assert.match(out, /^\ta: int;$/m, "one tab per indent level");
});

test("FormatOptions.lineWidth: default 80 collapses a small enum", () => {
  const out = format(`enum E:byte { A, B, C, D, F }`);
  assert.equal(out, `enum E: byte { A, B, C, D, F }\n`);
});

test("FormatOptions.lineWidth: small value forces expansion", () => {
  const out = format(`enum E:byte { A, B, C, D, F }`, { lineWidth: 20 });
  assert.equal(out, `enum E: byte {\n  A,\n  B,\n  C,\n  D,\n  F\n}\n`);
});

test("FormatOptions.compactSingleLine: default true collapses small enum", () => {
  const out = format(`enum E:byte { A, B, C }`);
  assert.equal(out, `enum E: byte { A, B, C }\n`);
});

test("FormatOptions.compactSingleLine: false keeps small enums expanded", () => {
  const out = format(`enum E:byte { A, B, C }`, { compactSingleLine: false });
  assert.equal(out, `enum E: byte {\n  A,\n  B,\n  C\n}\n`);
});

test("FormatOptions.maxBlankLines: default 1 collapses paragraph breaks", () => {
  const out = format(`table T { x:int; y:int; }\n\n\n\ntable U { z:int; w:int; }`);
  assert.equal(
    out,
    `table T {\n  x: int;\n  y: int;\n}\n\ntable U {\n  z: int;\n  w: int;\n}\n`,
  );
});

test("FormatOptions.maxBlankLines: 2 preserves a double blank line", () => {
  const out = format(
    `table T { x:int; y:int; }\n\n\ntable U { z:int; w:int; }`,
    { maxBlankLines: 2 },
  );
  assert.equal(
    out,
    `table T {\n  x: int;\n  y: int;\n}\n\n\ntable U {\n  z: int;\n  w: int;\n}\n`,
  );
});

test("FormatOptions.wrapComments: default off leaves long line comments alone", () => {
  const longComment = "// " + "x".repeat(200);
  const out = format(`${longComment}\ntable T { x: int; y: int; }`);
  assert.match(out, new RegExp(`^// ${"x".repeat(200)}$`, "m"));
});

test("FormatOptions.wrapComments: true reflows a 150-char comment to lineWidth", () => {
  const body = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud";
  const out = format(`// ${body}\ntable T { x: int; y: int; }`, { wrapComments: true });
  for (const line of out.split("\n")) {
    if (line.startsWith("//")) assert.ok(line.length <= 80, `line over budget: ${line}`);
  }
});

test("FormatOptions.commentWidth: 40 wraps at 40 instead of lineWidth", () => {
  const body = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor";
  const out = format(
    `// ${body}\ntable T { x: int; y: int; }`,
    { wrapComments: true, commentWidth: 40 },
  );
  let sawWrapped = false;
  for (const line of out.split("\n")) {
    if (line.startsWith("//")) {
      assert.ok(line.length <= 40, `line over budget: ${line}`);
      sawWrapped = true;
    }
  }
  assert.ok(sawWrapped, "expected at least one wrapped comment line");
});

test("FormatOptions.wrapComments: URLs are never split mid-token", () => {
  const url = "https://example.com/a/very/long/path/that/would/otherwise/exceed/the/width/budget";
  const out = format(
    `// see ${url} for context\ntable T { x: int; y: int; }`,
    { wrapComments: true, commentWidth: 30 },
  );
  assert.ok(out.includes(url), `URL not preserved intact in: ${out}`);
});

test("compactSingleLine: single-field table collapses by default", () => {
  const out = format(`table T { x: int; }`);
  assert.equal(out, `table T { x: int; }\n`);
});

test("compactSingleLine: multi-field table stays expanded", () => {
  const out = format(`table T { x: int; y: string; }`);
  assert.equal(out, `table T {\n  x: int;\n  y: string;\n}\n`);
});
