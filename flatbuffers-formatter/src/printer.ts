// Pretty-printer driven by the ANTLR-generated parse tree.
//
// The grammar uses an `identifier` rule that resolves to either a
// regular `IDENT` token or a keyword token (`TABLE`, `STRUCT`, …),
// so most user-named slots access the identifier via
// `ctx.identifier()?.getText()` rather than a bare `IDENT()` lookup.
// `nsIdent` is used in every type-bearing position.

import type { BufferedTokenStream } from "antlr4ng";
import {
  ArrayValueContext,
  AttributeDeclContext,
  type DeclContext,
  EnumDeclContext,
  type EnumValDeclContext,
  type FieldDeclContext,
  FileExtensionDeclContext,
  FileIdentifierDeclContext,
  FloatScalarContext,
  HexFloatScalarContext,
  type IdentifierContext,
  IdentScalarContext,
  IncludeDeclContext,
  IntScalarContext,
  type MetadataContext,
  NamedTypeContext,
  NamespaceDeclContext,
  NestedObjectValueContext,
  type NsIdentContext,
  type ObjectFieldContext,
  type ObjectLiteralContext,
  ObjectLiteralDeclContext,
  type ObjectValueContext,
  RootTypeDeclContext,
  type RpcMethodContext,
  RpcServiceDeclContext,
  type ScalarContext,
  ScalarValueContext,
  type SchemaContext,
  type SingleValueContext,
  StringScalarContext,
  StructDeclContext,
  TableDeclContext,
  type TypeRefContext,
  UnionDeclContext,
  type UnionValDeclContext,
  VectorTypeContext,
  FlatBuffersParser,
} from "../generated/FlatBuffersParser.js";
import { leadingTrivia, trailingComment, tailTrivia, type Trivia } from "./trivia.js";

export type FormatOptions = {
  indent?: number;
  newline?: "\n" | "\r\n";
};

type Resolved = Required<FormatOptions>;
const DEFAULTS: Resolved = { indent: 2, newline: "\n" };

const BLOCK_DECL_RULES = new Set([
  "tableDecl",
  "structDecl",
  "enumDecl",
  "unionDecl",
  "rpcServiceDecl",
  "objectLiteralDecl",
]);

export class Printer {
  private out: string[] = [];
  private readonly opts: Resolved;
  constructor(private readonly stream: BufferedTokenStream, opts: FormatOptions) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  print(schema: SchemaContext): string {
    const decls = schema.decl();
    let prev: DeclContext | undefined;
    for (const d of decls) {
      const item = d.getChild(0);
      if (!item || !(item instanceof Object) || !("constructor" in item)) continue;

      if (prev) {
        const prevName = prev.getChild(0)?.constructor.name ?? "";
        const itemName = item.constructor.name;
        const wasBlock = isBlockCtxName(prevName);
        const isBlock = isBlockCtxName(itemName);
        const had = hasBlankLine(leadingTrivia(item as any, this.stream));
        if (wasBlock || isBlock || had) this.nl();
      }
      this.printDeclItem(item as any);
      prev = d;
    }

    const tail = stripLeadingBlanks(tailTrivia(this.stream));
    if (tail.length) {
      if (decls.length > 0) this.nl();
      this.writeTrivia(tail, 0);
    }

    const text = this.out.join("");
    return text.endsWith(this.opts.newline) ? text : text + this.opts.newline;
  }

  // ---------------------------------------------------------------
  private nl() { this.out.push(this.opts.newline); }
  private indent(depth: number) { return " ".repeat(this.opts.indent * depth); }

  private writeTrivia(trivia: Trivia[], depth: number) {
    const pad = this.indent(depth);
    for (const t of trivia) {
      if (t.kind === "blank_line") { this.nl(); continue; }
      if (t.kind === "line_comment")  this.out.push(`${pad}//${t.value}`);
      if (t.kind === "doc_comment")   this.out.push(`${pad}///${t.value}`);
      if (t.kind === "block_comment") this.out.push(`${pad}/*${t.value}*/`);
      this.nl();
    }
  }

