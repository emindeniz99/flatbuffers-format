// Public API. Browser-safe — only imports `antlr4ng` and the generated
// parser, both of which work in browsers.

import {
  type ATNSimulator,
  BaseErrorListener,
  CharStream,
  CommonTokenStream,
  type RecognitionException,
  type Recognizer,
  type Token,
} from "antlr4ng";
import { FlatBuffersLexer } from "../generated/FlatBuffersLexer.js";
import { FlatBuffersParser } from "../generated/FlatBuffersParser.js";
import { Printer, type FormatOptions } from "./printer.js";

export type { FormatOptions } from "./printer.js";
export { VERSION } from "./version.js";

/**
 * Thrown by {@link format} and {@link check} when the input cannot be
 * parsed as a valid FlatBuffers (`.fbs`) schema.
 *
 * Carries 1-based `line` and 0-based `column` of the first reported
 * error, suitable for editor diagnostics.
 *
 * @example
 * ```ts
 * import { format, FormatError } from "flatbuffers-format";
 * try {
 *   format("table T { x: }");
 * } catch (e) {
 *   if (e instanceof FormatError) {
 *     console.error(`schema error at ${e.line}:${e.column}: ${e.message}`);
 *   }
 * }
 * ```
 */
export class FormatError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(`line ${line}:${column} ${message}`);
  }
}

/**
 * Thrown by {@link format} when the formatted output would not carry
 * every comment of the input — a printer bug, never a problem with the
 * schema. Refusing to format is the safe failure: a formatter that
 * silently deletes comments destroys documentation nobody notices is
 * gone until it is needed.
 *
 * `missing` lists comments of the input absent from the output; `added`
 * lists comments the output has that the input did not (a duplicate).
 */
export class CommentLossError extends Error {
  constructor(
    public readonly missing: string[],
    public readonly added: string[],
  ) {
    const parts: string[] = [];
    if (missing.length) parts.push(`would drop ${quoteAll(missing)}`);
    if (added.length) parts.push(`would add ${quoteAll(added)}`);
    super(
      `internal error: formatting ${parts.join(" and ")}; refusing to format. ` +
        "Please report this at https://github.com/emindeniz99/flatbuffers-format/issues",
    );
    this.name = "CommentLossError";
  }
}

function quoteAll(comments: string[]): string {
  return comments.map((c) => JSON.stringify(c)).join(", ");
}

class CollectingErrorListener extends BaseErrorListener {
  errors: FormatError[] = [];
  override syntaxError<S extends Token, T extends ATNSimulator>(
    _recognizer: Recognizer<T>,
    _offendingSymbol: S | null,
    line: number,
    column: number,
    msg: string,
    _e: RecognitionException | null,
  ): void {
    this.errors.push(new FormatError(msg, line, column));
  }
}

/**
 * Format a FlatBuffers schema source string into the canonical form.
 *
 * The returned string is a *fixed point*: `format(format(x)) === format(x)`.
 * Comments, doc comments, and paragraph breaks between top-level
 * declarations are preserved.
 *
 * @param source The raw `.fbs` source.
 * @param options See {@link FormatOptions}. Defaults: 2-space indent, `\n` newline.
 * @returns The formatted schema, including a single trailing newline.
 * @throws {FormatError} if the input fails to parse. The error carries
 *   the line and column of the first reported syntax problem.
 * @throws {CommentLossError} if the output would not contain every
 *   comment of the input. This is a formatter bug; the input is fine.
 *
 * @example
 * ```ts
 * import { format } from "flatbuffers-format";
 *
 * const ugly = "table T{x:int;y:string=\"hi\";}";
 * format(ugly);
 * // -> "table T {\n  x: int;\n  y: string = \"hi\";\n}\n"
 *
 * format(ugly, { indent: 4 });
 * // -> "table T {\n    x: int;\n    y: string = \"hi\";\n}\n"
 * ```
 */
export function format(source: string, options: FormatOptions = {}): string {
  if (options.checkIgnorePragma || options.requirePragma) {
    const header = headerComments(source);
    if (options.checkIgnorePragma && /@(?:noformat|noprettier)\b/.test(header)) return source;
    if (options.requirePragma && !/@(?:format|prettier)\b/.test(header)) return source;
  }
  const input = CharStream.fromString(source);
  const lexer = new FlatBuffersLexer(input);
  const lexerErrors = new CollectingErrorListener();
  lexer.removeErrorListeners();
  lexer.addErrorListener(lexerErrors);

  const tokens = new CommonTokenStream(lexer);
  const parser = new FlatBuffersParser(tokens);
  const parserErrors = new CollectingErrorListener();
  parser.removeErrorListeners();
  parser.addErrorListener(parserErrors);

  const tree = parser.schema();

  if (lexerErrors.errors.length || parserErrors.errors.length) {
    const all = [...lexerErrors.errors, ...parserErrors.errors];
    throw all[0]!;
  }

  const output = new Printer(tokens, { ...options, newline: newlineFor(source, options) }).print(tree);
  assertCommentsPreserved(source, output, options.wrapComments ?? false);
  return output;
}

