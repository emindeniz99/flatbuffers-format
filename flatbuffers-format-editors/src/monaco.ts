// Monaco editor language registration for FlatBuffers schemas.
//
// Monaco ships with the "Monarch" tokenizer for syntactic highlighting
// (https://microsoft.github.io/monaco-editor/monarch.html), and a
// `LanguageConfiguration` for indentation / brackets / comments. We
// register both and bind a `flatbuffers-format` format provider that
// shells out to the in-process engine.
//
// Usage (consumer code):
//
//   import * as monaco from "monaco-editor";
//   import { registerFlatBuffers } from "flatbuffers-format-editors/monaco";
//
//   registerFlatBuffers(monaco);
//
//   monaco.editor.create(document.getElementById("editor")!, {
//     value: "table T { x: int; }",
//     language: "flatbuffers",
//     formatOnSave: true,
//   });
//
// We DO NOT bundle the `monaco-editor` package — consumers' bundlers
// (webpack/vite/esbuild) already integrate with it. We take the
// `monaco` namespace as a parameter, so this file works against any
// Monaco version that exposes the same public API (≥ 0.40).

import { format } from "flatbuffers-format";
import { BOOL_LITERALS, BUILTIN_TYPES, FLOAT_KEYWORDS, KEYWORDS } from "./tokens.js";

// We type-erase the namespace to `any` at the boundary; the inner
// functions use the structural shape we need. Avoids hard-coding the
// `monaco-editor` package as a runtime import — important because
// many bundlers do treeshaking-incompatible things to it.
// biome-ignore lint/suspicious/noExplicitAny: see comment above
type MonacoNs = any;

export const LANGUAGE_ID = "flatbuffers";

/**
 * Registers the FlatBuffers language with the given Monaco namespace.
 * Calling it twice is a no-op (Monaco silently ignores duplicate
 * registrations).
 */
export function registerFlatBuffers(monaco: MonacoNs): void {
  monaco.languages.register({
    id: LANGUAGE_ID,
    extensions: [".fbs"],
    aliases: ["FlatBuffers", "flatbuffers", "fbs"],
    mimetypes: ["text/x-flatbuffers"],
  });

  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, buildMonarchTokens());
  monaco.languages.setLanguageConfiguration(LANGUAGE_ID, buildLanguageConfig());
  monaco.languages.registerDocumentFormattingEditProvider(LANGUAGE_ID, buildFormatProvider());
}

function buildMonarchTokens() {
  return {
    defaultToken: "",
    tokenPostfix: ".fbs",

    keywords: [...KEYWORDS],
    builtinTypes: [...BUILTIN_TYPES],
    constants: [...BOOL_LITERALS, ...FLOAT_KEYWORDS],

    brackets: [
      { open: "{", close: "}", token: "delimiter.curly" },
      { open: "(", close: ")", token: "delimiter.parenthesis" },
      { open: "[", close: "]", token: "delimiter.square" },
    ],

    tokenizer: {
      root: [
        // Identifiers / keywords / types.
        [
          /[A-Za-z_][A-Za-z0-9_]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@builtinTypes": "type",
              "@constants": "constant",
              "@default": "identifier",
            },
          },
        ],

        // Whitespace & comments — passed to dedicated states so
        // multi-line block comments compose with @push/@pop.
        { include: "@whitespace" },

        // Numbers: hex floats, hex ints, decimal floats, integers.
        [/[+-]?0[xX][0-9a-fA-F]+(?:\.[0-9a-fA-F]*)?(?:[pP][+-]?\d+)?/, "number.hex"],
        [/[+-]?(?:\d+\.\d*|\.\d+|\d+)[eE][+-]?\d+/, "number.float"],
        [/[+-]?\d+\.\d*/, "number.float"],
        [/[+-]?\.\d+/, "number.float"],
        [/[+-]?\d+/, "number"],

        // Strings.
        [/"([^"\\]|\\.)*$/, "string.invalid"], // unterminated
        [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

        // Punctuation.
        [/[{}()[\]]/, "@brackets"],
        [/[;,.]/, "delimiter"],
        [/[:=]/, "operator"],
      ],

      whitespace: [
        [/[ \t\r\n]+/, ""],
        [/\/\/\/.*$/, "comment.doc"],
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@blockComment"],
      ],

      blockComment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],

      string: [
        [/[^\\"]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
      ],
    },
  };
}

function buildLanguageConfig() {
  return {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] as [string, string] },
    brackets: [
      ["{", "}"],
      ["(", ")"],
      ["[", "]"],
    ] as [string, string][],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: '"', close: '"' },
    ],
    indentationRules: {
      increaseIndentPattern: /^.*\{[^}"']*$/,
      decreaseIndentPattern: /^\s*\}/,
    },
  };
}

function buildFormatProvider() {
  return {
    provideDocumentFormattingEdits(model: MonacoNs) {
      const src: string = model.getValue();
      let formatted: string;
      try {
        formatted = format(src);
      } catch {
        // Refuse to replace on parse error — same policy as the
        // CodeMirror extension.
        return [];
      }
      if (formatted === src) return [];
      return [
        {
          range: model.getFullModelRange(),
          text: formatted,
        },
      ];
    },
  };
}
