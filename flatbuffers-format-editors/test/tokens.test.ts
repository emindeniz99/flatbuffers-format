import test from "node:test";
import assert from "node:assert/strict";

import { BOOL_LITERALS, BUILTIN_TYPES, FLOAT_KEYWORDS, KEYWORDS } from "../src/tokens.js";

// Smoke tests that catch the kind of bug where someone updates the
// engine grammar's reserved-word list and forgets to mirror it here.
// The real grammar parity is checked by the IntelliJ plugin's
// FlatBuffersLexer + the Monaco tokenizer; this is the cheap canary.

test("KEYWORDS contains the top-level reserved words", () => {
  for (const w of ["namespace", "table", "struct", "enum", "union", "root_type", "include"]) {
    assert.ok(KEYWORDS.includes(w as never), `missing keyword: ${w}`);
  }
});

test("BUILTIN_TYPES covers every C99-named integer + every aliased size", () => {
  // Pair of aliased names: int / int32, uint / uint32, etc.
  const expectedAliases: Array<[string, string]> = [
    ["int", "int32"],
    ["uint", "uint32"],
    ["long", "int64"],
    ["ulong", "uint64"],
    ["short", "int16"],
    ["ushort", "uint16"],
    ["byte", "int8"],
    ["ubyte", "uint8"],
    ["float", "float32"],
    ["double", "float64"],
  ];
  for (const [a, b] of expectedAliases) {
    assert.ok(BUILTIN_TYPES.includes(a as never), `missing builtin: ${a}`);
    assert.ok(BUILTIN_TYPES.includes(b as never), `missing builtin: ${b}`);
  }
});

test("constants — true/false/null/inf/nan", () => {
  assert.deepEqual([...BOOL_LITERALS].sort(), ["false", "true"]);
  assert.deepEqual([...FLOAT_KEYWORDS].sort(), ["inf", "nan", "null"]);
});
