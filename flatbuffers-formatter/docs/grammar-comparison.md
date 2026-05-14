# Grammar comparison: ours vs. `antlr/grammars-v4`

Upstream: <https://github.com/antlr/grammars-v4/blob/master/flatbuffers/FlatBuffers.g4>

The upstream grammar (~380 LOC) is a full lexer/parser pair maintained
by the ANTLR project. Ours (~80 LOC) targets the same language but
makes different trade-offs because the goal is **formatting**, not
codegen or validation.

## TL;DR

| | Ours (`grammar/FlatBuffers.g4`) | Upstream (`grammars-v4/flatbuffers`) |
|---|---|---|
| Lines | ~80 | ~380 |
| Rule naming | `camelCase` (`namespaceDecl`) | `snake_case` (`namespace_decl`) |
| Tokens | inline string literals (`'table'`) | named lexer rules (`TABLE: 'table';`) |
| Built-in types (`int`, `string`, …) | lexed as `IDENT`, contextual | dedicated `BASE_TYPE_NAME` token |
| `true` / `false` | parsed as `IDENT` scalar | folded into `INTEGER_CONSTANT` |
| Sign on numbers | parser rule: `('+' \| '-')? INT` | baked into lexer token |
| Hex integers | alt inside `INT_LITERAL` | separate `HEX_INTEGER_CONSTANT` token |
| `inf` / `nan` floats | ✗ | ✓ |
| String escapes | permissive `'\\' .` | full `\x`, `\u`, simple escape set |
| `native_include` | ✗ | ✓ |
| Namespaced refs (`A.B.Foo`) | ✗ — bare `IDENT` only | ✓ via `ns_ident` |
| Fixed-size vector `[T:N]` | ✗ | ✓ |
| Union variant with `= N` | ✗ | ✓ |
| Keywords usable as identifiers | ✗ | ✓ (`identifier: IDENT \| keywords`) |
| Doc comments (`///`) | dedicated `DOC_COMMENT` token | none — folded into `COMMENT` |
| Whitespace | `-> channel(HIDDEN)` (preserved) | `-> skip` (discarded) |

## What's the same

Both grammars cover the same core constructs in the same shape:

- `schema` → mix of top-level declarations + EOF
- `table`, `struct`, `enum`, `union`, `rpc_service`
- `field_decl : IDENT ':' type ('=' scalar)? metadata? ';'`
- `metadata: ( commasep ident (: single_value)? )?`
- Scalars: int, float, string, identifier
- Object literals (`flatc`'s text format)
- Trailing commas allowed in enum/union value lists

If you fed each grammar the *same minimal subset* of `.fbs` (the
"basic" sample in this repo), they'd accept the same inputs.

## What's different — and what it costs us

### 1. We use inline literals for tokens

Upstream:
```antlr
TABLE : 'table' ;
SEMI  : ';' ;
field_decl : identifier COLON type_ (EQ scalar)? metadata SEMI ;
```

Ours:
```antlr
fieldDecl : IDENT ':' typeRef ('=' scalar)? metadata? ';' ;
```

ANTLR auto-generates `T__0`, `T__1`, … tokens for our inline literals.
This is fine for parsing but:

- The `.tokens` file is unreadable (just numbers).
- The token type constants in the generated parser look like
  `FlatBuffersParser.T__7` instead of `FlatBuffersParser.SEMI`.
- You can't easily reuse the lexer from another grammar.

Cost for our formatter: zero — we never reference token numbers by
name. But if anyone wanted to embed the parser elsewhere, named
tokens are the polished choice.

### 2. We don't have a `BASE_TYPE_NAME` token

Upstream lexes `bool`, `byte`, `int`, `string`, `int32`, … as a single
`BASE_TYPE_NAME` token, used in `type_`.

We treat them as `IDENT` and let the parser accept any `IDENT` in
type position. Less strict — `table T { x: NotAType; }` parses fine
in ours; upstream's parser would also accept it (since `ns_ident`
covers it), so this is mostly cosmetic.

### 3. We don't support namespaced type references

Upstream:
```antlr
type_ : LB type_ (COLON integer_const)? RB | BASE_TYPE_NAME | ns_ident ;
ns_ident : identifier (DOT identifier)* ;
```

