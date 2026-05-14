import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { format, check } from "../src/index.js";

// Resolve the test/corpus directory regardless of where the compiled
// test bundle ends up (dist-test/ vs source). The Node test runner runs
// the compiled .js, so __dirname here is somewhere under dist-test/test/.
const here = dirname(fileURLToPath(import.meta.url));
const corpusDir = join(here, "..", "..", "test", "corpus");
const readCorpus = (name: string) => readFileSync(join(corpusDir, name), "utf8");

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

// ---------------------------------------------------------------------------
// Integration tests against the comprehensive corpus.
//
// 17-comprehensive-canonical.fbs and 18-comprehensive-ugly.fbs are paired
// fixtures designed to exercise the formatter's entire grammar surface in a
// single end-to-end scenario:
//
//   * 17 is the canonical (already-formatted) representation. Running the
//     formatter on it must produce byte-identical output — this is the
//     idempotency property.
//   * 18 has the same logical schema as 17 but with deliberately destructive
//     whitespace, indentation, statement compression, and intra-line spacing.
//     Running the formatter on it must produce byte-identical output to 17 —
//     this is the recovery property: ugly input -> canonical output.
//
// Together these two tests certify that the formatter's behavior is well-
// defined over a large, realistic schema, not just over small unit-test
// fragments. Every grammar feature listed in the fixture's header is
// transitively covered.
//
// The corpus is also exercised by:
//   - test/crosscheck.sh — proves ANTLR and hand-rolled engines agree
//     byte-for-byte on every file (differential testing).
//   - scripts/flatc-conform.sh — proves the corpus is real, flatc-valid
//     FlatBuffers, not just something our parser happens to accept.
// ---------------------------------------------------------------------------

test("corpus 17: comprehensive canonical schema is a fixed point", () => {
  // Property: format(canonical) == canonical, byte-for-byte.
  //
  // If this fails, either:
  //   (a) the formatter has regressed and is producing a non-canonical
  //       version of a schema that used to be canonical, or
  //   (b) the canonical fixture has drifted out of step with the formatter's
  //       current output rules — regenerate by running
  //       `node dist/src/cli.js test/corpus/17-comprehensive-canonical.fbs`
  //       and inspecting the diff.
  const canonical = readCorpus("17-comprehensive-canonical.fbs");
  assert.equal(format(canonical), canonical);
  assert.equal(check(canonical), true);
});

test("corpus 18: deliberately ugly schema reformats to byte-identical canonical", () => {
  // Property: format(ugly) == canonical.
  //
  // The ugly fixture intentionally violates every spacing rule the formatter
  // can fix: no indentation, run-together statements, weird interior spacing
  // around colons/commas, dropped/added blank lines inside blocks. The
  // comment text and inter-decl blank-line count match the canonical so the
  // formatter's output should land exactly on the canonical bytes.
  //
  // If this fails, the formatter's recovery path has diverged from its
  // canonical-output path. Investigate by diffing format(ugly) against the
  // canonical to see which construct survived "ugly" but not "canonical"
  // (or vice versa).
  const ugly = readCorpus("18-comprehensive-ugly.fbs");
  const canonical = readCorpus("17-comprehensive-canonical.fbs");
  assert.equal(format(ugly), canonical);
});

