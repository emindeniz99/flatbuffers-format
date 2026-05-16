// Public API. The core has no Node dependencies so it can be imported
// directly into a browser via `<script type="module">`.

import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";
import { print, type FormatOptions } from "./printer.js";

export { tokenize, parse, print };
export type { FormatOptions } from "./printer.js";
export type { Schema } from "./types.js";

export function format(source: string, options: FormatOptions = {}): string {
  return print(parse(source), options);
}

/** Returns true iff `format(source) === source`. */
export function check(source: string, options: FormatOptions = {}): boolean {
  return format(source, options) === source;
}
