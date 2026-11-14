#!/usr/bin/env node
// style-survey.mjs <flatbuffers checkout> [--list]
//
// How many of flatbuffers' own schemas (tests/ and samples/) does the
// formatter leave unchanged? A schema that changes under every option
// combination is written in a layout the formatter cannot keep, or
// mixes layouts. docs/style-survey.md records the numbers and what
// was decided from them; rerun this after adding a layout option or
// bumping the pinned flatbuffers version.
//
// Three counts, each ignoring a missing final newline (the formatter
// always writes one):
//   defaults     no options
//   style guide  the options the README lists for the style guide
//   best fit     per file, the option combination that changes the
//                fewest lines
//
// --list also prints the files that still change under their best fit.
//
// Needs a built engine: pnpm --filter flatbuffers-format build

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { format } from "../dist/src/index.js";

const [root, ...flags] = process.argv.slice(2);
if (!root) {
  console.error("usage: style-survey.mjs <flatbuffers checkout> [--list]");
  process.exit(2);
}

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (entry.endsWith(".fbs")) files.push(path);
  }
};
walk(join(root, "tests"));
walk(join(root, "samples"));
files.sort();

const STYLE_GUIDE = {
  spaceAfterTypeColon: false,
  spaceAroundEnumColon: true,
  collapseEmptyBodies: true,
  separateDeclarations: "multiline",
};

// Every option that picks between two layouts a schema may be written
// in. The two that only ever preserve more of the source stay on.
const combos = [];
for (const [indent, useTabs] of [[2, false], [4, false], [1, true]])
  for (const spaceAfterTypeColon of [true, false])
    for (const spaceAroundEnumColon of [true, false])
      for (const spaceAfterAttributeColon of [true, false])
        for (const trailingComma of ["all", "none"])
          for (const bracketSpacing of [true, false])
            for (const maxBlankLines of [1, 2])
              combos.push({
                indent,
                useTabs,
                spaceAfterTypeColon,
                spaceAroundEnumColon,
                spaceAfterAttributeColon,
                trailingComma,
                bracketSpacing,
                maxBlankLines,
                collapseEmptyBodies: true,
                separateDeclarations: "multiline",
              });

// Lines of `a` and `b` that have no partner in the other, as multisets.
// Cheaper than a real diff and enough to rank option combinations.
function changedLines(a, b) {
  const left = new Map();
  for (const line of a) left.set(line, (left.get(line) ?? 0) + 1);
  let unmatched = 0;
  for (const line of b) {
    const n = left.get(line) ?? 0;
    if (n > 0) left.set(line, n - 1);
    else unmatched++;
  }
  for (const n of left.values()) unmatched += n;
  return unmatched;
}

const tryFormat = (source, options) => {
  try {
    return format(source, options);
  } catch {
    return null;
  }
};

let unparsed = 0;
let withDefaults = 0;
let withStyleGuide = 0;
let withBestFit = 0;
const stillChanging = [];
for (const file of files) {
  const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n").replace(/\n*$/, "\n");
  const plain = tryFormat(source, {});
  if (plain === null) {
    unparsed++;
    continue;
  }
  if (plain === source) withDefaults++;
  if (tryFormat(source, STYLE_GUIDE) === source) withStyleGuide++;

  let best = Infinity;
  for (const options of combos) {
    const out = tryFormat(source, options);
    if (out === null) continue;
    best = Math.min(best, out === source ? 0 : changedLines(source.split("\n"), out.split("\n")));
    if (best === 0) break;
  }
  if (best === 0) withBestFit++;
  else stillChanging.push([relative(root, file), best]);
}

const total = files.length - unparsed;
console.log(`style-survey: ${files.length} schemas, ${unparsed} not parsed`);
console.log(`  unchanged with the defaults:            ${withDefaults}/${total}`);
console.log(`  unchanged with the style guide options: ${withStyleGuide}/${total}`);
console.log(`  unchanged with their best-fit options:  ${withBestFit}/${total}`);
if (flags.includes("--list")) {
  console.log("still changing under their best fit (lines without a partner):");
  for (const [file, lines] of stillChanging) console.log(`  ${String(lines).padStart(4)}  ${file}`);
}
