// Comment preservation. A formatter must never drop a comment: 0.3.0
// silently deleted comments after a comma in enum/union bodies, the
// content of comment-only bodies, and every comment written inside a
// declaration. These tests pin the fix and the invariant check that
// makes `format` refuse to return output that lost one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CharStream, CommonTokenStream } from "antlr4ng";
import { FlatBuffersLexer } from "../generated/FlatBuffersLexer.js";
import { CodeChangeError, CommentLossError, format, type FormatOptions } from "../src/index.js";
import { Printer } from "../src/printer.js";

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = join(here, "..", "src", "cli.js");
const printerUrl = pathToFileURL(join(here, "..", "src", "printer.js")).href;

const MODES: [string, FormatOptions][] = [
  ["compact", {}],
  ["non-compact", { compactSingleLine: false }],
];

// Exact output in both modes — a body holding a comment never collapses,
// so compact and non-compact agree — plus the fixed-point property.
function assertFormatsTo(input: string, expected: string, extra: FormatOptions = {}) {
  for (const [mode, opts] of MODES) {
    const out = format(input, { ...opts, ...extra });
    assert.equal(out, expected, `${mode} output`);
    assert.equal(format(out, { ...opts, ...extra }), out, `${mode} is idempotent`);
  }
}

test("0.3.0 regression: the reported repro keeps every comment", () => {
  const input = `enum Color : byte {
    Red, // first
    Green, // second
}

enum Size : byte {
    Small, // kept?
    Large // last, no comma
}

table Empty {
    // only a comment
}

table Point {
    x: int; // field comment
}
`;
  // Red's comment sat after the comma, which the printer re-emits
  // itself, so it was never read; Empty had no item to hang its
  // comment on. Losing them also let compact mode collapse Color.
  const expected = `enum Color: byte {
    Red, // first
    Green, // second
}

enum Size: byte {
    Small, // kept?
    Large, // last, no comma
}

table Empty {
    // only a comment
}

table Point {
    x: int; // field comment
}
`;
  assertFormatsTo(input, expected, { indent: 4 });
});

test("enum: comments after commas, in runs, before the first value and the }", () => {
  assertFormatsTo(
    `enum E : byte {
  // before first
  A = 1, // middle
  B, /// doc after comma
  C, /* block after comma */
  D, /* a */ /* b */ // c
  // first of two
  // second of two
  E, // last, trailing comma
  // before close
}
`,
    `enum E: byte {
  // before first
  A = 1, // middle
  B, /// doc after comma
  C, /* block after comma */
  D, /* a */ /* b */ // c
  // first of two
  // second of two
  E, // last, trailing comma
  // before close
}
`,
  );
});

test("enum: last value without a trailing comma keeps its comment", () => {
  assertFormatsTo(
    "enum E : byte { A, // middle\n  B // last, no comma\n}\n",
    "enum E: byte {\n  A, // middle\n  B, // last, no comma\n}\n",
  );
});

test("enum: comments inside a value or before its comma stay with that value", () => {
  // Comments the printer has no inline slot for move onto their own line
  // above the value; one before the comma moves after it.
  assertFormatsTo(
    `enum E : byte {
  A /* before init */ = 1,
  B = // between = and value
    2,
  C /* before comma */ ,
  D // before comma, own line
  ,
}
`,
    `enum E: byte {
  /* before init */
  A = 1,
  // between = and value
  B = 2,
  C, /* before comma */
  D, // before comma, own line
}
`,
  );
});

test("union: comments after commas, before the first value and the }", () => {
  assertFormatsTo(
    `union U {
  // before first
  A, // middle
  B, /// doc
  C, /* block */
  alias: D, // last, trailing comma
  // before close
}
`,
    `union U {
  // before first
  A, // middle
  B, /// doc
  C, /* block */
  alias: D, // last, trailing comma
  // before close
}
`,
  );
});

