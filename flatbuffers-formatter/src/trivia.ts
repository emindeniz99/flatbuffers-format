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
  const hidden = stream.getHiddenTokensToLeft(startIdx) ?? [];
  // If there's a previous real token in the stream, any comment that
  // sits on the same line as it has already been emitted as that
  // node's trailing comment — drop it here to avoid duplication.
  // If we're at the very start of the file (no previous real token),
  // keep everything.
  const hasPrevReal = previousRealToken(stream, startIdx) !== undefined;
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
 * Returns a trailing comment for `ctx` — a `//` or `/* * /` comment
 * that sits on the same line as the last token of `ctx`. Returns
 * undefined if there's nothing on the same line.
 */
export function trailingComment(
  ctx: ParserRuleContext,
  stream: BufferedTokenStream,
): Trivia | undefined {
  const stop = ctx.stop;
  if (!stop) return undefined;
  const hidden = stream.getHiddenTokensToRight(stop.tokenIndex) ?? [];
  for (const tok of hidden) {
    // Once we cross a newline, anything after it is "on the next
    // line" and therefore not a trailing comment of `ctx`.
    if (tok.type === WS && tok.text && tok.text.includes("\n")) return undefined;
    if (tok.type === LINE) {
      return { kind: "line_comment", value: stripPrefix(tok.text ?? "", "//") };
    }
    if (tok.type === BLOCK) {
      return {
        kind: "block_comment",
        value: stripWrap(tok.text ?? "", "/*", "*/"),
      };
    }
    if (tok.type === DOC) {
      // Trailing doc comments are unusual but possible.
      return { kind: "doc_comment", value: stripPrefix(tok.text ?? "", "///") };
    }
  }
  return undefined;
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
