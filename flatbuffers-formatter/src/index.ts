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

export function check(source: string, options: FormatOptions = {}): boolean {
  return format(source, options) === source;
}