test("corpus 17: feature checklist — every advertised grammar feature appears in the output", () => {
  // Defense-in-depth check. The previous two tests prove that the formatter
  // is consistent on this fixture, but a future maintainer could
  // accidentally trim features out of the canonical file (or the formatter
  // could silently drop them). This test pins specific syntactic markers
  // that must survive a round-trip — each line below corresponds to a row
  // in the fixture's "features exercised" list.
  const out = format(readCorpus("17-comprehensive-canonical.fbs"));

  // Top-level declarations and metadata.
  assert.match(out, /^native_include "comprehensive_extra\.h";$/m, "native_include directive");
  assert.match(out, /^namespace Example\.Comprehensive;$/m, "dotted namespace declaration");
  assert.match(out, /^attribute "priority";$/m, "attribute decl, quoted form");
  assert.match(out, /^root_type Monster;$/m, "root_type at end");
  assert.match(out, /^file_identifier "COMP";$/m, "file_identifier");
  assert.match(out, /^file_extension "comp";$/m, "file_extension");

  // Enums: bit_flags + explicit underlying types + signed/unsigned values.
  assert.match(out, /enum Color: uint \(bit_flags\)/, "enum with (bit_flags) attribute");
  assert.match(out, /enum Priority: byte/, "enum with explicit underlying byte");
  assert.match(out, /Low = -1,/, "negative enum value");

  // Structs: scalar, fixed-array, nested struct.
  assert.match(out, /struct Vec3 \{/, "basic scalar struct");
  assert.match(out, /data: \[float:9\];/, "struct fixed-size array field [T:N]");
  assert.match(out, /struct Ray \{/, "struct-of-structs");

  // Union with mixed aliased and bare variants.
  assert.match(out, /union Attack \{/, "union declaration");
  assert.match(out, /Melee: PrimarySword,/, "aliased union variant");
  assert.match(out, /MagicSpell$/m, "bare union variant");

  // Namespace re-opening (drop into External.Ref and back).
  const namespaceMatches = out.match(/^namespace /gm) ?? [];
  assert.equal(namespaceMatches.length, 3, "exactly three namespace decls (main, External.Ref, main again)");

  // Cross-namespace dotted type reference.
  assert.match(out, /pos: Example\.Comprehensive\.Vec3;/, "cross-namespace struct ref");
  assert.match(out, /spawn_at: External\.Ref\.Anchor;/, "dotted type reference in field");

  // Float-literal defaults: mantissa, infinity, NaN, hex, exponent form.
  assert.match(out, /scale: float = 1\.5;/, "mantissa float default");
  assert.match(out, /density: float = inf;/, "inf float literal");
  assert.match(out, /nan_check: float = nan;/, "nan float literal");
  assert.match(out, /hex_id: uint = 0xDEADBEEF;/, "hex literal default");
  assert.match(out, /cooldown: float = 1\.5e-3;/, "exponent-form float default");

  // Field metadata variants.
  assert.match(out, /name: string \(required\);/, "(required) metadata");
  assert.match(out, /old_score: int \(deprecated\);/, "(deprecated) metadata");
  assert.match(out, /uid: ulong \(key\);/, "(key) metadata");
  assert.match(out, /rating: int \(priority: 5\);/, "custom key:value metadata");
  assert.match(out, /internal: string \(deprecated, priority: 0\);/, "multiple metadata items");

  // Collection field kinds.
  assert.match(out, /inventory: \[ubyte\];/, "vector of scalar");
  assert.match(out, /tags: \[string\];/, "vector of strings");
  assert.match(out, /trail: \[Vec3\];/, "vector of struct");
  assert.match(out, /loot: \[PrimarySword\];/, "vector of table");
  assert.match(out, /abilities: \[Attack\];/, "vector of union");

  // Keyword as field name.
  assert.match(out, /^  enum: int;/m, "reserved word used as field name");

  // RPC service: all four streaming variants + idempotent flag.
  assert.match(out, /Store\(Monster\): Stat;/, "RPC method, no streaming");
  assert.match(out, /Retrieve\(MonsterRequest\): Stat \(streaming: "server"\);/, "server streaming");
  assert.match(out, /Push\(Stat\): Stat \(streaming: "client"\);/, "client streaming");
  assert.match(out, /Bidi\(Stat\): Stat \(streaming: "bidi", idempotent\);/, "bidi + idempotent");

  // Object literal at end of schema.
  assert.match(out, /\{\n  name: "Sample",/, "object literal preserved");
});

test("corpus 17: doc comments stay glued to their target declarations", () => {
  // The trickiest piece of trivia handling: a doc comment (`///`) that sits
  // immediately above a declaration must stay attached to that declaration
  // — not get demoted to a regular comment, not get split off by a blank
  // line, not get duplicated, not get dropped.
  //
  // We check this by sampling several doc comments from 17 and asserting
  // that each is followed by its expected declaration with no blank line
  // in between.
  const out = format(readCorpus("17-comprehensive-canonical.fbs"));

  // Doc comment on the bit_flags enum.
  assert.match(
    out,
    /\/\/\/ Bit-flags enum\. Exercises:[\s\S]*?\/\/\/   - members with no explicit value \(auto-assigned\)\nenum Color:/,
    "Color enum doc comment glued to its declaration",
  );

  // Doc comment on the Anchor table inside the re-opened External.Ref namespace.
  assert.match(
    out,
    /\/\/\/ Anchor — referenced from the main namespace[\s\S]*?\ntable Anchor \{/,
    "Anchor table doc comment glued",
  );

  // Doc comment on the inline hp_max field deep inside Monster.
  assert.match(
    out,
    /\/\/\/ Doc-style comment attached to the next field\.[\s\S]*?\n  hp_max: short;/,
    "hp_max field doc comment glued",
  );

  // Each doc-comment header line appears exactly once — no duplication
  // from the trivia-dedup pass.
  assert.equal((out.match(/\/\/\/ Bit-flags enum\. Exercises:/g) ?? []).length, 1);
  assert.equal((out.match(/\/\/\/ Anchor — referenced from the main namespace/g) ?? []).length, 1);
});

test("corpus 18: idempotency holds after recovery (ugly -> canonical -> canonical)", () => {
  // Recovery + idempotency composed: format(ugly) lands on canonical, and
  // format(canonical) lands on canonical. Tested independently above, but
  // this composes the two so any subtle coupling between recovery and
  // canonical-output paths surfaces here.
  const ugly = readCorpus("18-comprehensive-ugly.fbs");
  const once = format(ugly);
  const twice = format(once);
  assert.equal(once, twice, "second format pass is a no-op");
  assert.equal(once, readCorpus("17-comprehensive-canonical.fbs"), "lands on canonical");
});

test("corpus 19: vtable-id metadata on every field is preserved", () => {
  // 19-vtable-ids.fbs exercises the all-or-nothing flatc rule for the
  // (id: N) attribute: every field on the table must carry an id, or no
  // field can. The fixture is split out from 17 because adding ids to all
  // ~30 Monster fields would be tedious without adding any new coverage.
  //
  // What this test pins:
  //   - the (id: N) form on multiple fields
  //   - id values can attach to scalar, string, default-bearing, and vector
  //     fields without changing the rest of the formatter's output
  //   - the file remains idempotent (no accidental trivia churn around the
  //     id metadata).
  const canonical = readCorpus("19-vtable-ids.fbs");
  const out = format(canonical);
  assert.equal(out, canonical, "fixture is canonical");
  assert.match(out, /a: int \(id: 0\);/);
  assert.match(out, /b: string \(id: 1\);/);
  assert.match(out, /c: float = 1\.5 \(id: 2\);/);
  assert.match(out, /d: \[ubyte\] \(id: 3\);/);
  // Every field has exactly one (id: N).
  const idMatches = out.match(/\(id: \d+\)/g) ?? [];
  assert.equal(idMatches.length, 4, "all four fields carry (id: N) metadata");
});

test("block comments are NOT nestable — first */ closes (C-style behavior, documented)", () => {
  // Block comments in FlatBuffers schema follow C tradition: a `/*` does not
  // open a nested scope. The first `*/` closes the comment, and any inner
  // `/*` is just text inside that one comment. The remainder of the input
  // after the first `*/` is parsed as code as usual.
  //
  // We pin this behavior in a test so a future "let me make comments nestable"
  // change can't slip in without a deliberate decision. The full-output
  // equality form makes the actual structure obvious to readers: one comment
  // (whose body happens to contain `/*`), followed by the formatted table.
  assert.equal(
    format(`/* outer /* inner */ table T { x: int; }`),
    `/* outer /* inner */\ntable T {\n  x: int;\n}\n`,
  );
});

test("malformed input: signed inf/nan rejected (only bare inf/nan are supported)", () => {
  // We documented in docs/grammar-comparison.md that the lexer accepts bare
  // `inf` and `nan` as float defaults, but rejects `+inf`, `-inf`, `+nan`,
  // `-nan`. This test pins that behaviour so a future "feature add" doesn't
  // silently broaden the accepted dialect without an explicit decision.
  // Bare forms must continue to work:
  assert.equal(
    format(`table T { a: float = inf; b: float = nan; }`),
    `table T {\n  a: float = inf;\n  b: float = nan;\n}\n`,
  );
  // Signed forms must continue to fail:
  assert.throws(() => format(`table T { a: float = -inf; }`));
  assert.throws(() => format(`table T { a: float = +inf; }`));
});
