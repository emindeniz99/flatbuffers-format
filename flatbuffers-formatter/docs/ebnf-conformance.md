# EBNF conformance audit

This document is a point-in-time audit that maps every production in the
official FlatBuffers EBNF grammar to a rule in our ANTLR4 grammar at
[`grammar/FlatBuffers.g4`](../grammar/FlatBuffers.g4), so a reviewer can
verify conformance at a glance.

- Upstream spec: <https://flatbuffers.dev/grammar/>
  (formerly <https://flatbuffers.dev/flatbuffers_grammar.html>; the
  legacy URL now redirects).
- Local grammar: `projects/flatbuffers-formatter/grammar/FlatBuffers.g4`.
- Audit date: **2026-05-14**.

The EBNF on flatbuffers.dev can change upstream without us noticing.
Treat this audit as a snapshot. The verification protocol at the bottom
explains how to re-run it.

This audit complements [`docs/grammar-comparison.md`](./grammar-comparison.md),
which compares our `.g4` to the `antlr/grammars-v4` flatbuffers grammar
and documents the gaps that were closed in that round. Here we measure
against the *spec*, not against another `.g4`.

## Status legend

- **yes** — our rule accepts exactly what the upstream production
  accepts (modulo trivia like whitespace).
- **partial** — our rule accepts most of it but with a documented
  narrowing or an interpretation difference.
- **extension** — we accept more than the upstream EBNF describes,
  intentionally, to match what `flatc` actually parses in the wild.
- **gap** — we reject input the upstream EBNF accepts.

## Production-by-production table

The upstream grammar defines 30 productions. Every one is enumerated
below.