test("table: trailing //, ///, /* */ and comments before the }", () => {
  assertFormatsTo(
    `table T {
  // before first
  a: int; // middle
  b: int; /// doc
  c: int; /* block */
  d: int = 5; /* x */ // last
  // before close
}
`,
    `table T {
  // before first
  a: int; // middle
  b: int; /// doc
  c: int; /* block */
  d: int = 5; /* x */ // last
  // before close
}
`,
  );
});

test("table: comments inside a field or its metadata move above the field", () => {
  assertFormatsTo(
    `table T {
  a /* before colon */ : int;
  b: int = /* before default */ 3;
  c: int (id: 2, /* in metadata */ deprecated);
}
`,
    `table T {
  /* before colon */
  a: int;
  /* before default */
  b: int = 3;
  /* in metadata */
  c: int (id: 2, deprecated);
}
`,
  );
});

test("struct: trailing comments and comments before the }", () => {
  assertFormatsTo(
    `struct S {
  // before first
  x: float; // middle
  y: float; /* block */
  // before close
}
`,
    `struct S {
  // before first
  x: float; // middle
  y: float; /* block */
  // before close
}
`,
  );
});

test("rpc_service: trailing comments and comments before the }", () => {
  assertFormatsTo(
    `rpc_service R {
  // before first
  Get(Req): Res; // middle
  Put(Req): Res (streaming: "none"); /* block */
  // before close
}
`,
    `rpc_service R {
  // before first
  Get(Req): Res; // middle
  Put(Req): Res (streaming: "none"); /* block */
  // before close
}
`,
  );
});

test("comment-only bodies keep their comments, indented inside the braces", () => {
  assertFormatsTo(
    `table A {
  // only a comment
}
struct B { /* only a block */ }
enum C : byte { // brace line
  // body
  X
}
union D {

  // blank lines around

}
rpc_service E {
  /// doc only
}
`,
    `table A {
  // only a comment
}

struct B { /* only a block */
}

enum C: byte { // brace line
  // body
  X,
}

union D {
  // blank lines around
}

rpc_service E {
  /// doc only
}
`,
  );
});

test("comments inside a declaration header or metadata list move above it", () => {
  const input = `table T (a, // why a
  b /* why b */) {
  x: int;
}
attribute /* quoted */ "priority";
namespace a. /* mid */ b;
`;
  const out = format(input);
  assert.equal(
    out,
    `// why a
/* why b */
table T (a, b) {
  x: int;
}

/* quoted */
attribute "priority";
/* mid */
namespace a.b;
`,
  );
  assert.equal(format(out), out);
});

test("object literal: comments stay with their field, element or bracket", () => {
  // Before, every comment inside a literal was hoisted above the whole
  // literal, far from the value it described.
  assertFormatsTo(
    `{ // config
  hp: 300, // boss level
  // shown in the UI
  name: "Orc" /* placeholder */ ,
  pos: { x: 1, // x axis
    y: 2
    // z comes later
  },
  tags: [1, /* two */ 2],
  key /* odd spot */ : true
  // end
} // after
`,
    `{ // config
  hp: 300, // boss level
  // shown in the UI
  name: "Orc", /* placeholder */
  pos: {
    x: 1, // x axis
    y: 2
    // z comes later
  },
  tags: [
    1, /* two */
    2
  ],
  /* odd spot */
  key: true
  // end
} // after
`,
  );
});

test("object literal: comment-only and empty literals", () => {
  assertFormatsTo("{ a: { /* none yet */ }, b: [\n  // none yet\n], c: {}, d: [] }\n", `{
  a: { /* none yet */
  },
  b: [
    // none yet
  ],
  c: {},
  d: []
}
`);
});

test("compact mode never collapses a body holding a comment", () => {
  // Collapsing `A, // c` onto one line would swallow the rest of the
  // body into the comment.
  for (const body of ["A, // c\n B", "A, /* c */ B", "/* c */ A, B", "A, B /* c */"]) {
    const out = format(`enum E : byte { ${body} }\n`);
    assert.notEqual(out.split("\n").length, 2, `expanded: ${JSON.stringify(out)}`);
    assert.equal(format(out), out);
  }
  assert.equal(format("table T { /* c */ x: int; }\n"), "table T { /* c */\n  x: int;\n}\n");
  // Bodies without comments still collapse exactly as in 0.3.0.
  assert.equal(format("enum E : byte { A, B }\n"), "enum E: byte { A, B }\n");
  assert.equal(format("table T { x: int; }\n"), "table T { x: int; }\n");
});