Ours:
```antlr
typeRef
    : '[' typeRef ']'    # vectorType
    | IDENT              # namedType
    ;
```

A real `.fbs` can do `field: my.namespace.Foo;` to reference a type
across namespaces. **We don't parse that.** This is the biggest
functional gap. If a user feeds us a schema with cross-namespace
type references, we error out where upstream would handle it.

### 4. No fixed-size array syntax

Upstream supports `[float:3]` for fixed-length arrays in `struct`
fields (a real FlatBuffers feature). Ours doesn't.

### 5. We keep whitespace; upstream throws it away

```antlr
// Ours
WS : [ \t\r\n]+ -> channel(HIDDEN) ;

// Upstream
WS : [ \t\r\n] -> skip ;
```

For a *parser*, skipping is correct — whitespace carries no syntactic
meaning. For a *formatter*, we need WS in the token stream to detect
blank lines (paragraph breaks). Upstream's grammar would lose them.

### 6. We distinguish `///` from `//`

```antlr
// Ours
DOC_COMMENT   : '///' ~[\r\n]* -> channel(HIDDEN) ;
LINE_COMMENT  : '//'  ~[\r\n]* -> channel(HIDDEN) ;

// Upstream
COMMENT : '//' ~[\r\n]* -> channel(HIDDEN) ;
```

Order matters: `DOC_COMMENT` is declared first so it wins the
longest-match tie. Upstream folds `///` into `//`, which is fine
for parsing but wrong for a formatter that wants to preserve doc
comments as a distinct construct.

### 7. Sign handling lives in different places

Upstream's `INTEGER_CONSTANT` includes the sign:
```antlr
INTEGER_CONSTANT : [-+]? DECIMAL_DIGIT+ | 'true' | 'false' ;
```

Ours pushes it into the parser:
```antlr
scalar : ('+' | '-')? INT_LITERAL # intScalar | … ;
```

Lexing the sign baked-in is unusual — it creates ambiguity with the
hypothetical `MINUS` operator if you ever extend the grammar. Our
choice is the more conservative one. Folding `true`/`false` into
`INTEGER_CONSTANT` is also a bit of a quirk; we keep them as plain
identifiers and treat them as scalar values at the parser level.

### 8. Upstream has a `keywords` escape hatch

```antlr
identifier : IDENT | keywords ;
keywords   : ATTRIBUTE | ENUM | FILE_EXTENSION | … ;
```

This lets users name a field `table` or `enum` (which `flatc`
actually allows in some positions). We disallow it.

## When upstream is the right choice

- You want a strict, reusable parser across multiple languages
  (ANTLR can target C++, Java, Go, Python, Swift, …).
- You need full lexical fidelity for `flatc`-equivalent validation.
- You care about the long tail: `native_include`, `inf`/`nan`,
  fixed-size arrays, cross-namespace type references.
- You're not building a formatter, so `-> skip` for whitespace is fine.

## When ours is the right choice

- You're formatting, not validating — you need trivia, blank lines,
  and the `///` vs. `//` distinction.
- You want the grammar to fit on one screen.

## Gap closure

The five gaps originally listed here against upstream have been
addressed (verified with `test/crosscheck.sh` on a 16-file corpus):

| Construct | Status |
|---|---|
| `field: a.b.Foo;` — namespaced type | **Fixed** via `nsIdent : identifier ('.' identifier)*`. |
| `field: [float:3];` — fixed-size array | **Fixed** with optional `':' INT_LITERAL` in `vectorType`. |
| `native_include "x.h";` | **Fixed**: `includeDecl : (INCLUDE \| NATIVE_INCLUDE) STRING_LITERAL ';'`. |
| `table T { enum: int; }` — keyword as name | **Fixed**: keywords promoted to named tokens + `identifier : IDENT \| keywordAsIdent`. |
| `inf` / `nan` floats | **Already worked**: lexed as `IDENT`, accepted as identifier scalar. |
| `field: 0x1.8p3;` — hex float | Still rejected. Rare enough we left it. |

Both formatters were updated together — the [hand-rolled
sibling](../../flatbuffers-formatter) closed the same gaps in its
parser. They still produce byte-identical output on every fixture.