| # | Upstream production | Our `.g4` rule(s) | Status | Notes |
|---|---|---|---|---|
| 1 | `schema` | `schema`, `decl` | extension | We accept the same eight top-level declaration kinds. We do **not** require `include` directives to appear before other declarations (upstream lists them as a prefix); this matches `flatc`'s real behavior. |
| 2 | `include` | `includeDecl` | extension | We accept both `include` and `native_include` under the same rule. See [Deliberate extensions](#deliberate-extensions). |
| 3 | `namespace_decl` | `namespaceDecl` | yes | Dot-separated identifier path terminated by `;`. |
| 4 | `attribute_decl` | `attributeDecl` | yes | Quoted string **or** bare identifier — matches upstream. |
| 5 | `type_decl` | `tableDecl`, `structDecl` | yes | Upstream uses one rule with `(table\|struct)`; we split for clarity. The accepted language is identical. Our field list is `fieldDecl*` (zero or more); upstream's `field_decl+` requires at least one. See [Deliberate extensions](#deliberate-extensions). |
| 6 | `enum_decl` | `enumDecl`, `unionDecl`, `unionValDecl` | partial | Upstream folds enum and union into one production. We split them: `enumDecl` handles `enum NAME : TYPE { … }`, `unionDecl` handles `union NAME { … }`. Net accepted language matches, with one extension: union members may carry an optional `name :` prefix (`unionValDecl: (identifier ':')? nsIdent`), which `flatc` accepts but the EBNF does not formalize. |
| 7 | `root_decl` | `rootTypeDecl` | yes | `root_type` + namespaced identifier + `;`. |
| 8 | `field_decl` | `fieldDecl` | yes | `IDENT ':' type ('=' scalar)? metadata? ';'`. |
| 9 | `rpc_decl` | `rpcServiceDecl` | partial | Upstream requires one or more `rpc_method` (`rpc_method+`); we accept zero or more (`rpcMethod*`). An empty `rpc_service` body is technically out-of-spec but is harmless for a formatter and matches `flatc`. |
| 10 | `rpc_method` | `rpcMethod` | yes | `IDENT '(' nsIdent ')' ':' nsIdent metadata? ';'`. |
| 11 | `type` | `typeRef`, `nsIdent` | partial | Upstream enumerates base type names (`bool`, `byte`, `int32`, `string`, …) as keywords. We lex them as `IDENT` and accept any `IDENT` (or namespaced `IDENT`) in type position. Strictly broader than the spec; flagged as **partial** rather than **extension** because the looseness is incidental, not deliberate. A non-existent type name parses cleanly in our grammar; `flatc` would reject it at semantic-analysis time. |
| 12 | `enumval_decl` | `enumValDecl` | partial | Upstream allows optional metadata on each enum value (`ident [ = integer_constant ] [ metadata ]`). We accept `identifier ('=' scalar)?` but no per-value metadata. No fixture in the corpus exercises per-value metadata, so this has not surfaced in practice. |
| 13 | `metadata` | `metadata`, `metadataEntry` | yes | Optional parenthesized comma-separated list of `ident (: single_value)?`. |
| 14 | `scalar` | `scalar` | extension | Upstream: `boolean_constant \| integer_constant \| float_constant`. Ours additionally accepts `STRING_LITERAL` and bare `identifier` (the latter covers `true`/`false`/`inf`/`nan`/`infinity` since we lex them as `IDENT`). String-in-scalar position is a real-world `flatc` extension used for default values like enum names. |
| 15 | `object` | `objectLiteral`, `objectField`, `objectValue` | yes | `{ commasep(key : value) }` with key as `identifier` or `STRING_LITERAL`. |
| 16 | `single_value` | `singleValue` | yes | `scalar \| STRING_LITERAL`. |
| 17 | `value` | `objectValue` | yes | `scalar \| objectLiteral \| '[' commasep(objectValue) ']'`. |
| 18 | `commasep` | (inlined) | yes | Upstream is a parameterized macro; we inline the `x (',' x)*` pattern at each call site, with trailing-comma tolerance on enum/union value lists (matching `flatc`). |
| 19 | `file_extension_decl` | `fileExtensionDecl` | yes | `file_extension STRING_LITERAL ';'`. |
| 20 | `file_identifier_decl` | `fileIdentifierDecl` | yes | `file_identifier STRING_LITERAL ';'`. |
| 21 | `string_constant` | `STRING_LITERAL` (lexer) | partial | Upstream defines a specific escape set (`\n`, `\t`, `\"`, `\\`, `\x..`, `\u….`). Our lexer accepts a permissive `'\\' .` — anything after a backslash. We never reject a well-formed upstream string; we additionally accept some malformed escapes that `flatc` would reject. Acceptable for a formatter (we re-emit the source bytes verbatim). |
| 22 | `ident` | `IDENT` (lexer), `identifier` (parser) | extension | Upstream: `[a-zA-Z_][a-zA-Z0-9_]*`. Our `IDENT` matches the same regex. Additionally, `identifier` allows any reserved keyword (`table`, `enum`, `union`, `namespace`, `include`, `native_include`, `attribute`, `root_type`, `file_extension`, `file_identifier`, `rpc_service`) in identifier position. See [Deliberate extensions](#deliberate-extensions). |
| 23 | `dec_integer_constant` | `INT_LITERAL` (alt) | yes | `[0-9]+`. Upstream allows an optional leading sign here; we handle sign in the parser (`scalar`) instead. |
| 24 | `hex_integer_constant` | `INT_LITERAL` (alt) | yes | `0[xX][0-9a-fA-F]+`. |
| 25 | `integer_constant` | `INT_LITERAL` + parser sign in `scalar` | yes | Decimal or hex; sign lives in `scalar`. Same accepted language. |
| 26 | `dec_float_constant` | `FLOAT_LITERAL` | yes | `[0-9]+ '.' [0-9]* EXP?`, `'.' [0-9]+ EXP?`, or `[0-9]+ EXP`. Sign in `scalar`. |
| 27 | `hex_float_constant` | — | **gap** | Upstream allows hex float literals (`0x1.8p3`). We do not. Already flagged in [`grammar-comparison.md`](./grammar-comparison.md) as "rare enough we left it." |
| 28 | `special_float_constant` | `identifier` via `scalar` | yes | `inf`, `infinity`, `nan` are lexed as `IDENT` and accepted in scalar position. Sign handled by `scalar`'s `('+' \| '-')?` prefix. |
| 29 | `float_constant` | `FLOAT_LITERAL` + `identifier` in `scalar` | partial | Decimal floats and special floats covered; hex floats are the gap (row 27). |
| 30 | `boolean_constant` | `identifier` via `scalar` | yes | `true` / `false` lex as `IDENT` and are accepted in scalar position. We don't restrict to literally `true`/`false`; any identifier is valid here, which is the same looseness as type names (row 11). |

## Deliberate extensions

These are places where we intentionally accept more than the formal EBNF
describes, because `flatc` and real-world `.fbs` files in the wild do.

1. **`native_include "header.h";`** — `includeDecl` accepts both
   `INCLUDE` and `NATIVE_INCLUDE`. Not in the EBNF; emitted by `flatc`'s
   C++ codegen and used by every C++ FlatBuffers consumer.
2. **Keywords as identifiers** — `identifier : IDENT | keywordAsIdent`
   lets a user write `table T { enum: int; }`. `flatc` accepts this in
   most positions; the EBNF treats keywords as reserved.
3. **Union member with `name : Type`** — `unionValDecl: (identifier ':')? nsIdent`
   allows aliasing union variants. Supported by `flatc`, not in the
   EBNF.
4. **String / identifier scalars** — `scalar` accepts `STRING_LITERAL`
   and bare `identifier` in addition to numbers. Required for default
   values that name an enum constant or use a string default.
5. **Empty `table` / `struct` / `rpc_service` bodies** — upstream uses
   `field_decl+` and `rpc_method+`; we use `*`. `flatc` accepts empty
   tables (`table Foo {}`), so we do too.
6. **`include` directives not required to be a prefix** — upstream
   structures `schema` so includes come before all other decls; we let
   them appear interleaved. `flatc` is permissive here.
7. **Free-standing object literal at file scope** — both we and upstream
   allow this (it's how `flatc`'s text JSON-like format hangs off the
   schema grammar). Listed here for completeness; not actually an
   extension.
8. **Namespaced identifiers in type / root / rpc positions** —
   `nsIdent : identifier ('.' identifier)*` is used wherever upstream
   uses bare `ident`. Strictly broader, but matches every real `.fbs`
   that crosses namespaces.

## Known gaps

Places we reject input the EBNF accepts.

1. **Hex float constants** (`hex_float_constant`, row 27) — `0x1.8p3`
   and similar do not parse. Already flagged in
   [`grammar-comparison.md`](./grammar-comparison.md). No fixture in
   the corpus exercises this; closing the gap is a lexer-only change.
2. **Per-enum-value metadata** (row 12) — `enumval_decl` upstream
   allows `[ metadata ]` on each value; we don't. Easy fix
   (`enumValDecl : identifier ('=' scalar)? metadata?`). Not in the
   16-file corpus, so it hasn't surfaced.

No other gaps were found in the row-by-row audit.

## Verification protocol

To re-audit:

1. Fetch the current upstream EBNF from <https://flatbuffers.dev/grammar/>.
   Enumerate every left-hand-side production.
2. Read `grammar/FlatBuffers.g4` end to end. For each upstream
   production, find the corresponding parser/lexer rule and decide
   whether it's yes / partial / extension / gap.
3. Run the cross-formatter check:
   ```
   bash test/crosscheck.sh
   ```
   This re-runs the formatter on the 16-file corpus and diffs against
   the hand-rolled sibling.
4. Run the `flatc` conformance check:
   ```
   bash scripts/flatc-conform.sh
   ```
   This validates every formatted fixture parses with the official
   `flatc` compiler.
5. Run unit tests:
   ```
   npm test
   ```

If any row in the table changes status, update this file and bump the
audit date in the header.

## Cross-links

- Grammar: [`grammar/FlatBuffers.g4`](../grammar/FlatBuffers.g4)
- Sibling comparison doc: [`docs/grammar-comparison.md`](./grammar-comparison.md)
- Cross-formatter diff script: [`test/crosscheck.sh`](../test/crosscheck.sh)
- `flatc` conformance script: [`scripts/flatc-conform.sh`](../scripts/flatc-conform.sh)
