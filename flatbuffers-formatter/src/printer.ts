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
  /**
   * Spaces per indent level (or tabs per level when `useTabs` is true).
   * Default: 2.
   */
  indent?: number;
  /**
   * Use literal tab characters for indentation instead of spaces. When
   * true, each indent level emits `indent` tab characters (so the
   * combination `useTabs: true, indent: 1` is one tab per level — the
   * usual setting; `useTabs: true, indent: 2` would emit two tabs per
   * level). Default: false.
   */
  useTabs?: boolean;
  /** Newline style at end of every emitted line. Default: "\n". */
  newline?: "\n" | "\r\n";
  /**
   * Target column for "does it fit on one line" decisions, used by
   * `compactSingleLine` and `wrapComments`. Default: 80.
   */
  lineWidth?: number;
  /**
   * If true, enum/union bodies (and single-field table/struct bodies)
   * that fit within `lineWidth` collapse onto one line. Doc comments,
   * block comments, and per-value metadata always force expansion.
   * Default: true.
   */
  compactSingleLine?: boolean;
  /**
   * Maximum consecutive blank lines preserved between top-level
   * declarations. Runs of more newlines collapse to this many.
   * Default: 1.
   */
  maxBlankLines?: number;
  /**
   * If true, line comments longer than `commentWidth` are reflowed at
   * whitespace boundaries. URL-shaped tokens (`https://…`) are never
   * split mid-token. Block comments and doc comments are not touched.
   * Default: false.
   */
  wrapComments?: boolean;
  /** Wrap column for `wrapComments`. Defaults to `lineWidth`. */
  commentWidth?: number;
};