// The comments before the first declaration, where Prettier's pragmas
// go.
function headerComments(source: string): string {
  let header = "";
  let i = 0;
  for (;;) {
    while (i < source.length && /\s/.test(source[i]!)) i++;
    let end: number;
    if (source.startsWith("//", i)) {
      end = source.indexOf("\n", i);
      if (end < 0) end = source.length;
    } else if (source.startsWith("/*", i)) {
      end = source.indexOf("*/", i + 2);
      end = end < 0 ? source.length : end + 2;
    } else {
      return header;
    }
    header += `${source.slice(i, end)}\n`;
    i = end;
  }
}

// `endOfLine` wins over `newline`; "auto" keeps the source's first
// line break, and LF when it has none.
function newlineFor(source: string, options: FormatOptions): "\n" | "\r\n" {
  switch (options.endOfLine) {
    case "lf":
      return "\n";
    case "crlf":
      return "\r\n";
    case "auto":
      return /\r?\n/.exec(source)?.[0] === "\r\n" ? "\r\n" : "\n";
    default:
      return options.newline ?? "\n";
  }
}

// Every comment of the input must appear in the output, compared as a
// multiset of trimmed comment text. `wrapComments` legitimately splits
// one long line comment into several, so with it on, line comments are
// compared word by word instead.
function assertCommentsPreserved(source: string, output: string, wrapComments: boolean): void {
  const counts = new Map<string, number>();
  for (const key of commentKeys(source, wrapComments)) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const added: string[] = [];
  for (const key of commentKeys(output, wrapComments)) {
    const n = counts.get(key) ?? 0;
    if (n === 0) added.push(key);
    else counts.set(key, n - 1);
  }
  const missing: string[] = [];
  for (const [key, n] of counts) for (let k = 0; k < n; k++) missing.push(key);
  if (missing.length || added.length) throw new CommentLossError(missing, added);
}

function commentKeys(text: string, splitLineComments: boolean): string[] {
  const keys: string[] = [];
  for (const comment of scanComments(text)) {
    const words =
      splitLineComments && !comment.startsWith("///") && !comment.startsWith("/*")
        ? comment.slice(2).split(/\s+/).filter(Boolean)
        : [];
    if (words.length === 0) keys.push(comment);
    else for (const w of words) keys.push(`// ${w}`);
  }
  return keys;
}

// The comments of `text`, trimmed, in order. Mirrors the grammar's
// lexer rules for the only tokens that can hold `/`: string literals
// (no newlines, backslash escapes) and the three comment kinds. Run on
// both the input and the output, so the two sides are always read the
// same way; it avoids a second ANTLR lex, which is the slow part.
function scanComments(text: string): string[] {
  const comments: string[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      i++;
      while (i < text.length && text[i] !== '"' && text[i] !== "\n") i += text[i] === "\\" ? 2 : 1;
      i++;
    } else if (c === "/" && text[i + 1] === "/") {
      let end = i;
      while (end < text.length && text[end] !== "\n" && text[end] !== "\r") end++;
      comments.push(text.slice(i, end).trim());
      i = end;
    } else if (c === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      const end = close < 0 ? text.length : close + 2;
      comments.push(text.slice(i, end).trim());
      i = end;
    } else {
      i++;
    }
  }
  return comments;
}

/**
 * Return `true` iff `source` is already in canonical form — i.e. running
 * {@link format} on it would produce byte-identical output.
 *
 * Useful as a CI gate: walk a tree, call `check` on each `.fbs` file,
 * exit non-zero if any return `false`. The shipped CLI's `--check` flag
 * is built on this.
 *
 * @param source The raw `.fbs` source.
 * @param options Same options as {@link format}. Defaults must match the
 *   ones you'd write with, otherwise a "well-formatted" file may falsely
 *   report unformatted.
 * @throws {FormatError} on invalid input (same as {@link format}).
 */
export function check(source: string, options: FormatOptions = {}): boolean {
  return format(source, options) === source;
}
