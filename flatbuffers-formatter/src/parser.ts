// Hand-written recursive-descent parser for FlatBuffers schema files.
//
// We stay deliberately permissive: the goal is to format the input, not
// to fully validate it. Things like duplicate field names, illegal
// default values for non-scalar fields, or unknown attributes are
// surfaced by `flatc` and not our job.

import type {
  EnumDecl,
  EnumValueDecl,
  FieldDecl,
  Metadata,
  MetadataEntry,
  ObjectField,
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
} from "./types.js";
import { tokenize } from "./lexer.js";

export class ParseError extends Error {
  constructor(message: string, public token: Token) {
    super(`${message} at line ${token.line}, col ${token.col}`);
  }
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): Schema {
    const items: TopLevel[] = [];
    while (!this.atEnd()) {
      items.push(this.parseTopLevel());
    }
    return { kind: "schema", items };
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
    const kw = this.advance();
    const str = this.expect("string");
    this.expect("semi");
    return {
      kind: "include",
      path: str.value,
      leading: kw.leading,
      trailing: lastTrailing(kw, str, this.lastSemi()),
    };
  }

  private lastSemi(): Token {
    // We just consumed a semi; rewind one to peek at it without
    // moving the position forward.
    return this.tokens[this.pos - 1]!;
  }

  private parseNamespace(): TopLevel {
    const kw = this.advance();
    const segments: string[] = [];
    segments.push(this.expect("ident").value);
    while (this.match("dot")) {
      segments.push(this.expect("ident").value);
    }
    this.expect("semi");
    return {
      kind: "namespace",
      segments,
      leading: kw.leading,
      trailing: this.lastSemi().trailing,
    };
  }

  private parseAttribute(): TopLevel {
    const kw = this.advance();
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
      leading: kw.leading,
      trailing: this.lastSemi().trailing,
    };
  }

  private parseRootType(): TopLevel {
    const kw = this.advance();
    const name = this.expect("ident").value;
    this.expect("semi");
    return {
      kind: "root_type",
      name,
      leading: kw.leading,
      trailing: this.lastSemi().trailing,
    };
  }

  private parseFileExtension(): TopLevel {
    const kw = this.advance();
    const value = this.expect("string").value;
    this.expect("semi");
    return {
      kind: "file_extension",
      value,
      leading: kw.leading,
      trailing: this.lastSemi().trailing,
    };
  }

  private parseFileIdentifier(): TopLevel {
    const kw = this.advance();
    const value = this.expect("string").value;
    this.expect("semi");
    return {
      kind: "file_identifier",
      value,
      leading: kw.leading,
      trailing: this.lastSemi().trailing,
    };
  }

  // -----------------------------------------------------------------
  // table / struct
  // -----------------------------------------------------------------

  private parseTable(): TableDecl {
    const kw = this.advance();
    const name = this.expect("ident").value;
    const metadata = this.tryParseMetadata();
    this.expect("lbrace");
    const fields: FieldDecl[] = [];
    while (!this.check("rbrace") && !this.atEnd()) {
      fields.push(this.parseField());
    }
    const close = this.expect("rbrace");
    return {
      kind: "table",
      name,
      metadata,
      fields,
      leading: kw.leading,
      trailing: close.trailing,
    };
  }

  private parseStruct(): StructDecl {
    const kw = this.advance();
    const name = this.expect("ident").value;
    const metadata = this.tryParseMetadata();
    this.expect("lbrace");
    const fields: FieldDecl[] = [];
    while (!this.check("rbrace") && !this.atEnd()) {
      fields.push(this.parseField());
    }
    const close = this.expect("rbrace");
    return {
      kind: "struct",
      name,
      metadata,
      fields,
      leading: kw.leading,
      trailing: close.trailing,
    };
  }

  private parseField(): FieldDecl {
    const nameTok = this.expect("ident");
    this.expect("colon");
    const type = this.parseType();
    let defaultValue: ScalarValue | undefined;
    if (this.match("equals")) {
      defaultValue = this.parseScalar();
    }
    const metadata = this.tryParseMetadata();
    this.expect("semi");
    return {
      name: nameTok.value,
      type,
      defaultValue,
      metadata,
      leading: nameTok.leading,
      trailing: this.lastSemi().trailing,
    };
  }

  private parseType(): TypeRef {
    if (this.match("lbracket")) {
      const element = this.parseType();
      this.expect("rbracket");
      return { kind: "vector", element };
    }
    const t = this.expect("ident");
    return { kind: "named", name: t.value };
  }

  // -----------------------------------------------------------------
  // enum / union
  // -----------------------------------------------------------------

  private parseEnum(): EnumDecl {
    const kw = this.advance();
    const name = this.expect("ident").value;
    let baseType: string | undefined;
    if (this.match("colon")) {
      baseType = this.expect("ident").value;
    }
    const metadata = this.tryParseMetadata();
    this.expect("lbrace");
    const values: EnumValueDecl[] = [];
    if (!this.check("rbrace")) {
      values.push(this.parseEnumValue());
      while (this.match("comma")) {
        if (this.check("rbrace")) break; // trailing comma allowed
        values.push(this.parseEnumValue());
      }
    }
    const close = this.expect("rbrace");
    return {
      kind: "enum",
      name,
      baseType,
      metadata,
      values,
      leading: kw.leading,
      trailing: close.trailing,
    };
  }

  private parseEnumValue(): EnumValueDecl {
    const nameTok = this.expect("ident");
    let value: ScalarValue | undefined;
    if (this.match("equals")) {
      value = this.parseScalar();
    }
    return {
      name: nameTok.value,
      value,
      leading: nameTok.leading,
      // Trailing on the value or the name (no semi here).
      trailing: undefined,
    };
  }

  private parseUnion(): UnionDecl {
    const kw = this.advance();
    const name = this.expect("ident").value;
    const metadata = this.tryParseMetadata();
    this.expect("lbrace");
    const values: UnionValueDecl[] = [];
    if (!this.check("rbrace")) {
      values.push(this.parseUnionValue());
      while (this.match("comma")) {
        if (this.check("rbrace")) break;
        values.push(this.parseUnionValue());
      }
    }
    const close = this.expect("rbrace");
    return {
      kind: "union",
      name,
      metadata,
      values,
      leading: kw.leading,
      trailing: close.trailing,
    };
  }

  private parseUnionValue(): UnionValueDecl {
    const first = this.expect("ident");
    let alias: string | undefined;
    let type: string;
    if (this.match("colon")) {
      alias = first.value;
      type = this.expect("ident").value;
    } else {
      type = first.value;
    }
    return {
      alias,
      type,
      leading: first.leading,
    };
  }

  // -----------------------------------------------------------------
  // rpc_service
  // -----------------------------------------------------------------

  private parseRpcService(): RpcServiceDecl {
    const kw = this.advance();
    const name = this.expect("ident").value;
    this.expect("lbrace");
    const methods: RpcMethodDecl[] = [];
    while (!this.check("rbrace") && !this.atEnd()) {
      methods.push(this.parseRpcMethod());
    }
    const close = this.expect("rbrace");
    return {
      kind: "rpc_service",
      name,
      methods,
      leading: kw.leading,
      trailing: close.trailing,
    };
  }

  private parseRpcMethod(): RpcMethodDecl {
    const nameTok = this.expect("ident");
    this.expect("lparen");
    const request = this.expect("ident").value;
    this.expect("rparen");
    this.expect("colon");
    const response = this.expect("ident").value;
    const metadata = this.tryParseMetadata();
    this.expect("semi");
    return {
      name: nameTok.value,
      request,
      response,
      metadata,
      leading: nameTok.leading,
      trailing: this.lastSemi().trailing,
    };
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
      return { kind: "string", raw: `"${t.value}"` };
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
      return { kind: "string", raw: `"${t.value}"` };
    }
    if (t.kind === "ident") {
      if (sign) throw new ParseError("identifier with sign prefix", t);
      this.advance();
      return { kind: "ident", raw: t.value };
    }
    throw new ParseError("expected scalar value", t);
  }

  private parseObjectLiteralDecl(): ObjectLiteralDecl {
    const lb = this.peek();
    const obj = this.parseObject();
    return {
      kind: "object",
      fields: obj.fields,
      leading: lb.leading,
    };
  }

  private parseObject(): { fields: ObjectField[] } {
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
    return { fields };
  }

  private parseObjectField(): ObjectField {
    const keyTok = this.peek();
    let key: string;
    if (keyTok.kind === "ident" || keyTok.kind === "string") {
      this.advance();
      key = keyTok.value;
    } else {
      throw new ParseError("expected object key", keyTok);
    }
    this.expect("colon");
    const value = this.parseObjectValue();
    return { key, value, leading: keyTok.leading };
  }

  private parseObjectValue(): ObjectValue {
    if (this.check("lbrace")) {
      const o = this.parseObject();
      return { kind: "object", fields: o.fields };
    }
    if (this.match("lbracket")) {
      const values: ObjectValue[] = [];
      if (!this.check("rbracket")) {
        values.push(this.parseObjectValue());
        while (this.match("comma")) {
          if (this.check("rbracket")) break;
          values.push(this.parseObjectValue());
        }
      }
      this.expect("rbracket");
      return { kind: "array", values };
    }
    return this.parseSingleValue();
  }
}

function lastTrailing(...tokens: (Token | undefined)[]): Trivia | undefined {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t?.trailing) return t.trailing;
  }
  return undefined;
}

export function parse(source: string): Schema {
  const tokens = tokenize(source);
  return new Parser(tokens).parse();
}