  private writeTrailing(ctx: any) {
    const t = trailingComment(ctx, this.stream);
    if (!t) return;
    if (t.kind === "line_comment")  this.out.push(` //${t.value}`);
    if (t.kind === "block_comment") this.out.push(` /*${t.value}*/`);
  }

  private writeLeading(ctx: any, depth: number, stripBlank = false) {
    let trivia = leadingTrivia(ctx, this.stream);
    if (stripBlank) trivia = stripLeadingBlanks(trivia);
    this.writeTrivia(trivia, depth);
  }

  // ---------------------------------------------------------------
  private printDeclItem(item: any) {
    this.writeLeading(item, 0, true);
    if (item instanceof IncludeDeclContext) return this.printInclude(item);
    if (item instanceof NamespaceDeclContext) return this.printNamespace(item);
    if (item instanceof AttributeDeclContext) return this.printAttribute(item);
    if (item instanceof RootTypeDeclContext) return this.printRootType(item);
    if (item instanceof FileExtensionDeclContext) return this.printFileExt(item);
    if (item instanceof FileIdentifierDeclContext) return this.printFileId(item);
    if (item instanceof TableDeclContext) return this.printTable(item);
    if (item instanceof StructDeclContext) return this.printStruct(item);
    if (item instanceof EnumDeclContext) return this.printEnum(item);
    if (item instanceof UnionDeclContext) return this.printUnion(item);
    if (item instanceof RpcServiceDeclContext) return this.printRpc(item);
    if (item instanceof ObjectLiteralDeclContext) return this.printObjectDecl(item);
  }

  private printInclude(ctx: IncludeDeclContext) {
    const kw = ctx.NATIVE_INCLUDE() ? "native_include" : "include";
    this.out.push(`${kw} ${ctx.STRING_LITERAL().getText()};`);
    this.writeTrailing(ctx); this.nl();
  }

  private printNamespace(ctx: NamespaceDeclContext) {
    const parts = ctx.identifier().map((id) => id.getText());
    this.out.push(`namespace ${parts.join(".")};`);
    this.writeTrailing(ctx); this.nl();
  }

  private printAttribute(ctx: AttributeDeclContext) {
    const lit = ctx.STRING_LITERAL();
    const id = ctx.identifier();
    const value = lit ? lit.getText() : id!.getText();
    this.out.push(`attribute ${value};`);
    this.writeTrailing(ctx); this.nl();
  }

  private printRootType(ctx: RootTypeDeclContext) {
    this.out.push(`root_type ${this.formatNsIdent(ctx.nsIdent())};`);
    this.writeTrailing(ctx); this.nl();
  }

  private printFileExt(ctx: FileExtensionDeclContext) {
    this.out.push(`file_extension ${ctx.STRING_LITERAL().getText()};`);
    this.writeTrailing(ctx); this.nl();
  }

  private printFileId(ctx: FileIdentifierDeclContext) {
    this.out.push(`file_identifier ${ctx.STRING_LITERAL().getText()};`);
    this.writeTrailing(ctx); this.nl();
  }

  private printTable(ctx: TableDeclContext) { this.printTableLike("table", ctx); }
  private printStruct(ctx: StructDeclContext) { this.printTableLike("struct", ctx); }

  private printTableLike(kw: "table" | "struct", ctx: TableDeclContext | StructDeclContext) {
    const name = ctx.identifier().getText();
    this.out.push(`${kw} ${name}`);
    const meta = ctx.metadata();
    if (meta) this.out.push(" " + this.formatMetadata(meta));
    this.out.push(" {");
    this.nl();

    const fields = ctx.fieldDecl();
    fields.forEach((f, i) => {
      this.writeLeading(f, 1, i === 0);
      this.out.push(this.indent(1));
      this.out.push(this.formatField(f));
      this.writeTrailing(f);
      this.nl();
    });
    this.out.push("}");
    this.writeTrailing(ctx);
    this.nl();
  }