// One of every declaration kind and every list the grammar has.
const EVERY_CONSTRUCT = `include "other.fbs";
namespace a.b;
attribute "priority";
/// doc
table T (priority: 1) {
  a: int = 1 (id: 0, deprecated);
  b: [ubyte];
  c: a.b.S;
}
struct S { x: float; y: [float:3]; }
enum E : byte { A = 1, B, C = -2, }
union U : ubyte { T, alias: S }
rpc_service R {
  Get(T): S (streaming: "server");
}
root_type T;
file_identifier "ABCD";
file_extension "bin";
{ a: 1, b: [1, 2], c: { d: "x" } }
`;

test("every comment survives at every position, in every declaration kind", () => {
  // Inject a comment after each real token in turn and require it in the
  // output exactly once, with the output a fixed point. This is the
  // property itself, not a sample of it: 0.3.0 failed it at 87% of
  // positions across the corpus.
  const tokens = new CommonTokenStream(new FlatBuffersLexer(CharStream.fromString(EVERY_CONSTRUCT)));
  tokens.fill();
  const real = tokens.getTokens().filter((t) => t.channel === 0 && t.type !== -1);
  const failures: string[] = [];
  for (let i = 0; i < real.length; i++) {
    const at = real[i]!.stop + 1;
    for (const comment of [` /*Q${i}B*/ `, ` // Q${i}L\n`, ` /// Q${i}D\n`]) {
      const marker = comment.trim().replace(/^\/\/\/? |^\/\*|\*\/$/g, "");
      const input = EVERY_CONSTRUCT.slice(0, at) + comment + EVERY_CONSTRUCT.slice(at);
      for (const [mode, opts] of MODES) {
        const out = format(input, opts);
        const where = `${mode}, ${JSON.stringify(comment)} after token ${i} '${real[i]!.text}'`;
        if (out.split(marker).length !== 2) failures.push(`lost or duplicated: ${where}`);
        else if (format(out, opts) !== out) failures.push(`not idempotent: ${where}`);
      }
    }
  }
  assert.ok(real.length > 100, "fixture is tokenized");
  assert.deepEqual(failures.slice(0, 10), []);
});

test("wrapComments: a wrapped comment passes the invariant check word for word", () => {
  const long = `// ${"word ".repeat(30).trim()}`;
  const out = format(`table T {\n  ${long}\n  x: int;\n}\n`, { wrapComments: true, lineWidth: 40 });
  assert.ok(out.split("\n").filter((l) => l.trim().startsWith("//")).length > 1, "was wrapped");
  assert.equal((out.match(/word/g) ?? []).length, 30);
});

test("invariant check: // and /* inside string literals are not comments", () => {
  // Unformatted on purpose: a scanner that took the string's `//` for a
  // comment would read different text on each side and throw.
  const input = `attribute "http://example.com";
table T {
  a:string="x // not a comment";// real
  b:string="y /* not a block */ \\" // still in the string";/* real block */
}
`;
  const out = format(input);
  assert.match(out, /"x \/\/ not a comment"; \/\/ real$/m);
  assert.match(out, /\/\* real block \*\/$/m);
  assert.equal(format(out), out);
});

// Run `fn` with the printer patched to mangle its own output.
function withMangledPrinter(mangle: (out: string) => string, fn: () => void) {
  const original = Printer.prototype.print;
  Printer.prototype.print = function (this: Printer, ...args: Parameters<Printer["print"]>) {
    return mangle(original.apply(this, args));
  };
  try {
    fn();
  } finally {
    Printer.prototype.print = original;
  }
}