type Resolved = Required<Omit<FormatOptions, "commentWidth">> & {
  commentWidth: number;
};
const DEFAULTS = {
  indent: 2,
  useTabs: false,
  newline: "\n" as "\n" | "\r\n",
  lineWidth: 80,
  compactSingleLine: true,
  maxBlankLines: 1,
  wrapComments: false,
};

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
    const merged = { ...DEFAULTS, ...opts };
    this.opts = {
      ...merged,
      commentWidth: opts.commentWidth ?? merged.lineWidth,
    };
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
        const blanks = countBlankLines(leadingTrivia(item as any, this.stream));
        // Decl separator: at least one blank line around block decls
        // or when the user had any blank line in the source; otherwise
        // adjacent single-line decls (include / namespace / ...) stay
        // glued together. The user's blank-line count, when present,
        // is honoured up to `maxBlankLines`.
        const forced = wasBlock || isBlock;
        let want = 0;
        if (forced && blanks === 0) want = 1;
        else if (blanks > 0) want = Math.min(blanks, this.opts.maxBlankLines);
        for (let k = 0; k < want; k++) this.nl();
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
  private indent(depth: number) {
    const ch = this.opts.useTabs ? "\t" : " ";
    return ch.repeat(this.opts.indent * depth);
  }

  private writeTrivia(trivia: Trivia[], depth: number) {
    const pad = this.indent(depth);
    let blankRun = 0;
    for (const t of trivia) {
      if (t.kind === "blank_line") {
        // Cap consecutive blank lines at `maxBlankLines`. Each
        // blank_line marker means "one blank line"; the lexer/trivia
        // layer emits as many as the source had (up to a safety cap).
        if (blankRun < this.opts.maxBlankLines) this.nl();
        blankRun++;
        continue;
      }
      blankRun = 0;
      if (t.kind === "line_comment") {
        this.writeLineComment(t.value, pad);
      } else if (t.kind === "doc_comment") {
        this.out.push(`${pad}///${t.value}`);
        this.nl();
      } else if (t.kind === "block_comment") {
        this.out.push(`${pad}/*${t.value}*/`);
        this.nl();
      }
    }
  }

  private writeLineComment(value: string, pad: string) {
    if (!this.opts.wrapComments) {
      this.out.push(`${pad}//${value}`);
      this.nl();
      return;
    }
    const rendered = `${pad}//${value}`;
    if (rendered.length <= this.opts.commentWidth) {
      this.out.push(rendered);
      this.nl();
      return;
    }
    // Wrap. The body's leading whitespace is treated as a normal
    // single-space separator after `//` — continuation lines line up
    // with the first content character.
    const body = value.replace(/^\s+/, "");
    const prefix = `${pad}// `;
    const budget = Math.max(1, this.opts.commentWidth - prefix.length);
    const tokens = splitForWrap(body);
    const lines = packTokens(tokens, budget);
    if (lines.length === 0) {
      this.out.push(rendered);
      this.nl();
      return;
    }
    for (const line of lines) {
      this.out.push(`${prefix}${line}`);
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
    let head = `${kw} ${name}`;
    const meta = ctx.metadata();
    if (meta) head += " " + this.formatMetadata(meta);
    const fields = ctx.fieldDecl();

    // Try compact single-line form: only valid for SINGLE-field bodies,
    // and only when no field has trivia / metadata and the result fits
    // within lineWidth at the current indent.
    if (this.opts.compactSingleLine && this.tryCompactTableLike(head, ctx, fields, 0)) return;

    this.out.push(`${head} {`);
    this.nl();
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

  private tryCompactTableLike(
    head: string,
    ctx: TableDeclContext | StructDeclContext,
    fields: FieldDeclContext[],
    depth: number,
  ): boolean {
    if (fields.length !== 1) return false;
    const f = fields[0]!;
    if (fieldHasBlockingTrivia(this, f)) return false;
    // Comments / blanks before the single field block collapse — even
    // stripped of leading blanks, any comment trivia means the user
    // wanted commentary in the body, which we'd lose by collapsing.
    const leading = this.leadingFor(f, true);
    if (leading.length > 0) return false;
    if (this.trailingFor(f)) return false;
    if (this.trailingFor(ctx)) return false;
    const body = this.formatField(f);
    const candidate = `${this.indent(depth)}${head} { ${body} }`;
    if (candidate.length > this.opts.lineWidth) return false;
    this.out.push(candidate);
    this.nl();
    return true;
  }

  private leadingFor(ctx: any, stripBlank: boolean): Trivia[] {
    let trivia = leadingTrivia(ctx, this.stream);
    if (stripBlank) trivia = stripLeadingBlanks(trivia);
    return trivia;
  }
  private trailingFor(ctx: any): Trivia | undefined {
    return trailingComment(ctx, this.stream);
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
    const meta = ctx.metadata();
    if (meta) head += " " + this.formatMetadata(meta);
    const values = ctx.enumValDecl();
    if (this.opts.compactSingleLine && this.tryCompactEnumLike(head, ctx, values, 0)) return;

    this.out.push(`${head} {`);
    this.nl();
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

  private tryCompactEnumLike(
    head: string,
    ctx: EnumDeclContext,
    values: EnumValDeclContext[],
    depth: number,
  ): boolean {
    if (values.length === 0) return false;
    for (let i = 0; i < values.length; i++) {
      const v = values[i]!;
      if (v.metadata()) return false;
      // First value: blank lines between `{` and the first value are
      // cosmetic and stripped on expansion, so don't block compact form.
      // Subsequent values: any non-stripped trivia (including blanks)
      // blocks compaction so we don't lose paragraph breaks the user
      // wrote between values.
      const leading = this.leadingFor(v, i === 0);
      if (leading.length > 0) return false;
      if (this.trailingFor(v)) return false;
    }
    if (this.trailingFor(ctx)) return false;
    const parts = values.map((v) => this.formatEnumVal(v));
    const body = parts.join(", ");
    const candidate = `${this.indent(depth)}${head} { ${body} }`;
    if (candidate.length > this.opts.lineWidth) return false;
    this.out.push(candidate);
    this.nl();
    return true;
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
    const meta = ctx.metadata();
    if (meta) head += " " + this.formatMetadata(meta);
    const vals = ctx.unionValDecl();
    if (this.opts.compactSingleLine && this.tryCompactUnion(head, ctx, vals, 0)) return;

    this.out.push(`${head} {`);
    this.nl();
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

  private tryCompactUnion(
    head: string,
    ctx: UnionDeclContext,
    vals: UnionValDeclContext[],
    depth: number,
  ): boolean {
    if (vals.length === 0) return false;
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i]!;
      const leading = this.leadingFor(v, i === 0);
      if (leading.length > 0) return false;
      if (this.trailingFor(v)) return false;
    }
    if (this.trailingFor(ctx)) return false;
    const parts = vals.map((v) => this.formatUnionVal(v));
    const body = parts.join(", ");
    const candidate = `${this.indent(depth)}${head} { ${body} }`;
    if (candidate.length > this.opts.lineWidth) return false;
    this.out.push(candidate);
    this.nl();
    return true;
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
        if (inline.length + depth * this.opts.indent <= this.opts.lineWidth) return inline;
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

function countBlankLines(trivia: Trivia[]): number {
  let n = 0;
  for (const t of trivia) if (t.kind === "blank_line") n++;
  return n;
}

void hasBlankLine;

function fieldHasBlockingTrivia(
  printer: Printer,
  f: FieldDeclContext,
): boolean {
  void printer;
  // Field metadata blocks compact form. Trivia checks happen at the call site.
  return f.metadata() !== null;
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

// Split a comment body into wrap tokens. URL-shaped tokens (`https://…`)
// are kept intact; everything else is split on any whitespace run.
function splitForWrap(body: string): string[] {
  const out: string[] = [];
  const urlRe = /(https?:\/\/\S+)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(body)) !== null) {
    if (m.index > lastIdx) {
      const segment = body.slice(lastIdx, m.index);
      for (const w of segment.split(/\s+/)) if (w) out.push(w);
    }
    out.push(m[0]);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < body.length) {
    for (const w of body.slice(lastIdx).split(/\s+/)) if (w) out.push(w);
  }
  return out;
}

// Greedy packer: emit lines whose total width is at most `budget`.
// A token longer than `budget` still gets its own line (no mid-token
// splitting — that's the URL-safety guarantee, generalized).
function packTokens(tokens: string[], budget: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const t of tokens) {
    if (cur.length === 0) {
      cur = t;
      continue;
    }
    if (cur.length + 1 + t.length <= budget) {
      cur += " " + t;
    } else {
      lines.push(cur);
      cur = t;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

// Mark the type as used so noUnusedLocals stays happy on the
// type-only re-export from the generated module.
void FlatBuffersParser;