  private formatField(ctx: FieldDeclContext): string {
    let s = `${ctx.identifier().getText()}: ${this.formatType(ctx.typeRef())}`;
    const scalar = ctx.scalar();
    if (scalar) s += ` = ${this.formatScalar(scalar)}`;
    const meta = ctx.metadata();
    if (meta) s += " " + this.formatMetadata(meta);
    s += ";";
    return s;
  }

  private formatType(ctx: TypeRefContext): string {
    if (ctx instanceof VectorTypeContext) {
      const inner = this.formatType(ctx.typeRef());
      const sizeTok = ctx.INT_LITERAL();
      const size = sizeTok ? `:${sizeTok.getText()}` : "";
      return `[${inner}${size}]`;
    }
    if (ctx instanceof NamedTypeContext) {
      return this.formatNsIdent(ctx.nsIdent());
    }
    return ctx.getText();
  }

  private formatNsIdent(ctx: NsIdentContext): string {
    return ctx.identifier().map((i: IdentifierContext) => i.getText()).join(".");
  }

  private formatMetadata(ctx: MetadataContext): string {
    const entries = ctx.metadataEntry();
    if (entries.length === 0) return "()";
    const parts = entries.map((e) => {
      const key = e.identifier().getText();
      const sv = e.singleValue();
      if (!sv) return key;
      return `${key}: ${this.formatSingle(sv)}`;
    });
    return `(${parts.join(", ")})`;
  }

  private formatSingle(ctx: SingleValueContext): string {
    const lit = ctx.STRING_LITERAL();
    if (lit) return lit.getText();
    return this.formatScalar(ctx.scalar()!);
  }

  private formatScalar(ctx: ScalarContext): string {
    if (ctx instanceof IntScalarContext) {
      const sign = signText(ctx);
      return `${sign}${ctx.INT_LITERAL().getText()}`;
    }
    if (ctx instanceof FloatScalarContext) {
      const sign = signText(ctx);
      return `${sign}${ctx.FLOAT_LITERAL().getText()}`;
    }
    if (ctx instanceof HexFloatScalarContext) {
      const sign = signText(ctx);
      return `${sign}${ctx.HEX_FLOAT_LITERAL().getText()}`;
    }
    if (ctx instanceof StringScalarContext) return ctx.STRING_LITERAL().getText();
    if (ctx instanceof IdentScalarContext) return ctx.identifier().getText();
    return ctx.getText();
  }

  private printEnum(ctx: EnumDeclContext) {
    const ids = ctx.identifier();
    let head = `enum ${ids[0]!.getText()}`;
    if (ids.length > 1) head += `: ${ids[1]!.getText()}`;
    this.out.push(head);
    const meta = ctx.metadata();
    if (meta) this.out.push(" " + this.formatMetadata(meta));
    this.out.push(" {");
    this.nl();
    const values = ctx.enumValDecl();
    values.forEach((v, i) => {
      this.writeLeading(v, 1, i === 0);
      this.out.push(this.indent(1));
      this.out.push(this.formatEnumVal(v));
      if (i < values.length - 1) this.out.push(",");
      this.writeTrailing(v);
      this.nl();
    });
    this.out.push("}");
    this.writeTrailing(ctx);
    this.nl();
  }

  private formatEnumVal(v: EnumValDeclContext): string {
    let s = v.identifier().getText();
    const sc = v.scalar();
    if (sc) s += ` = ${this.formatScalar(sc)}`;
    const meta = v.metadata();
    if (meta) s += " " + this.formatMetadata(meta);
    return s;
  }

  private printUnion(ctx: UnionDeclContext) {
    const ids = ctx.identifier();
    let head = `union ${ids[0]!.getText()}`;
    if (ids.length > 1) head += `: ${ids[1]!.getText()}`;
    this.out.push(head);
    const meta = ctx.metadata();
    if (meta) this.out.push(" " + this.formatMetadata(meta));
    this.out.push(" {");
    this.nl();
    const vals = ctx.unionValDecl();
    vals.forEach((v, i) => {
      this.writeLeading(v, 1, i === 0);
      this.out.push(this.indent(1));
      this.out.push(this.formatUnionVal(v));
      if (i < vals.length - 1) this.out.push(",");
      this.writeTrailing(v);
      this.nl();
    });
    this.out.push("}");
    this.writeTrailing(ctx);
    this.nl();
  }

