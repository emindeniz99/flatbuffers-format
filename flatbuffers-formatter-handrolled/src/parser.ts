// Hand-written recursive-descent parser for FlatBuffers schema files.
//
// We stay deliberately permissive: the goal is to format the input, not
// to fully validate it. Things like duplicate field names, illegal
// default values for non-scalar fields, or unknown attributes are
// surfaced by `flatc` and not our job.

import type {
  ArrayElement,
  EnumDecl,
  EnumValueDecl,
  FieldDecl,
  Metadata,
  MetadataEntry,
  ObjectField,
  ObjectLiteral,
  ObjectLiteralDecl,
  ObjectValue,
  RpcMethodDecl,
  RpcServiceDecl,
  ScalarValue,
  Schema,
  StructDecl,
  TableDecl,
  Token,
  TokenKind,
  TopLevel,
  Trivia,
  TypeRef,
  UnionDecl,
  UnionValueDecl,
  WithBody,
  WithTrivia,
} from "./types.js";
import { tokenize } from "./lexer.js";

export class ParseError extends Error {
  constructor(message: string, public token: Token) {
    super(`${message} at line ${token.line}, col ${token.col}`);
  }
}

class Parser {
  private pos = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly source: string,
  ) {}

  parse(): Schema {
    const items: TopLevel[] = [];
    while (!this.atEnd()) {
      const start = this.pos;
      const item: TopLevel = this.parseTopLevel();
      item.raw = this.source.slice(this.tokens[start]!.start, this.tokens[this.pos - 1]!.end);
      items.push(item);
    }
    // The EOF token carries any trailing trivia (file-tail comments,
    // blank lines). Hand it to the schema so the printer can emit it.
    const eof = this.peek();
    return { kind: "schema", items, tail: eof.leading };
  }

  // -----------------------------------------------------------------
  // Token helpers
  // -----------------------------------------------------------------

  private peek(off = 0): Token {
    return this.tokens[this.pos + off]!;
  }

  private atEnd(): boolean {
    return this.peek().kind === "eof";
  }

  private advance(): Token {
    const t = this.tokens[this.pos]!;
    if (t.kind !== "eof") this.pos++;
    return t;
  }

  private check(kind: TokenKind, value?: string): boolean {
    const t = this.peek();
    if (t.kind !== kind) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  private match(kind: TokenKind, value?: string): Token | null {
    if (this.check(kind, value)) return this.advance();
    return null;
  }

  private expect(kind: TokenKind, value?: string): Token {
    if (this.check(kind, value)) return this.advance();
    const t = this.peek();
    const want = value ?? kind;
    throw new ParseError(`expected '${want}' but got '${t.value || t.kind}'`, t);
  }

  // -----------------------------------------------------------------
  // Top level
  // -----------------------------------------------------------------

  private parseTopLevel(): TopLevel {
    const t = this.peek();
    if (t.kind === "ident") {
      switch (t.value) {
        case "include":
        case "native_include":
          return this.parseInclude();
        case "namespace":
          return this.parseNamespace();
        case "attribute":
          return this.parseAttribute();
        case "root_type":
          return this.parseRootType();
        case "file_extension":
          return this.parseFileExtension();
        case "file_identifier":
          return this.parseFileIdentifier();
        case "table":
          return this.parseTable();
        case "struct":
          return this.parseStruct();
        case "enum":
          return this.parseEnum();
        case "union":
          return this.parseUnion();
        case "rpc_service":
          return this.parseRpcService();
      }
    }
    if (t.kind === "lbrace") {
      return this.parseObjectLiteralDecl();
    }
    throw new ParseError(`unexpected token '${t.value || t.kind}'`, t);
  }

  private parseInclude(): TopLevel {
    const start = this.pos;
    const kw = this.advance();
    const str = this.expect("string");
    this.expect("semi");
    return {
      kind: "include",
      path: str.value,
      native: kw.value === "native_include",
      ...this.declTrivia(start),
    };
  }

  // Every comment strictly between the tokens at positions `from` and
  // `to`, in source order, wherever the line breaks fall.
  private commentsBetween(from: number, to: number): Trivia[] {
    const out: Trivia[] = [];
    for (let k = from; k < to; k++) {
      out.push(...this.tokens[k]!.trailing);
      for (const t of this.tokens[k + 1]!.leading) {
        if (t.kind !== "blank_line") out.push(t);
      }
    }
    return out;
  }

  // Trivia of a single-line declaration spanning `start` (its keyword)
  // to the token just consumed (its `;`).
  private declTrivia(start: number): Required<WithTrivia> {
    const stop = this.pos - 1;
    return {
      leading: this.tokens[start]!.leading,
      interior: this.commentsBetween(start, stop),
      trailing: this.tokens[stop]!.trailing,
    };
  }

  // Trivia of a declaration with a `{ … }` body: `start` is its
  // keyword, `open` its `{`, and the token just consumed its `}`.
  private bodyDeclTrivia(start: number, open: number): Required<WithTrivia> & WithBody {
    const close = this.pos - 1;
    return {
      leading: this.tokens[start]!.leading,
      interior: this.commentsBetween(start, open),
      trailing: this.tokens[close]!.trailing,
      openTrailing: this.tokens[open]!.trailing,
      closeLeading: this.tokens[close]!.leading,
      openBreak: this.tokens[open + 1]!.line > this.tokens[open]!.line,
    };
  }

  // Trivia of a body item spanning `start` to the token just consumed.
  // A list item's trailing comments run through the comma after it,
  // which the printer re-emits itself.
  private itemTrivia(start: number): Required<WithTrivia> {
    const stop = this.pos - 1;
    const anchor = this.tokens[stop + 1]!.kind === "comma" ? stop + 1 : stop;
    return {
      leading: this.tokens[start]!.leading,
      interior: this.commentsBetween(start, stop),
      trailing: [...this.commentsBetween(stop, anchor), ...this.tokens[anchor]!.trailing],
    };
  }

  private parseNamespace(): TopLevel {
    const start = this.pos;
    this.advance();
    const segments: string[] = [];
    segments.push(this.expect("ident").value);
    while (this.match("dot")) {
      segments.push(this.expect("ident").value);
    }
    this.expect("semi");
    return {
      kind: "namespace",
      segments,
      ...this.declTrivia(start),
    };
  }

  private parseAttribute(): TopLevel {
    const start = this.pos;
    this.advance();
    let value: string;
    let quoted: boolean;
    const t = this.peek();
    if (t.kind === "string") {
      value = this.advance().value;
      quoted = true;
    } else if (t.kind === "ident") {
      value = this.advance().value;
      quoted = false;
    } else {
      throw new ParseError("expected string or identifier", t);
    }
    this.expect("semi");
    return {
      kind: "attribute",
      value,
      quoted,
      ...this.declTrivia(start),
    };
  }

  private parseRootType(): TopLevel {
    const start = this.pos;
    this.advance();
    const name = this.expect("ident").value;
    this.expect("semi");
    return {
      kind: "root_type",
      name,
      ...this.declTrivia(start),
    };
  }

  private parseFileExtension(): TopLevel {
    const start = this.pos;
    this.advance();
    const value = this.expect("string").value;
    this.expect("semi");
    return {
      kind: "file_extension",
      value,
      ...this.declTrivia(start),
    };
  }

  private parseFileIdentifier(): TopLevel {
    const start = this.pos;
    this.advance();
    const value = this.expect("string").value;
    this.expect("semi");
    return {
      kind: "file_identifier",
      value,
      ...this.declTrivia(start),
    };
  }

  // -----------------------------------------------------------------
  // table / struct
  // -----------------------------------------------------------------

  private parseTable(): TableDecl {
    const start = this.pos;
    this.advance();
    const name = this.expect("ident").value;
    const metadata = this.tryParseMetadata();
    const open = this.pos;
    this.expect("lbrace");
    const fields: FieldDecl[] = [];
    while (!this.check("rbrace") && !this.atEnd()) {
      fields.push(this.parseField());
    }
    this.expect("rbrace");
    return {
      kind: "table",
      name,
      metadata,
      fields,
      ...this.bodyDeclTrivia(start, open),
    };
  }

  private parseStruct(): StructDecl {
    const start = this.pos;
    this.advance();
    const name = this.expect("ident").value;
    const metadata = this.tryParseMetadata();
    const open = this.pos;
    this.expect("lbrace");
    const fields: FieldDecl[] = [];
    while (!this.check("rbrace") && !this.atEnd()) {
      fields.push(this.parseField());
    }
    this.expect("rbrace");
    return {
      kind: "struct",
      name,
      metadata,
      fields,
      ...this.bodyDeclTrivia(start, open),
    };
  }

  private parseField(): FieldDecl {
    const start = this.pos;
    const nameTok = this.expect("ident");
    this.expect("colon");
    const type = this.parseType();
    let defaultValue: ScalarValue | undefined;
    let emptyVectorDefault: boolean | undefined;
    if (this.match("equals")) {
      if (this.match("lbracket")) {
        this.expect("rbracket");
        emptyVectorDefault = true;
      } else {
        defaultValue = this.parseScalar();
      }
    }
    const metadata = this.tryParseMetadata();
    this.expect("semi");
    return {
      name: nameTok.value,
      type,
      defaultValue,
      emptyVectorDefault,
      metadata,
      ...this.itemTrivia(start),
    };
  }

  private parseType(): TypeRef {
    if (this.match("lbracket")) {
      const element = this.parseType();
      // Fixed-size array: `[T:N]` (used in struct fields).
      let size: string | undefined;
      if (this.match("colon")) {
        size = this.expect("int").value;
      }
      this.expect("rbracket");
      return size === undefined
        ? { kind: "vector", element }
        : { kind: "vector", element, size };
    }
    // Namespaced ident: `a.b.Foo` (the official grammar uses
    // `ns_ident` in every type-bearing position).
    const parts = [this.expect("ident").value];
    while (this.match("dot")) parts.push(this.expect("ident").value);
    return { kind: "named", name: parts.join(".") };
  }

  // -----------------------------------------------------------------
  // enum / union
  // -----------------------------------------------------------------

  private parseEnum(): EnumDecl {
    const start = this.pos;
    this.advance();
    const name = this.expect("ident").value;
    let baseType: string | undefined;
    if (this.match("colon")) {
      baseType = this.expect("ident").value;
    }
    const metadata = this.tryParseMetadata();
    const open = this.pos;
    this.expect("lbrace");
    const values: EnumValueDecl[] = [];
    if (!this.check("rbrace")) {
      values.push(this.parseEnumValue());
      while (this.match("comma")) {
        if (this.check("rbrace")) break; // trailing comma allowed
        values.push(this.parseEnumValue());
      }
    }
    this.expect("rbrace");
    return {
      kind: "enum",
      name,
      baseType,
      metadata,
      values,
      ...this.bodyDeclTrivia(start, open),
    };
  }

  private parseEnumValue(): EnumValueDecl {
    const start = this.pos;
    const nameTok = this.expect("ident");
    let value: ScalarValue | undefined;
    if (this.match("equals")) {
      value = this.parseScalar();
    }
    const metadata = this.tryParseMetadata();
    return {
      name: nameTok.value,
      value,
      metadata,
      ...this.itemTrivia(start),
    };
  }

  private parseUnion(): UnionDecl {
    const start = this.pos;
    this.advance();
    const name = this.expect("ident").value;
    let baseType: string | undefined;
    if (this.match("colon")) baseType = this.expect("ident").value;
    const metadata = this.tryParseMetadata();
    const open = this.pos;
    this.expect("lbrace");
    const values: UnionValueDecl[] = [];
    if (!this.check("rbrace")) {
      values.push(this.parseUnionValue());
      while (this.match("comma")) {
        if (this.check("rbrace")) break;
        values.push(this.parseUnionValue());
      }
    }
    this.expect("rbrace");
    return {
      kind: "union",
      name,
      baseType,
      metadata,
      values,
      ...this.bodyDeclTrivia(start, open),
    };
  }

  private parseUnionValue(): UnionValueDecl {
    const start = this.pos;
    const first = this.expect("ident");
    // Could be `Type`, `a.b.Type`, or `Alias: a.b.Type`.
    const firstParts = [first.value];
    while (this.peek().kind === "dot" && this.peek(1).kind === "ident") {
      this.advance(); // dot
      firstParts.push(this.expect("ident").value);
    }
    let alias: string | undefined;
    let type: string;
    if (this.match("colon")) {
      alias = firstParts.join(".");
      const typeParts = [this.expect("ident").value];
      while (this.match("dot")) typeParts.push(this.expect("ident").value);
      type = typeParts.join(".");
    } else {
      type = firstParts.join(".");
    }
    const value = this.match("equals") ? this.parseScalar() : undefined;
    const metadata = this.tryParseMetadata();
    return {
      alias,
      type,
      value,
      metadata,
      ...this.itemTrivia(start),
    };
  }

  // -----------------------------------------------------------------
  // rpc_service
  // -----------------------------------------------------------------

  private parseRpcService(): RpcServiceDecl {
    const start = this.pos;
    this.advance();
    const name = this.expect("ident").value;
    const open = this.pos;
    this.expect("lbrace");
    const methods: RpcMethodDecl[] = [];
    while (!this.check("rbrace") && !this.atEnd()) {
      methods.push(this.parseRpcMethod());
    }
    this.expect("rbrace");
    return {
      kind: "rpc_service",
      name,
      methods,
      ...this.bodyDeclTrivia(start, open),
    };
  }

  private parseRpcMethod(): RpcMethodDecl {
    const start = this.pos;
    const nameTok = this.expect("ident");
    this.expect("lparen");
    const request = this.parseNsIdent();
    this.expect("rparen");
    this.expect("colon");
    const response = this.parseNsIdent();
    const metadata = this.tryParseMetadata();
    this.expect("semi");
    return {
      name: nameTok.value,
      request,
      response,
      metadata,
      ...this.itemTrivia(start),
    };
  }

  private parseNsIdent(): string {
    const parts = [this.expect("ident").value];
    while (this.match("dot")) parts.push(this.expect("ident").value);
    return parts.join(".");
  }

  // -----------------------------------------------------------------
  // metadata + scalar + object
  // -----------------------------------------------------------------

  private tryParseMetadata(): Metadata | undefined {
    if (!this.match("lparen")) return undefined;
    const entries: MetadataEntry[] = [];
    if (!this.check("rparen")) {
      entries.push(this.parseMetadataEntry());
      while (this.match("comma")) {
        if (this.check("rparen")) break;
        entries.push(this.parseMetadataEntry());
      }
    }
    this.expect("rparen");
    return { entries };
  }

  private parseMetadataEntry(): MetadataEntry {
    const key = this.expect("ident");
    let value: ScalarValue | undefined;
    if (this.match("colon")) {
      value = this.parseSingleValue();
    }
    return { key: key.value, value, leading: key.leading };
  }

  private parseSingleValue(): ScalarValue {
    // scalar | string_constant
    const t = this.peek();
    if (t.kind === "string") {
      this.advance();
      return { kind: "string", raw: t.value };
    }
    return this.parseScalar();
  }

  private parseScalar(): ScalarValue {
    let sign = "";
    if (this.check("minus") || this.check("plus")) {
      sign = this.advance().value;
    }
    const t = this.peek();
    if (t.kind === "int") {
      this.advance();
      return { kind: "int", raw: sign + t.value };
    }
    if (t.kind === "float") {
      this.advance();
      return { kind: "float", raw: sign + t.value };
    }
    if (t.kind === "string") {
      if (sign) throw new ParseError("string with sign prefix", t);
      this.advance();
      return { kind: "string", raw: t.value };
    }
    if (t.kind === "ident") {
      // A sign only makes sense on nan / inf, but flatc decides that.
      this.advance();
      return { kind: "ident", raw: sign + t.value };
    }
    throw new ParseError("expected scalar value", t);
  }

  private parseObjectLiteralDecl(): ObjectLiteralDecl {
    const start = this.pos;
    const obj = this.parseObject();
    return {
      ...obj,
      leading: this.tokens[start]!.leading,
      trailing: this.tokens[this.pos - 1]!.trailing,
    };
  }

  // Trivia of a `{ … }` or `[ … ]` literal: `open` is its opening
  // bracket and the token just consumed its closing one.
  private bracketTrivia(open: number): WithBody {
    return {
      openTrailing: this.tokens[open]!.trailing,
      closeLeading: this.tokens[this.pos - 1]!.leading,
      openBreak: this.tokens[open + 1]!.line > this.tokens[open]!.line,
    };
  }

  private parseObject(): ObjectLiteral {
    const open = this.pos;
    this.expect("lbrace");
    const fields: ObjectField[] = [];
    if (!this.check("rbrace")) {
      fields.push(this.parseObjectField());
      while (this.match("comma")) {
        if (this.check("rbrace")) break;
        fields.push(this.parseObjectField());
      }
    }
    this.expect("rbrace");
    return { kind: "object", fields, ...this.bracketTrivia(open) };
  }

  private parseObjectField(): ObjectField {
    const start = this.pos;
    const keyTok = this.peek();
    let key: string;
    if (keyTok.kind === "ident") {
      this.advance();
      key = keyTok.value;
    } else if (keyTok.kind === "string") {
      this.advance();
      key = keyTok.value;
    } else {
      throw new ParseError("expected object key", keyTok);
    }
    this.expect("colon");
    const valueStart = this.pos;
    const value = this.parseObjectValue();
    const trivia = this.itemTrivia(start);
    // Comments between the key and a nested literal's bracket are
    // hoisted; the literal keeps the ones inside it.
    if (!isScalar(value)) trivia.interior = this.commentsBetween(start, valueStart);
    return { key, value, ...trivia };
  }

  private parseArrayElement(): ArrayElement {
    const start = this.pos;
    const value = this.parseObjectValue();
    const trivia = this.itemTrivia(start);
    if (!isScalar(value)) trivia.interior = [];
    return { value, ...trivia };
  }

  private parseObjectValue(): ObjectValue {
    if (this.check("lbrace")) return this.parseObject();
    const open = this.pos;
    if (this.match("lbracket")) {
      const values: ArrayElement[] = [];
      if (!this.check("rbracket")) {
        values.push(this.parseArrayElement());
        while (this.match("comma")) {
          if (this.check("rbracket")) break;
          values.push(this.parseArrayElement());
        }
      }
      this.expect("rbracket");
      return { kind: "array", values, ...this.bracketTrivia(open) };
    }
    return this.parseSingleValue();
  }
}

function isScalar(v: ObjectValue): v is ScalarValue {
  return v.kind !== "object" && v.kind !== "array";
}

export function parse(source: string): Schema {
  const tokens = tokenize(source);
  return new Parser(tokens, source).parse();
}
