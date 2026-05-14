import { test } from "node:test";
import assert from "node:assert/strict";
import { format, check } from "../src/index.js";

test("formats a basic table declaration", () => {
  const input = `table Foo{x:int;y:string=  "hi";}`;
  const expected = `table Foo {
  x: int;
  y: string = "hi";
}
`;
  assert.equal(format(input), expected);
});

test("is a fixed point — format(format(x)) == format(x)", () => {
  const input = `// header
namespace A.B;

/// doc
table T {
  f:int (deprecated);
  g:[ubyte];
}

enum E: byte {
  A = 1,
  B
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

test("preserves doc and trailing comments", () => {
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
  // Each comment appears exactly once.
  assert.equal(out.match(/primary key/g)!.length, 1);
});

test("collapses runs of blank lines to one between block decls", () => {
  const input = `namespace A;



table T { x:int; }




root_type T;
`;
  const out = format(input);
  assert.equal(out.includes("\n\n\n"), false);
  assert.match(out, /namespace A;\n\ntable T/);
});

test("metadata on a table and field", () => {
  const input = `table T (force_align: 8) { x:int (key); }`;
  const out = format(input);
  assert.equal(out, `table T (force_align: 8) {\n  x: int (key);\n}\n`);
});

test("vector and nested vector types", () => {
  const input = `table T { a:[int]; b:[[ubyte]]; }`;
  const out = format(input);
  assert.equal(out, `table T {\n  a: [int];\n  b: [[ubyte]];\n}\n`);
});

test("enum with base type and trailing comma in source is dropped", () => {
  const input = `enum Color : byte { Red = 0, Green, Blue = 2, }`;
  const out = format(input);
  assert.equal(out, `enum Color: byte {\n  Red = 0,\n  Green,\n  Blue = 2\n}\n`);
});

test("union with alias", () => {
  const input = `union U{X,alias:Y}`;
  const out = format(input);
  assert.equal(out, `union U {\n  X,\n  alias: Y\n}\n`);
});

test("rpc_service formatting", () => {
  const input = `rpc_service S{M(Req):Res(streaming:"server");}`;
  const out = format(input);
  assert.equal(out, `rpc_service S {\n  M(Req): Res (streaming: "server");\n}\n`);
});

test("include / root_type / file_identifier / namespace stay together", () => {
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
  assert.equal(check(`table T {\n  x: int;\n}\n`), true);
});

test("rejects malformed input with a useful error", () => {
  assert.throws(() => format(`table {`));
  assert.throws(() => format(`table T { x: }`));
});

test("attribute decl, both quoted and unquoted", () => {
  assert.equal(format(`attribute "priority";`), `attribute "priority";\n`);
  assert.equal(format(`attribute priority;`), `attribute priority;\n`);
});
