// CodeMirror 6 language extension for FlatBuffers schemas.
//
// Built on `StreamLanguage` rather than Lezer. Tradeoffs:
//   + Tiny — no separate grammar build, no `.lezer` file to maintain.
//   + Trivial to keep in sync with the engine grammar (same keyword
//     lists as the IntelliJ lexer and Monaco tokenizer).
//   - No incremental parsing or PSI tree. For a formatter-only
//     integration that's fine — the engine handles parsing; the
//     editor just colorizes.
//
// Usage (consumer code):
//
//   import { EditorView, basicSetup } from "codemirror";
//   import { flatbuffers } from "flatbuffers-format-editors/codemirror";
//
//   new EditorView({
//     doc: "table T { x: int; }",
//     parent: document.body,
//     extensions: [basicSetup, flatbuffers()],
//   });
//
// Also exports `formatExtension()` — a thin CodeMirror extension that
// binds Ctrl/Cmd+Shift+F to "format current document via
// flatbuffers-format", calling the engine's pure `format()` function
// in-process. No CLI, no Node — entirely browser-safe.

import { LanguageSupport, StreamLanguage, type StreamParser } from "@codemirror/language";
import { keymap, type Command } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { format } from "flatbuffers-format";

import { BOOL_LITERALS, BUILTIN_TYPES, FLOAT_KEYWORDS, KEYWORDS } from "./tokens.js";

interface State {
  inBlockComment: boolean;
}

const KEYWORD_SET = new Set<string>(KEYWORDS);
const BUILTIN_SET = new Set<string>(BUILTIN_TYPES);
const BOOL_SET = new Set<string>(BOOL_LITERALS);
const FLOAT_KW_SET = new Set<string>(FLOAT_KEYWORDS);

const parser: StreamParser<State> = {
  startState: () => ({ inBlockComment: false }),

  token(stream, state) {
    // Continuing a block comment from a previous line.
    if (state.inBlockComment) {
      while (!stream.eol()) {
        if (stream.match(/\*\//)) {
          state.inBlockComment = false;
          return "blockComment";
        }
        stream.next();
      }
      return "blockComment";
    }

    if (stream.eatSpace()) return null;

    // Doc comment `///` first — must beat `//`.
    if (stream.match(/\/\/\//)) {
      stream.skipToEnd();
      return "docComment";
    }
    if (stream.match(/\/\//)) {
      stream.skipToEnd();
      return "lineComment";
    }
    if (stream.match(/\/\*/)) {
      state.inBlockComment = true;
      while (!stream.eol()) {
        if (stream.match(/\*\//)) {
          state.inBlockComment = false;
          return "blockComment";
        }
        stream.next();
      }
      return "blockComment";
    }

    // Strings — `"..."` with `\"` and `\\` escapes; stops at newline so
    // an unterminated string doesn't bleed into the rest of the file.
    if (stream.match(/"(?:\\.|[^"\\\n])*"?/)) return "string";

    // Numbers: hex float `0x1.fp+2`, hex `0xFF`, float `1.5e-2`, int.
    if (
      stream.match(/[+-]?0[xX][0-9a-fA-F]+(?:\.[0-9a-fA-F]*)?(?:[pP][+-]?\d+)?/) ||
      stream.match(/[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?/)
    ) {
      return "number";
    }

    // Identifiers / keywords / builtin types.
    if (stream.match(/[A-Za-z_][A-Za-z0-9_]*/)) {
      const word = (stream as unknown as { current(): string }).current();
      if (KEYWORD_SET.has(word)) return "keyword";
      if (BUILTIN_SET.has(word)) return "typeName";
      if (BOOL_SET.has(word)) return "bool";
      if (FLOAT_KW_SET.has(word)) return "atom";
      return "variableName";
    }

    // Single-char punctuation. CodeMirror's default highlighter has
    // dedicated styles for braces/brackets/punctuation; we just
    // surface them as distinct tag names and let the user's theme
    // colour them.
    const c = stream.next();
    if (c === "{" || c === "}") return "brace";
    if (c === "(" || c === ")") return "paren";
    if (c === "[" || c === "]") return "squareBracket";
    if (c === ";" || c === ",") return "separator";
    if (c === ":" || c === "=" || c === ".") return "operator";
    return null;
  },

  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
    closeBrackets: { brackets: ["(", "[", "{", '"'] },
    indentOnInput: /^\s*[}\]]$/,
  },
};

/**
 * The CodeMirror 6 language extension. Returns a `LanguageSupport`
 * that you slot into `extensions:` alongside `basicSetup` (or your
 * editor configuration of choice).
 */
export function flatbuffers(): LanguageSupport {
  return new LanguageSupport(StreamLanguage.define(parser));
}

/**
 * Replaces the whole document with `format(document)`. Bound to
 * Ctrl/Cmd+Shift+F by `formatKeymap()`. Exposed separately so callers
 * who manage their own keymap can wire it however they like.
 */
export const formatCommand: Command = (view) => {
  const src = view.state.doc.toString();
  let formatted: string;
  try {
    formatted = format(src);
  } catch {
    // Parse error — leave the document as-is. The editor is for
    // editing; refusing to mangle invalid input is the right call.
    return false;
  }
  if (formatted === src) return true;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: formatted },
  });
  return true;
};

/**
 * A keymap extension binding Ctrl/Cmd+Shift+F to {@link formatCommand}.
 * Wrapped in `Prec.high` so it wins against the default global
 * keymap.
 */
export function formatKeymap() {
  return Prec.high(keymap.of([{ key: "Mod-Shift-f", run: formatCommand, preventDefault: true }]));
}
