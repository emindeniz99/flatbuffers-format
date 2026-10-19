// Public API. The core has no Node dependencies so it can be imported
// directly into a browser via `<script type="module">`.

import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";
import { print, type FormatOptions } from "./printer.js";

export { tokenize, parse, print };
export type { FormatOptions } from "./printer.js";
export type { Schema } from "./types.js";

export function format(source: string, options: FormatOptions = {}): string {
  return print(parse(source), { ...options, newline: newlineFor(source, options) });
}

function newlineFor(source: string, options: FormatOptions): "\n" | "\r\n" {
  if (options.endOfLine === "lf") return "\n";
  if (options.endOfLine === "crlf") return "\r\n";
  if (options.endOfLine === "auto") return source.match(/\r?\n/)?.[0] === "\r\n" ? "\r\n" : "\n";
  return options.newline ?? "\n";
}

/** Returns true iff `format(source) === source`. */
export function check(source: string, options: FormatOptions = {}): boolean {
  return format(source, options) === source;
}
