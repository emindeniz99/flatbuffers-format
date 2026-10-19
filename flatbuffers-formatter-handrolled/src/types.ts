// AST + token types for FlatBuffers schema (.fbs).
//
// The schema language is documented at
// https://flatbuffers.dev/flatbuffers_grammar.html — this file mirrors
// that grammar closely. Where the upstream grammar is ambiguous we pick
// the variant that matches the official `flatc` parser.

export type TokenKind =
  | "ident"
  | "int"
  | "float"
  | "string"
  | "lparen"
  | "rparen"
  | "lbrace"
  | "rbrace"
  | "lbracket"
  | "rbracket"
  | "colon"
  | "semi"
  | "comma"
  | "equals"
  | "dot"
  | "plus"
  | "minus"
  | "eof";

export type Trivia =
  | { kind: "line_comment"; value: string }
  | { kind: "block_comment"; value: string }
  | { kind: "doc_comment"; value: string }
  | { kind: "blank_line" };

export type Token = {
  kind: TokenKind;
  value: string;
  line: number;
  col: number;
  // Source offsets of the token's first character and one past its last.
  start: number;
  end: number;
  leading: Trivia[];
  // Every comment that appears after this token on the same line. We
  // keep them on the producing token so the printer can place them back
  // on the same line as whatever AST node owns it.
  trailing: Trivia[];
};

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

export type Schema = {
  kind: "schema";
  items: TopLevel[];
  // Trivia that appears after the last declaration but before EOF.
  // Lets comments-only files round-trip, and preserves comments that
  // trail the final declaration.
  tail: Trivia[];
};

// A top-level declaration with its source text, from its first token to
// its last, which the printer writes as is after an ignore comment.
export type TopLevel = TopLevelDecl & { raw?: string };

type TopLevelDecl =
  | IncludeDecl
  | NamespaceDecl
  | AttributeDecl
  | RootTypeDecl
  | FileExtensionDecl
  | FileIdentifierDecl
  | TableDecl
  | StructDecl
  | EnumDecl
  | UnionDecl
  | RpcServiceDecl
  | ObjectLiteralDecl;

export type WithTrivia = {
  leading: Trivia[];
  // Comments between the node's first and last token. The printer
  // rebuilds that text from the AST, so it hoists them onto their own
  // lines above the node.
  interior?: Trivia[];
  // Comments after the node on its line — for a list item, including
  // any before and on the line of the comma that follows it.
  trailing?: Trivia[];
};

// A `{ … }` body of items.
export type WithBody = {
  // Comments on the `{` line.
  openTrailing: Trivia[];
  // Trivia between the last item (or the `{` line) and the `}`.
  closeLeading: Trivia[];
  // The source has a line break between the `{` and what follows it.
  openBreak: boolean;
};

export type IncludeDecl = WithTrivia & {
  kind: "include";
  path: string; // string literal, quotes included
  // `native_include` (FlatBuffers extension for native types) vs
  // plain `include` for schema files.
  native?: boolean;
};

export type NamespaceDecl = WithTrivia & {
  kind: "namespace";
  segments: string[];
};

export type AttributeDecl = WithTrivia & {
  kind: "attribute";
  // `attribute "foo";` or `attribute foo;` — flatc accepts both.
  value: string;
  quoted: boolean;
};

export type RootTypeDecl = WithTrivia & {
  kind: "root_type";
  name: string;
};

export type FileExtensionDecl = WithTrivia & {
  kind: "file_extension";
  value: string;
};

export type FileIdentifierDecl = WithTrivia & {
  kind: "file_identifier";
  value: string;
};

export type Metadata = {
  entries: MetadataEntry[];
};

export type MetadataEntry = WithTrivia & {
  key: string;
  // single_value: scalar | string_constant
  value?: ScalarValue;
};

export type TableDecl = WithTrivia & WithBody & {
  kind: "table";
  name: string;
  metadata?: Metadata;
  fields: FieldDecl[];
};

export type StructDecl = WithTrivia & WithBody & {
  kind: "struct";
  name: string;
  metadata?: Metadata;
  fields: FieldDecl[];
};

export type FieldDecl = WithTrivia & {
  name: string;
  type: TypeRef;
  defaultValue?: ScalarValue;
  // `= []`, the one default a vector field can have.
  emptyVectorDefault?: boolean;
  metadata?: Metadata;
};

export type TypeRef =
  | { kind: "named"; name: string } // includes built-ins like `int`, `string`; supports `a.b.Foo`
  | { kind: "vector"; element: TypeRef; size?: string }; // size = fixed-length array `[T:N]`

export type EnumDecl = WithTrivia & WithBody & {
  kind: "enum";
  name: string;
  baseType?: string;
  metadata?: Metadata;
  values: EnumValueDecl[];
};

export type EnumValueDecl = WithTrivia & {
  name: string;
  value?: ScalarValue;
  metadata?: Metadata;
};

export type UnionDecl = WithTrivia & WithBody & {
  kind: "union";
  name: string;
  // Optional underlying integer type, mirrors EnumDecl.baseType. Added in
  // a post-2.0.8 flatc release. Spelled `union X : uint8 { ... }`.
  baseType?: string;
  metadata?: Metadata;
  values: UnionValueDecl[];
};

export type UnionValueDecl = WithTrivia & {
  // `MyType` or `alias:MyType`
  alias?: string;
  type: string;
  // Explicit discriminant, `A = 5`.
  value?: ScalarValue;
  metadata?: Metadata;
};

export type RpcServiceDecl = WithTrivia & WithBody & {
  kind: "rpc_service";
  name: string;
  methods: RpcMethodDecl[];
};

export type RpcMethodDecl = WithTrivia & {
  name: string;
  request: string;
  response: string;
  metadata?: Metadata;
};

export type ObjectLiteralDecl = WithTrivia & ObjectLiteral;

// Object and array literals keep comments like a declaration body: on
// the opening bracket's line, per field or element, and before the
// closing bracket.
export type ObjectLiteral = WithBody & {
  kind: "object";
  fields: ObjectField[];
};

export type ArrayLiteral = WithBody & {
  kind: "array";
  values: ArrayElement[];
};

export type ObjectField = WithTrivia & {
  key: string; // a string key keeps its quotes
  value: ObjectValue;
};

export type ArrayElement = WithTrivia & {
  value: ObjectValue;
};

export type ObjectValue = ScalarValue | ObjectLiteral | ArrayLiteral;

export type ScalarValue =
  | { kind: "int"; raw: string }
  | { kind: "float"; raw: string }
  | { kind: "string"; raw: string } // raw, including surrounding quotes
  | { kind: "ident"; raw: string }; // `true`, `false`, enum value, etc.
