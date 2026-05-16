// Prettier 3 plugin for FlatBuffers (.fbs) schemas.
//
// Design: this plugin does NOT build a `Doc` tree. The `flatbuffers-format`
// engine already produces canonical output; re-implementing its rules in
// Prettier's print API would duplicate logic and drift over time. Instead,
// we use Prettier's `preprocess` hook to run `format()` on the source and
// return the canonical text, then the parser yields a single-node AST
// that the printer emits verbatim. This is the standard "external
// formatter" plugin pattern used by prettier-plugin-sql,
// prettier-plugin-go-template, and similar.

import { format as fbsFormat, FormatError } from "flatbuffers-format";
import type { Parser, Plugin, Printer, SupportLanguage } from "prettier";

/** The single-node AST produced by our parser and consumed by our printer. */
interface FbsRoot {
  type: "fbs-root";
  text: string;
}

/**
 * Map Prettier's layout options onto flatbuffers-format's `FormatOptions`:
 *
 *   Prettier `tabWidth`   → engine `indent`
 *   Prettier `useTabs`    → engine `useTabs` (native tab support)
 *   Prettier `printWidth` → engine `lineWidth` (drives compact/wrap)
 *
 * Note on `endOfLine`: we deliberately do NOT forward it to the engine.
 * Prettier post-processes the formatter's output and converts `\n` to
 * `\r\n` itself when `endOfLine: "crlf"`. If we *also* emitted CRLF,
 * Prettier would double-encode it to `\r\r\n`. So we always tell the
 * engine to emit `\n` and let Prettier own the line-ending conversion.
 */
function mapOptions(options: {
  tabWidth?: number;
  useTabs?: boolean;
  printWidth?: number;
}): {
  indent: number;
  useTabs: boolean;
  newline: "\n";
  lineWidth: number;
} {
  return {
    indent: options.tabWidth ?? 2,
    useTabs: options.useTabs ?? false,
    newline: "\n",
    lineWidth: options.printWidth ?? 80,
  };
}

const languages: SupportLanguage[] = [
  {
    name: "FlatBuffers",
    parsers: ["flatbuffers-format"],
    extensions: [".fbs"],
    vscodeLanguageIds: ["flatbuffers"],
  },
];

const parsers: Record<string, Parser<FbsRoot>> = {
  "flatbuffers-format": {
    // The preprocess hook is where the real work happens. By the time
    // Prettier calls `parse`, the text is already canonical, so the
    // "AST" is just an opaque wrapper around the formatted string.
    preprocess: (text, options) => {
      try {
        return fbsFormat(text, mapOptions(options as Parameters<typeof mapOptions>[0]));
      } catch (e) {
        if (e instanceof FormatError) {
          // Re-throw as a SyntaxError carrying Prettier's expected
          // `loc.start` shape so editor diagnostics light up correctly.
          const wrapped = new SyntaxError(e.message) as SyntaxError & {
            loc: { start: { line: number; column: number } };
            cause: unknown;
          };
          wrapped.loc = { start: { line: e.line, column: e.column } };
          wrapped.cause = e;
          throw wrapped;
        }
        throw e;
      }
    },
    parse: (text) => ({ type: "fbs-root", text }),
    astFormat: "flatbuffers-format-ast",
    locStart: () => 0,
    locEnd: (node) => node.text.length,
  },
};

const printers: Record<string, Printer<FbsRoot>> = {
  "flatbuffers-format-ast": {
    print: (path) => path.node.text,
  },
};

const plugin: Plugin = { languages, parsers, printers };
export default plugin;
