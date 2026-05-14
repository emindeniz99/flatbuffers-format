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
  leading: Trivia[];
  // A `// ...` or `/* ... */` comment that appears after this token
  // on the same line. We keep it on the producing token so the printer
  // can place it back on the same line as whatever AST node owns it.
  trailing?: Trivia;
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

export type TopLevel =
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
  trailing?: Trivia;
};

export type IncludeDecl = WithTrivia & {
  kind: "include";
  path: string; // string literal, without surrounding quotes
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

export type TableDecl = WithTrivia & {
  kind: "table";
  name: string;
  metadata?: Metadata;
  fields: FieldDecl[];
};

export type StructDecl = WithTrivia & {
  kind: "struct";
  name: string;
  metadata?: Metadata;
  fields: FieldDecl[];
};

export type FieldDecl = WithTrivia & {
  name: string;
  type: TypeRef;
  defaultValue?: ScalarValue;
  metadata?: Metadata;
};

export type TypeRef =
  | { kind: "named"; name: string } // includes built-ins like `int`, `string`; supports `a.b.Foo`
  | { kind: "vector"; element: TypeRef; size?: string }; // size = fixed-length array `[T:N]`

export type EnumDecl = WithTrivia & {
  kind: "enum";
  name: string;
  baseType?: string;
  metadata?: Metadata;
  values: EnumValueDecl[];
};

export type EnumValueDecl = WithTrivia & {
  name: string;
  value?: ScalarValue;
};

export type UnionDecl = WithTrivia & {
  kind: "union";
  name: string;
  metadata?: Metadata;
  values: UnionValueDecl[];
};

export type UnionValueDecl = WithTrivia & {
  // `MyType` or `alias:MyType`
  alias?: string;
  type: string;
};

export type RpcServiceDecl = WithTrivia & {
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

export type ObjectLiteralDecl = WithTrivia & {
  kind: "object";
  fields: ObjectField[];
};

export type ObjectField = WithTrivia & {
  key: string;
  value: ObjectValue;
};

export type ObjectValue =
  | ScalarValue
  | { kind: "object"; fields: ObjectField[] }
  | { kind: "array"; values: ObjectValue[] };

export type ScalarValue =
  | { kind: "int"; raw: string }
  | { kind: "float"; raw: string }
  | { kind: "string"; raw: string } // raw, including surrounding quotes
  | { kind: "ident"; raw: string }; // `true`, `false`, enum value, etc.