test("invariant check: format throws CommentLossError when the printer drops a comment", () => {
  const input = "enum E : byte {\n  A, // keep me\n  B\n}\n";
  withMangledPrinter(
    (out) => out.replace(" // keep me", ""),
    () => {
      assert.throws(
        () => format(input),
        (err: unknown) =>
          err instanceof CommentLossError &&
          err.missing.length === 1 &&
          err.missing[0] === "// keep me" &&
          err.added.length === 0 &&
          /refusing to format/.test(err.message),
      );
    },
  );
});

test("invariant check: a duplicated comment is reported as added", () => {
  withMangledPrinter(
    (out) => out.replace("// once", "// once\n// once"),
    () => {
      assert.throws(
        () => format("table T {\n  x: int; // once\n}\n"),
        (err: unknown) =>
          err instanceof CommentLossError && err.added[0] === "// once" && err.missing.length === 0,
      );
    },
  );
});

test("invariant check: format throws CodeChangeError when the printer changes code", () => {
  // Each mangle is a printer bug the comment check cannot see.
  const cases: [string, (out: string) => string, string, string][] = [
    ["table T { x: int = 1; }", (out) => out.replace("= 1", "= 2"), "1", "2"],
    ["table T { x: int; }", (out) => out.replace("x: int", "x int"), ":", "int"],
    ["table T { xy: int; }", (out) => out.replace("xy", "x y"), "xy", "x"],
    ["table T { x: int; }", (out) => out.replace(";", ""), ";", "}"],
    ["enum E: byte { A, B }", (out) => out.replace(", B", ""), ",", "}"],
  ];
  for (const [input, mangle, expected, actual] of cases) {
    withMangledPrinter(mangle, () => {
      assert.throws(
        () => format(input),
        (err: unknown) =>
          err instanceof CodeChangeError &&
          err.expected === expected &&
          err.actual === actual &&
          /refusing to format/.test(err.message),
        input,
      );
    });
  }
});

test("invariant check: whitespace and a comma before } may change; unsafe skips the checks", () => {
  withMangledPrinter(
    (out) => out.replace("B,\n}", "B\n}").replace("  A", "\tA"),
    () => assert.equal(format("enum E : byte {\n  A,\n  B\n}\n"), "enum E: byte {\n\tA,\n  B\n}\n"),
  );
  withMangledPrinter(
    (out) => out.replace("int", "long").replace(" // c", ""),
    () => assert.equal(format("table T { x: int; } // c", { unsafe: true }), "table T {\n  x: long;\n}\n"),
  );
});

test("CLI: a comment-losing format refuses to write and names the file and comment", () => {
  const dir = mkdtempSync(join(tmpdir(), "fbs-comment-loss-"));
  const patch = join(dir, "drop-comment.mjs");
  writeFileSync(
    patch,
    `import { Printer } from ${JSON.stringify(printerUrl)};
const print = Printer.prototype.print;
Printer.prototype.print = function (tree) { return print.call(this, tree).replace(" // keep me", ""); };
`,
  );
  const file = join(dir, "schema.fbs");
  const original = "enum E:byte{A, // keep me\nB}\n";
  writeFileSync(file, original);

  const w = spawnSync(process.execPath, ["--import", pathToFileURL(patch).href, cliPath, "--write", file], {
    encoding: "utf8",
  });
  assert.equal(w.status, 1, "--write exits 1");
  assert.equal(readFileSync(file, "utf8"), original, "file left untouched");
  assert.ok(w.stderr.includes(file), "stderr names the file");
  assert.ok(w.stderr.includes('"// keep me"'), "stderr names the comment");

  const s = spawnSync(process.execPath, ["--import", pathToFileURL(patch).href, cliPath, "-"], {
    input: original,
    encoding: "utf8",
  });
  assert.equal(s.status, 1, "stdin exits 1");
  assert.equal(s.stdout, "", "stdin mode writes nothing to stdout");
  assert.ok(s.stderr.includes("<stdin>") && s.stderr.includes('"// keep me"'));
});
