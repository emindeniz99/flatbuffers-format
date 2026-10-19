// Extract comment / blank-line "trivia" out of ANTLR's hidden channel.
//
// ANTLR routes whitespace and comments to channel(HIDDEN) so they
// don't interfere with parsing. We still need them for formatting,
// so this module pulls them back out from the BufferedTokenStream
// around each parse-tree node.

import type {
  BufferedTokenStream,
  ParserRuleContext,
  Token,
} from "antlr4ng";
import { FlatBuffersLexer } from "../generated/FlatBuffersLexer.js";

export type Trivia =
  | { kind: "line_comment"; value: string }
  | { kind: "block_comment"; value: string }
  | { kind: "doc_comment"; value: string }
  | { kind: "blank_line" };

const DOC = FlatBuffersLexer.DOC_COMMENT;
const LINE = FlatBuffersLexer.LINE_COMMENT;
const BLOCK = FlatBuffersLexer.BLOCK_COMMENT;
const WS = FlatBuffersLexer.WS;

// Lex-time cap on how many consecutive blank_line markers we emit. The
// printer's `maxBlankLines` option caps further; this is just a safety
// net so a pathological file with thousands of blank lines doesn't
// blow up the trivia stream.
const LEX_BLANK_CAP = 32;

/**
 * Returns leading trivia for `ctx`: comments and blank lines that
 * appear in the source before the node's first token. Whitespace is
 * inspected to detect blank lines (≥ 2 consecutive newlines).
 */
export function leadingTrivia(
  ctx: ParserRuleContext,
  stream: BufferedTokenStream,
): Trivia[] {
  const startIdx = ctx.start?.tokenIndex;
  if (startIdx === undefined || startIdx < 0) return [];
  return leadingTriviaAt(startIdx, stream);
}

/**
 * Leading trivia for the real token at `index` (see {@link leadingTrivia}).
 * Used directly for a closing `}`, which has no context of its own.
 */
export function leadingTriviaAt(index: number, stream: BufferedTokenStream): Trivia[] {
  const hidden = stream.getHiddenTokensToLeft(index) ?? [];
  // If there's a previous real token in the stream, any comment that
  // sits on the same line as it has already been emitted as that
  // node's trailing comment — drop it here to avoid duplication.
  // If we're at the very start of the file (no previous real token),
  // keep everything.
  const hasPrevReal = previousRealToken(stream, index) !== undefined;
  let skipUntilNewline = hasPrevReal;
  const filtered: Token[] = [];
  for (const tok of hidden) {
    if (skipUntilNewline) {
      const isNewlineWS = tok.type === WS && (tok.text ?? "").includes("\n");
      if (isNewlineWS) {
        skipUntilNewline = false;
        filtered.push(tok);
      }
      continue;
    }
    filtered.push(tok);
  }
  return toTrivia(filtered);
}

function previousRealToken(stream: BufferedTokenStream, index: number): Token | undefined {
  for (let i = index - 1; i >= 0; i--) {
    const t = stream.get(i);
    if (t.channel === 0) return t;
  }
  return undefined;
}

/**
 * Every comment after the real token at `index` that sits on the same
 * line as it — everything up to the first newline or the next real
 * token, whichever comes first. A line comment can only be the last
 * of them; block comments may precede it.
 */
export function trailingComments(index: number, stream: BufferedTokenStream): Trivia[] {
  const hidden = stream.getHiddenTokensToRight(index) ?? [];
  const sameLine: Token[] = [];
  for (const tok of hidden) {
    // Once we cross a newline, anything after it is "on the next
    // line" and belongs to whatever follows as leading trivia.
    if (tok.type === WS && (tok.text ?? "").includes("\n")) break;
    sameLine.push(tok);
  }
  return toTrivia(sameLine);
}

/**
 * Every comment strictly between the real tokens at `from` and `to`,
 * wherever the line breaks fall. The printer rebuilds the text between
 * two tokens from the parse tree, so without this any comment written
 * mid-declaration (say, between a field name and its `:`) would vanish.
 */
export function commentsBetween(
  from: number,
  to: number,
  stream: BufferedTokenStream,
): Trivia[] {
  const comments: Token[] = [];
  for (let i = from + 1; i < to; i++) {
    const tok = stream.get(i);
    if (tok.channel !== 0 && tok.type !== WS) comments.push(tok);
  }
  return toTrivia(comments);
}

/** Whether any comment sits strictly between the real tokens at `from` and `to`. */
export function hasCommentsBetween(from: number, to: number, stream: BufferedTokenStream): boolean {
  for (let i = from + 1; i < to; i++) {
    const tok = stream.get(i);
    if (tok.channel !== 0 && tok.type !== WS) return true;
  }
  return false;
}

/**
 * Trivia that appears at the end of the file (after the last decl).
 * Used so trailing comments survive a round-trip.
 */
export function tailTrivia(stream: BufferedTokenStream): Trivia[] {
  const tokens = stream.getTokens();
  let lastReal = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!;
    if (t.channel === 0 && t.type !== Token_EOF()) {
      lastReal = i;
      break;
    }
  }
  if (lastReal < 0) return toTrivia(tokens.filter((t) => t.channel !== 0));
  let tail = tokens.slice(lastReal + 1).filter((t) => t.channel !== 0);
  // The last real token (typically `}`) may itself have a trailing
  // comment on the same line — that's emitted by the decl printer
  // via writeTrailing. Drop any hidden tokens before the first
  // newline so we don't double-print it here.
  let skipUntilNewline = true;
  const filtered: Token[] = [];
  for (const tok of tail) {
    if (skipUntilNewline) {
      const isNewlineWS = tok.type === WS && (tok.text ?? "").includes("\n");
      if (isNewlineWS) {
        skipUntilNewline = false;
        filtered.push(tok);
      }
      continue;
    }
    filtered.push(tok);
  }
  return toTrivia(filtered);
}

function Token_EOF(): number {
  // antlr4ng exports Token.EOF = -1; avoid import cycle for tests.
  return -1;
}

function toTrivia(tokens: Token[]): Trivia[] {
  const out: Trivia[] = [];
  for (const tok of tokens) {
    const text = tok.text ?? "";
    switch (tok.type) {
      case DOC:
        out.push({ kind: "doc_comment", value: stripPrefix(text, "///") });
        break;
      case LINE:
        out.push({ kind: "line_comment", value: stripPrefix(text, "//") });
        break;
      case BLOCK:
        out.push({ kind: "block_comment", value: stripWrap(text, "/*", "*/") });
        break;
      case WS: {
        // Count newlines: a WS chunk with N (>=2) newlines means N-1
        // blank lines between the previous and next non-WS content.
        // We emit one `blank_line` marker per source blank line up to
        // a safety cap so the printer can honor `maxBlankLines` (the
        // printer itself caps; the cap here only prevents pathological
        // inputs from blowing memory).
        const newlines = (text.match(/\n/g) ?? []).length;
        if (newlines >= 2) {
          const blanks = Math.min(newlines - 1, LEX_BLANK_CAP);
          for (let k = 0; k < blanks; k++) out.push({ kind: "blank_line" });
        }
        break;
      }
    }
  }
  return out;
}

function stripPrefix(s: string, prefix: string): string {
  return s.startsWith(prefix) ? s.slice(prefix.length) : s;
}

function stripWrap(s: string, open: string, close: string): string {
  let r = s;
  if (r.startsWith(open)) r = r.slice(open.length);
  if (r.endsWith(close)) r = r.slice(0, -close.length);
  return r;
}
