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

import {
  format as fbsFormat,
  FormatError,
  type FormatOptions,
  hasIgnorePragma,
  hasPragma,
} from "flatbuffers-format";
import { resolveConfig } from "flatbuffers-format/config";
import type { Parser, Plugin, Printer, SupportLanguage } from "prettier";

/** The single-node AST produced by our parser and consumed by our printer. */
interface FbsRoot {
  type: "fbs-root";
  text: string;
}

type PrettierOptions = {
  filepath?: string;
  tabWidth?: number;
  useTabs?: boolean;
  printWidth?: number;
  trailingComma?: "all" | "es5" | "none";
  bracketSpacing?: boolean;
  objectWrap?: "preserve" | "collapse";
};

/**
 * The engine options for one file. A `.flatbuffers-format.json` found
 * for it wins outright, so Prettier formats exactly as the CLI and the
 * other editor plugins do. Without one, Prettier's options map across:
 *
 *   `tabWidth`       → `indent`
 *   `useTabs`        → `useTabs`
 *   `printWidth`     → `lineWidth`
 *   `trailingComma`  → `trailingComma` ("none" stays "none"; "all" and
 *                      "es5" both mean a comma after the last value)
 *   `bracketSpacing` → `bracketSpacing`
 *   `objectWrap`     → `objectWrap`
 *
 * Line endings are always `\n`: Prettier converts the output to its own
 * `endOfLine` afterwards, and CRLF from the engine would come out as
 * `\r\r\n`. Pragmas are Prettier's job too, through the parser's
 * `hasPragma` / `hasIgnorePragma` hooks below.
 */
function engineOptions(options: PrettierOptions): FormatOptions {
  const fromFile = options.filepath ? resolveConfig(options.filepath) : null;
  const base: FormatOptions = fromFile ?? {
    indent: options.tabWidth ?? 2,
    useTabs: options.useTabs ?? false,
    lineWidth: options.printWidth ?? 80,
    trailingComma: options.trailingComma === "none" ? "none" : "all",
    bracketSpacing: options.bracketSpacing ?? true,
    objectWrap: options.objectWrap ?? "preserve",
  };
  return { ...base, newline: "\n", endOfLine: "lf", checkIgnorePragma: false, requirePragma: false };
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
        return fbsFormat(text, engineOptions(options as PrettierOptions));
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
    hasPragma,
    hasIgnorePragma,
    astFormat: "flatbuffers-format-ast",
    locStart: () => 0,
    locEnd: (node) => node.text.length,
  },
};

const printers: Record<string, Printer<FbsRoot>> = {
  "flatbuffers-format-ast": {
    print: (path) => path.node.text,
    insertPragma: (text) => `// @format\n${text}`,
  },
};

const plugin: Plugin = { languages, parsers, printers };
export default plugin;