  private formatUnionVal(v: UnionValDeclContext): string {
    const alias = v.identifier();
    const type = this.formatNsIdent(v.nsIdent());
    return alias ? `${alias.getText()}: ${type}` : type;
  }

  private printRpc(ctx: RpcServiceDeclContext) {
    this.out.push(`rpc_service ${ctx.identifier().getText()} {`);
    this.nl();
    const methods = ctx.rpcMethod();
    methods.forEach((m, i) => {
      this.writeLeading(m, 1, i === 0);
      this.out.push(this.indent(1));
      this.out.push(this.formatRpcMethod(m));
      this.writeTrailing(m);
      this.nl();
    });
    this.out.push("}");
    this.writeTrailing(ctx);
    this.nl();
  }

  private formatRpcMethod(m: RpcMethodContext): string {
    const name = m.identifier().getText();
    const nss = m.nsIdent();
    let s = `${name}(${this.formatNsIdent(nss[0]!)}): ${this.formatNsIdent(nss[1]!)}`;
    const meta = m.metadata();
    if (meta) s += " " + this.formatMetadata(meta);
    s += ";";
    return s;
  }

  private printObjectDecl(ctx: ObjectLiteralDeclContext) {
    this.out.push(this.formatObject(ctx.objectLiteral(), 0));
    this.nl();
  }

  private formatObject(ctx: ObjectLiteralContext, depth: number): string {
    const fields = ctx.objectField();
    if (fields.length === 0) return "{}";
    const inner = this.indent(depth + 1);
    const close = this.indent(depth);
    const parts = fields.map((f) => inner + this.formatObjectField(f, depth + 1));
    return `{${this.opts.newline}${parts.join("," + this.opts.newline)}${this.opts.newline}${close}}`;
  }

  private formatObjectField(f: ObjectFieldContext, depth: number): string {
    const key = f.identifier()?.getText() ?? f.STRING_LITERAL()!.getText();
    return `${key}: ${this.formatObjectValue(f.objectValue(), depth)}`;
  }

  private formatObjectValue(v: ObjectValueContext, depth: number): string {
    if (v instanceof ScalarValueContext) return this.formatScalar(v.scalar());
    if (v instanceof NestedObjectValueContext) {
      return this.formatObject(v.objectLiteral(), depth);
    }
    if (v instanceof ArrayValueContext) {
      const values = v.objectValue();
      if (values.length === 0) return "[]";
      const allScalar = values.every((x) => x instanceof ScalarValueContext);
      if (allScalar) {
        const inline = `[${values.map((x) => this.formatObjectValue(x, depth)).join(", ")}]`;
        if (inline.length + depth * this.opts.indent <= 80) return inline;
      }
      const inner = this.indent(depth + 1);
      const close = this.indent(depth);
      const parts = values.map((x) => inner + this.formatObjectValue(x, depth + 1));
      return `[${this.opts.newline}${parts.join("," + this.opts.newline)}${this.opts.newline}${close}]`;
    }
    return v.getText();
  }
}

function signText(ctx: IntScalarContext | FloatScalarContext | HexFloatScalarContext): string {
  const text = ctx.getText();
  if (text.startsWith("-")) return "-";
  if (text.startsWith("+")) return "+";
  return "";
}

function hasBlankLine(trivia: Trivia[]): boolean {
  return trivia.some((t) => t.kind === "blank_line");
}

function stripLeadingBlanks(trivia: Trivia[]): Trivia[] {
  let i = 0;
  while (i < trivia.length && trivia[i]!.kind === "blank_line") i++;
  return trivia.slice(i);
}

function isBlockCtxName(name: string): boolean {
  const rule = name.replace(/Context$/, "");
  return BLOCK_DECL_RULES.has(rule[0]!.toLowerCase() + rule.slice(1));
}

// Mark the type as used so noUnusedLocals stays happy on the
// type-only re-export from the generated module.
void FlatBuffersParser;
