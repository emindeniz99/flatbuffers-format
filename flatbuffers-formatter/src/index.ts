// Public API. Browser-safe — only imports `antlr4ng` and the generated
// parser, both of which work in browsers.

import {
  ATNSimulator,
  BaseErrorListener,
  CharStream,
  CommonTokenStream,
  RecognitionException,
  Recognizer,
  Token,
} from "antlr4ng";
import { FlatBuffersLexer } from "../generated/FlatBuffersLexer.js";
import { FlatBuffersParser } from "../generated/FlatBuffersParser.js";
import { Printer, type FormatOptions } from "./printer.js";

export type { FormatOptions } from "./printer.js";

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

  return new Printer(tokens, options).print(tree);
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
