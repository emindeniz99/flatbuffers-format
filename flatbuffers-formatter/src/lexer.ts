// Hand-written lexer for FlatBuffers schema files.
//
// Whitespace and comments are "trivia" — attached to the next real
// token as `leading` (or to the previous token as `trailing` when on
// the same line). Two or more consecutive newlines collapse to a single
// `blank_line` trivia so the printer can preserve paragraph breaks.

import type { Token, TokenKind, Trivia } from "./types.js";

export class LexError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`${message} (line ${line}, col ${col})`);
  }
}

const PUNCT: Record<string, TokenKind> = {
  "(": "lparen",
  ")": "rparen",
  "{": "lbrace",
  "}": "rbrace",
  "[": "lbracket",
  "]": "rbracket",
  ":": "colon",
  ";": "semi",
  ",": "comma",
  "=": "equals",
  ".": "dot",
  "+": "plus",
  "-": "minus",
};

export function tokenize(source: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  let pending: Trivia[] = [];
  let consecutiveNewlines = 0;
  // True iff we've seen a newline since emitting the last real token.
  // Trailing comments must live on the same line as their token.
  let sawNewlineSinceToken = false;

  const peek = (off = 0) => source[i + off];
  const eof = () => i >= source.length;

  const advance = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (source[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  };

  const pushTrivia = (t: Trivia) => {
    pending.push(t);
  };

  const tryAttachTrailing = (t: Trivia): boolean => {
    if (sawNewlineSinceToken || out.length === 0) return false;
    if (t.kind !== "line_comment" && t.kind !== "block_comment") return false;
    const last = out[out.length - 1]!;
    if (last.trailing) return false;
    last.trailing = t;
    return true;
  };

  const readLineComment = (): Trivia => {
    // We've already verified `peek() === "/" && peek(1) === "/"`
    const startCol = col;
    const isDoc = peek(2) === "/";
    advance(isDoc ? 3 : 2);
    const start = i;
    while (!eof() && peek() !== "\n") advance();
    const value = source.slice(start, i);
    void startCol;
    return isDoc
      ? { kind: "doc_comment", value }
      : { kind: "line_comment", value };
  };

  const readBlockComment = (): Trivia => {
    const startLine = line;
    const startCol = col;
    advance(2); // /*
    const start = i;
    while (!eof()) {
      if (peek() === "*" && peek(1) === "/") {
        const value = source.slice(start, i);
        advance(2);
        return { kind: "block_comment", value };
      }
      advance();
    }
    throw new LexError("unterminated block comment", startLine, startCol);
  };

  const readString = (): Token => {
    const startLine = line;
    const startCol = col;
    advance(); // opening "
    const start = i;
    while (!eof() && peek() !== "\"") {
      if (peek() === "\\" && !eof()) {
        advance(2);
      } else if (peek() === "\n") {
        throw new LexError("unterminated string literal", startLine, startCol);
      } else {
        advance();
      }
    }
    if (eof()) {
      throw new LexError("unterminated string literal", startLine, startCol);
    }
    const value = source.slice(start, i);
    advance(); // closing "
    return makeToken("string", value, startLine, startCol);
  };

  const isDigit = (c: string | undefined) => c !== undefined && c >= "0" && c <= "9";
  const isHex = (c: string | undefined) =>
    c !== undefined &&
    ((c >= "0" && c <= "9") || (c >= "a" && c <= "f") || (c >= "A" && c <= "F"));
  const isIdentStart = (c: string | undefined) =>
    c !== undefined &&
    ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_");
  const isIdentPart = (c: string | undefined) =>
    isIdentStart(c) || isDigit(c);

  const readNumber = (): Token => {
    const startLine = line;
    const startCol = col;
    const start = i;
    // Hex / oct prefixes
    if (peek() === "0" && (peek(1) === "x" || peek(1) === "X")) {
      advance(2);
      while (isHex(peek())) advance();
      return makeToken("int", source.slice(start, i), startLine, startCol);
    }
    while (isDigit(peek())) advance();
    let isFloat = false;
    if (peek() === ".") {
      isFloat = true;
      advance();
      while (isDigit(peek())) advance();
    }
    if (peek() === "e" || peek() === "E") {
      isFloat = true;
      advance();
      if (peek() === "+" || peek() === "-") advance();
      while (isDigit(peek())) advance();
    }
    return makeToken(
      isFloat ? "float" : "int",
      source.slice(start, i),
      startLine,
      startCol,
    );
  };

  const readIdent = (): Token => {
    const startLine = line;
    const startCol = col;
    const start = i;
    advance();
    while (isIdentPart(peek())) advance();
    return makeToken("ident", source.slice(start, i), startLine, startCol);
  };

  const makeToken = (
    kind: TokenKind,
    value: string,
    tLine: number,
    tCol: number,
  ): Token => {
    const tok: Token = {
      kind,
      value,
      line: tLine,
      col: tCol,
      leading: pending,
    };
    pending = [];
    consecutiveNewlines = 0;
    sawNewlineSinceToken = false;
    return tok;
  };

  while (!eof()) {
    const c = peek();
    if (c === " " || c === "\t" || c === "\r") {
      advance();
      continue;
    }
    if (c === "\n") {
      advance();
      consecutiveNewlines++;
      sawNewlineSinceToken = true;
      if (
        consecutiveNewlines === 2 &&
        pending[pending.length - 1]?.kind !== "blank_line"
      ) {
        // Collapse runs of newlines to a single blank_line marker.
        pending.push({ kind: "blank_line" });
      }
      continue;
    }
    if (c === "/" && peek(1) === "/") {
      const t = readLineComment();
      if (!tryAttachTrailing(t)) pushTrivia(t);
      continue;
    }
    if (c === "/" && peek(1) === "*") {
      const t = readBlockComment();
      if (!tryAttachTrailing(t)) pushTrivia(t);
      continue;
    }
    if (c === "\"") {
      out.push(readString());
      continue;
    }
    if (isDigit(c) || (c === "." && isDigit(peek(1)))) {
      out.push(readNumber());
      continue;
    }
    if (isIdentStart(c)) {
      out.push(readIdent());
      continue;
    }
    if (c !== undefined && PUNCT[c]) {
      const startLine = line;
      const startCol = col;
      advance();
      out.push(makeToken(PUNCT[c]!, c, startLine, startCol));
      continue;
    }
    throw new LexError(`unexpected character '${c}'`, line, col);
  }

  // Trailing trivia after the last real token (e.g. comments / blank
  // lines at end of file). We model EOF as a token so the printer has
  // somewhere to attach those, ensuring trailing comments survive a
  // round-trip.
  out.push({
    kind: "eof",
    value: "",
    line,
    col,
    leading: pending,
  });
  return out;
}
