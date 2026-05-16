/**
 * Tree-sitter grammar for FlatBuffers (.fbs) schema files.
 *
 * Mirrors the dialect accepted by `flatbuffers-format`'s ANTLR4 grammar
 * (projects/flatbuffers-formatter/grammar/FlatBuffers.g4) — including
 * per-enum-value metadata, union with explicit underlying type, C99 hex
 * floats, bare `inf`/`nan` floats, namespace re-opening, fixed-size
 * arrays `[T:N]`, `native_include` directives, end-of-file object
 * literals, and keyword-as-field-name.
 *
 * Editor consumers see the AST surface defined here. Internal helpers
 * use `_underscore` prefixes to stay hidden from the visible tree.
 */

/* eslint-disable arrow-parens, camelcase */

module.exports = grammar({
  name: "flatbuffers",

  // Doc comments, line comments, block comments, and whitespace can
  // appear between any two tokens. tree-sitter inserts these for us
  // when listed in `extras`.
  extras: ($) => [/\s/, $.doc_comment, $.block_comment, $.line_comment],

  // Identifiers and keywords overlap (`enum: int;` is legal — keyword
  // in field-name position). Tell tree-sitter to prefer keyword tokens
  // when the lexeme matches one, but fall back to `identifier` when
  // context demands.
  word: ($) => $.identifier,

  // Conflicts the LR(1) generator can't resolve on its own.
  conflicts: ($) => [
    // `{ name: foo }` — at the opening `{` we don't yet know whether
    // we're entering a table body (fields) or an object literal.
    // GLR splits and reconciles after the first token after `{`.
    [$.object_literal, $._table_or_struct_body_marker],
  ],

  rules: {
    // ---------- top level ----------
    source_file: ($) => repeat($._declaration),

    _declaration: ($) =>
      choice(
        $.include_decl,
        $.native_include_decl,
        $.namespace_decl,
        $.attribute_decl,
        $.root_type_decl,
        $.file_extension_decl,
        $.file_identifier_decl,
        $.table_decl,
        $.struct_decl,
        $.enum_decl,
        $.union_decl,
        $.rpc_service_decl,
        $.object_literal,
      ),

    // Marker rule — never emitted, only used to disambiguate the
    // `{` ... `}` conflict between table bodies and object literals.
    _table_or_struct_body_marker: ($) => seq("{", "}"),

    // ---------- simple top-level declarations ----------
    include_decl: ($) => seq("include", field("path", $.string_literal), ";"),

    native_include_decl: ($) => seq("native_include", field("path", $.string_literal), ";"),

    namespace_decl: ($) => seq("namespace", field("name", $.dotted_identifier), ";"),

    attribute_decl: ($) =>
      seq("attribute", field("name", choice($.string_literal, $.identifier)), ";"),

    root_type_decl: ($) => seq("root_type", field("type", $.dotted_identifier), ";"),

    file_extension_decl: ($) => seq("file_extension", field("extension", $.string_literal), ";"),

    file_identifier_decl: ($) => seq("file_identifier", field("identifier", $.string_literal), ";"),

    // ---------- compound declarations ----------
    table_decl: ($) =>
      seq(
        "table",
        field("name", $.identifier),
        optional(field("metadata", $.metadata)),
        field("body", $.table_body),
      ),

    struct_decl: ($) =>
      seq(
        "struct",
        field("name", $.identifier),
        optional(field("metadata", $.metadata)),
        field("body", $.table_body),
      ),

    table_body: ($) => seq("{", repeat($.field_decl), "}"),

    field_decl: ($) =>
      seq(
        field("name", $.identifier),
        ":",
        field("type", $.type_ref),
        optional(seq("=", field("default", $.scalar))),
        optional(field("metadata", $.metadata)),
        ";",
      ),

    // ---------- type references ----------
    type_ref: ($) =>
      choice(
        // Vector / array form. Optional `:N` makes it a fixed-size array.
        seq(
          "[",
          field("element", $.type_ref),
          optional(seq(":", field("size", $.int_literal))),
          "]",
        ),
        $.dotted_identifier,
      ),

    dotted_identifier: ($) => prec.right(seq($.identifier, repeat(seq(".", $.identifier)))),

    // ---------- enum / union ----------
    enum_decl: ($) =>
      seq(
        "enum",
        field("name", $.identifier),
        optional(seq(":", field("underlying_type", $.identifier))),
        optional(field("metadata", $.metadata)),
        "{",
        optional(seq($.enum_value_decl, repeat(seq(",", $.enum_value_decl)), optional(","))),
        "}",
      ),

    enum_value_decl: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq("=", field("value", $.scalar))),
        optional(field("metadata", $.metadata)),
      ),

    union_decl: ($) =>
      seq(
        "union",
        field("name", $.identifier),
        optional(seq(":", field("underlying_type", $.identifier))),
        optional(field("metadata", $.metadata)),
        "{",
        optional(seq($.union_value_decl, repeat(seq(",", $.union_value_decl)), optional(","))),
        "}",
      ),

    union_value_decl: ($) =>
      seq(optional(seq(field("alias", $.identifier), ":")), field("type", $.dotted_identifier)),

    // ---------- RPC ----------
    rpc_service_decl: ($) =>
      seq("rpc_service", field("name", $.identifier), "{", repeat($.rpc_method), "}"),

    rpc_method: ($) =>
      seq(
        field("name", $.identifier),
        "(",
        field("request", $.dotted_identifier),
        ")",
        ":",
        field("response", $.dotted_identifier),
        optional(field("metadata", $.metadata)),
        ";",
      ),

    // ---------- metadata ----------
    metadata: ($) =>
      seq("(", optional(seq($.metadata_entry, repeat(seq(",", $.metadata_entry)))), ")"),

    metadata_entry: ($) =>
      seq(field("key", $.identifier), optional(seq(":", field("value", $._single_value)))),

    // `singleValue` in the ANTLR grammar is `scalar | STRING_LITERAL`,
    // but `scalar` already includes `string_literal`, so the second
    // alternative is redundant — keep just `scalar` to avoid the
    // GLR conflict.
    _single_value: ($) => $.scalar,

    // ---------- scalar literals ----------
    scalar: ($) =>
      choice(
        seq(optional($._sign), $.hex_float_literal),
        seq(optional($._sign), $.float_literal),
        seq(optional($._sign), $.int_literal),
        $.string_literal,
        $.identifier,
      ),

    _sign: ($) => choice("+", "-"),

    // ---------- object literal (sample data at end of schema) ----------
    object_literal: ($) =>
      seq("{", optional(seq($.object_field, repeat(seq(",", $.object_field)))), "}"),

    object_field: ($) =>
      seq(
        field("key", choice($.identifier, $.string_literal)),
        ":",
        field("value", $._object_value),
      ),

    _object_value: ($) => choice($.object_literal, $.object_array, $.scalar),

    object_array: ($) =>
      seq("[", optional(seq($._object_value, repeat(seq(",", $._object_value)))), "]"),

    // ---------- terminals ----------
    // Identifiers — matches keywords too so `enum: int;` works. The
    // `word` declaration above tells tree-sitter that token-level
    // collisions with keywords should resolve in favour of the keyword
    // when contextually valid, otherwise fall through to identifier.
    identifier: ($) => /[a-zA-Z_][a-zA-Z_0-9]*/,

    // Hex float (C99) — ordered before float_literal so the longer
    // match wins. Three alternatives mirror the ANTLR lexer.
    hex_float_literal: ($) =>
      token(
        choice(
          /0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?[0-9]+/,
          /0[xX]\.[0-9a-fA-F]+[pP][+-]?[0-9]+/,
          /0[xX][0-9a-fA-F]+[pP][+-]?[0-9]+/,
        ),
      ),

    // Decimal/exponent float. `[0-9]+ EXP` form requires an exponent
    // so it doesn't shadow plain int_literal (which is shorter).
    float_literal: ($) =>
      token(
        choice(
          /[0-9]+\.[0-9]*([eE][+-]?[0-9]+)?/,
          /\.[0-9]+([eE][+-]?[0-9]+)?/,
          /[0-9]+[eE][+-]?[0-9]+/,
        ),
      ),

    // Hex or decimal integer. Hex variant listed first so longest-match
    // resolves correctly inside `token(choice(...))`.
    int_literal: ($) => token(choice(/0[xX][0-9a-fA-F]+/, /[0-9]+/)),

    string_literal: ($) => token(/"([^"\\\r\n]|\\.)*"/),

    // Comments — three forms. Doc comments (`///`) come before line
    // comments so the longest-match tie favours them.
    doc_comment: ($) => token(prec(2, /\/\/\/[^\r\n]*/)),
    line_comment: ($) => token(prec(1, /\/\/[^\r\n]*/)),
    block_comment: ($) => token(seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
  },
});
