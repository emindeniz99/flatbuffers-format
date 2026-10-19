// Pretty-printer driven by the ANTLR-generated parse tree.
//
// The grammar uses an `identifier` rule that resolves to either a
// regular `IDENT` token or a keyword token (`TABLE`, `STRUCT`, …),
// so most user-named slots access the identifier via
// `ctx.identifier()?.getText()` rather than a bare `IDENT()` lookup.
// `nsIdent` is used in every type-bearing position.

import type { BufferedTokenStream, ParserRuleContext } from "antlr4ng";
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
import {
  commentsBetween,
  hasCommentsBetween,
  leadingTrivia,
  leadingTriviaAt,
  tailTrivia,
  trailingComments,
  type Trivia,
} from "./trivia.js";

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
  /**
   * `"all"` puts a comma after the last value of an enum or union
   * written one value per line; `"none"` leaves it off. A body
   * collapsed onto one line never gets one. Same name and default as
   * Prettier's option. Default: "all".
   */
  trailingComma?: "all" | "none";
  /**
   * `"preserve"` keeps a body expanded when the source has a line break
   * between its `{` and the first item, as Prettier does for objects;
   * `"collapse"` puts every body that fits on one line (see
   * `compactSingleLine`). Default: "preserve".
   */
  objectWrap?: "preserve" | "collapse";
  /**
   * Spaces inside the braces of a body collapsed onto one line:
   * `{ a, b }` when true, `{a, b}` when false. Default: true.
   */
  bracketSpacing?: boolean;
  /**
   * Line endings: `"lf"`, `"crlf"`, or `"auto"` to keep the ones the
   * source uses (decided by its first line break). Takes precedence
   * over `newline`. Default: "lf".
   */
  endOfLine?: "lf" | "crlf" | "auto";
  /**
   * Leave a file unchanged when a comment at its top contains
   * `@noformat` or `@noprettier`. Default: false.
   */
  checkIgnorePragma?: boolean;
  /**
   * Format only files with a comment at their top containing `@format`
   * or `@prettier`; leave every other file unchanged. Default: false.
   */
  requirePragma?: boolean;
  /**
   * Skip the checks that the output keeps every comment and code token
   * of the input. Only for working around a bug in those checks.
   * Default: false.
   */
  unsafe?: boolean;
};

type Resolved = Required<
  Omit<FormatOptions, "commentWidth" | "endOfLine" | "checkIgnorePragma" | "requirePragma" | "unsafe">
> & {
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
  trailingComma: "all" as "all" | "none",
  objectWrap: "preserve" as "preserve" | "collapse",
  bracketSpacing: true,
};

// Token types of the grammar's anonymous `{` and `,` literals. Compared
// by type because reading `token.text` re-slices the input every time.
const LBRACE = FlatBuffersParser.literalNames.indexOf("'{'");
const COMMA = FlatBuffersParser.literalNames.indexOf("','");

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
    const { endOfLine: _, checkIgnorePragma: _i, requirePragma: _r, unsafe: _u, ...rest } = opts;
    const merged = { ...DEFAULTS, ...rest };
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

  // Ends the current output line. Writes every comment the source had
  // after token `stop`: those before `anchor` (the comma after a list
  // item, which the printer re-emits itself) and those on the anchor's
  // own line. Block comments stay inline; a line or doc comment ends
  // the line, so anything after it moves onto its own line at `depth`.
  private endLine(stop: number, depth: number, anchor = stop) {
    const comments = [
      ...commentsBetween(stop, anchor, this.stream),
      ...trailingComments(anchor, this.stream),
    ];
    let i = 0;
    while (i < comments.length) {
      const c = comments[i++]!;
      this.out.push(` ${renderComment(c)}`);
      if (c.kind !== "block_comment") break;
    }
    this.nl();
    this.writeTrivia(comments.slice(i), depth);
  }

  // Comments inside a construct the printer rebuilds from the parse
  // tree (between a field name and its type, inside metadata, …) have
  // no slot in the output. Hoist them onto their own lines above it.
  private writeInterior(from: number, to: number, depth: number) {
    this.writeTrivia(commentsBetween(from, to, this.stream), depth);
  }

  // Comments between the last item of a body and its `}` (or the whole
  // content of a comment-only body), one indent level in.
  private writeBodyEnd(close: number, empty: boolean) {
    let trivia = stripTrailingBlanks(leadingTriviaAt(close, this.stream));
    if (empty) trivia = stripLeadingBlanks(trivia);
    this.writeTrivia(trivia, 1);
  }

  // Token index of the `{` that opens a declaration's body.
  private openBrace(ctx: ParserRuleContext): number {
    for (let i = ctx.start!.tokenIndex; ; i++) {
      const tok = this.stream.get(i);
      if (tok.type === LBRACE) return i;
    }
  }

  // The comma after a list item when there is one, else the item's
  // own last token. Comments on the comma's line belong to the item.
  private anchorAfter(stop: number): number {
    for (let i = stop + 1; i < this.stream.size; i++) {
      const tok = this.stream.get(i);
      if (tok.channel !== 0) continue;
      return tok.type === COMMA ? i : stop;
    }
    return stop;
  }

  // The source text from token `start` through token `stop`, with its
  // line breaks converted to the output's.
  private verbatim(start: number, stop: number): string {
    const from = this.stream.get(start);
    const text = from.inputStream!.getTextFromRange(from.start, this.stream.get(stop).stop);
    return text.replace(/\r?\n/g, this.opts.newline);
  }

  private writeLeading(ctx: any, depth: number, stripBlank = false) {
    let trivia = leadingTrivia(ctx, this.stream);
    if (stripBlank) trivia = stripLeadingBlanks(trivia);
    this.writeTrivia(trivia, depth);
  }

  // ---------------------------------------------------------------
  private printDeclItem(item: any) {
    this.writeLeading(item, 0, true);
    if (leadingTrivia(item, this.stream).some(isIgnoreComment)) {
      const start = item.start.tokenIndex;
      const stop = item.stop.tokenIndex;
      this.out.push(this.verbatim(start, stop));
      this.endLine(stop, 0);
      return;
    }
    const headerEnd = hasBody(item) ? this.openBrace(item) : item.stop.tokenIndex;
    this.writeInterior(item.start.tokenIndex, headerEnd, 0);
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
    this.endLine(ctx.stop!.tokenIndex, 0);
  }

  private printNamespace(ctx: NamespaceDeclContext) {
    const parts = ctx.identifier().map((id) => id.getText());
    this.out.push(`namespace ${parts.join(".")};`);
    this.endLine(ctx.stop!.tokenIndex, 0);
  }

  private printAttribute(ctx: AttributeDeclContext) {
    const lit = ctx.STRING_LITERAL();
    const id = ctx.identifier();
    const value = lit ? lit.getText() : id!.getText();
    this.out.push(`attribute ${value};`);
    this.endLine(ctx.stop!.tokenIndex, 0);
  }

  private printRootType(ctx: RootTypeDeclContext) {
    this.out.push(`root_type ${this.formatNsIdent(ctx.nsIdent())};`);
    this.endLine(ctx.stop!.tokenIndex, 0);
  }

  private printFileExt(ctx: FileExtensionDeclContext) {
    this.out.push(`file_extension ${ctx.STRING_LITERAL().getText()};`);
    this.endLine(ctx.stop!.tokenIndex, 0);
  }

  private printFileId(ctx: FileIdentifierDeclContext) {
    this.out.push(`file_identifier ${ctx.STRING_LITERAL().getText()};`);
    this.endLine(ctx.stop!.tokenIndex, 0);
  }

  private printTable(ctx: TableDeclContext) { this.printTableLike("table", ctx); }
  private printStruct(ctx: StructDeclContext) { this.printTableLike("struct", ctx); }

  private printTableLike(kw: "table" | "struct", ctx: TableDeclContext | StructDeclContext) {
    const name = ctx.identifier().getText();
    let head = `${kw} ${name}`;
    const meta = ctx.metadata();
    if (meta) head += " " + this.formatMetadata(meta);
    const fields = ctx.fieldDecl();
    const open = this.openBrace(ctx);
    const close = ctx.stop!.tokenIndex;

    // Try compact single-line form: only valid for SINGLE-field bodies,
    // and only when no field has trivia / metadata and the result fits
    // within lineWidth at the current indent.
    if (
      this.opts.compactSingleLine &&
      !hasCommentsBetween(open, close, this.stream) &&
      !this.keepExpanded(open) &&
      this.tryCompactTableLike(head, ctx, fields, 0)
    ) return;

    this.out.push(`${head} {`);
    this.endLine(open, 1);
    fields.forEach((f, i) => {
      this.writeLeading(f, 1, i === 0);
      this.writeInterior(f.start!.tokenIndex, f.stop!.tokenIndex, 1);
      this.out.push(this.indent(1));
      this.out.push(this.formatField(f));
      this.endLine(f.stop!.tokenIndex, 1);
    });
    this.writeBodyEnd(close, fields.length === 0);
    this.out.push("}");
    this.endLine(close, 0);
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
    const candidate = `${this.indent(depth)}${head} ${this.braced(body)}`;
    if (candidate.length > this.opts.lineWidth) return false;
    this.out.push(candidate);
    this.nl();
    return true;
  }

  // With `objectWrap: "preserve"`, a body the source broke after its
  // `{` stays expanded.
  private keepExpanded(open: number): boolean {
    if (this.opts.objectWrap !== "preserve") return false;
    const brace = this.stream.get(open);
    for (let i = open + 1; i < this.stream.size; i++) {
      const tok = this.stream.get(i);
      if (tok.channel === 0) return tok.line > brace.line;
    }
    return false;
  }

  private braced(body: string): string {
    return this.opts.bracketSpacing ? `{ ${body} }` : `{${body}}`;
  }

  private leadingFor(ctx: any, stripBlank: boolean): Trivia[] {
    let trivia = leadingTrivia(ctx, this.stream);
    if (stripBlank) trivia = stripLeadingBlanks(trivia);
    return trivia;
  }
  private trailingFor(ctx: any): boolean {
    return trailingComments(ctx.stop.tokenIndex, this.stream).length > 0;
  }

  private formatField(ctx: FieldDeclContext): string {
    let s = `${ctx.identifier().getText()}: ${this.formatType(ctx.typeRef())}`;
    const scalar = ctx.scalar();
    if (scalar) s += ` = ${this.formatScalar(scalar)}`;
    else if (ctx.emptyVector()) s += " = []";
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
    if (ctx instanceof IdentScalarContext) return `${signText(ctx)}${ctx.identifier().getText()}`;
    return ctx.getText();
  }

  private printEnum(ctx: EnumDeclContext) {
    const ids = ctx.identifier();
    let head = `enum ${ids[0]!.getText()}`;
    if (ids.length > 1) head += `: ${ids[1]!.getText()}`;
    const meta = ctx.metadata();
    if (meta) head += " " + this.formatMetadata(meta);
    const values = ctx.enumValDecl();
    const open = this.openBrace(ctx);
    const close = ctx.stop!.tokenIndex;
    if (
      this.opts.compactSingleLine &&
      !hasCommentsBetween(open, close, this.stream) &&
      !this.keepExpanded(open) &&
      this.tryCompactEnumLike(head, ctx, values, 0)
    ) return;

    this.out.push(`${head} {`);
    this.endLine(open, 1);
    values.forEach((v, i) => {
      this.writeLeading(v, 1, i === 0);
      this.writeInterior(v.start!.tokenIndex, v.stop!.tokenIndex, 1);
      this.out.push(this.indent(1));
      this.out.push(this.formatEnumVal(v));
      if (i < values.length - 1 || this.opts.trailingComma === "all") this.out.push(",");
      const stop = v.stop!.tokenIndex;
      this.endLine(stop, 1, this.anchorAfter(stop));
    });
    this.writeBodyEnd(close, values.length === 0);
    this.out.push("}");
    this.endLine(close, 0);
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
    const candidate = `${this.indent(depth)}${head} ${this.braced(body)}`;
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
    const open = this.openBrace(ctx);
    const close = ctx.stop!.tokenIndex;
    if (
      this.opts.compactSingleLine &&
      !hasCommentsBetween(open, close, this.stream) &&
      !this.keepExpanded(open) &&
      this.tryCompactUnion(head, ctx, vals, 0)
    ) return;

    this.out.push(`${head} {`);
    this.endLine(open, 1);
    vals.forEach((v, i) => {
      this.writeLeading(v, 1, i === 0);
      this.writeInterior(v.start!.tokenIndex, v.stop!.tokenIndex, 1);
      this.out.push(this.indent(1));
      this.out.push(this.formatUnionVal(v));
      if (i < vals.length - 1 || this.opts.trailingComma === "all") this.out.push(",");
      const stop = v.stop!.tokenIndex;
      this.endLine(stop, 1, this.anchorAfter(stop));
    });
    this.writeBodyEnd(close, vals.length === 0);
    this.out.push("}");
    this.endLine(close, 0);
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
      if (v.metadata()) return false;
      const leading = this.leadingFor(v, i === 0);
      if (leading.length > 0) return false;
      if (this.trailingFor(v)) return false;
    }
    if (this.trailingFor(ctx)) return false;
    const parts = vals.map((v) => this.formatUnionVal(v));
    const body = parts.join(", ");
    const candidate = `${this.indent(depth)}${head} ${this.braced(body)}`;
    if (candidate.length > this.opts.lineWidth) return false;
    this.out.push(candidate);
    this.nl();
    return true;
  }

  private formatUnionVal(v: UnionValDeclContext): string {
    const alias = v.identifier();
    let s = this.formatNsIdent(v.nsIdent());
    if (alias) s = `${alias.getText()}: ${s}`;
    const sc = v.scalar();
    if (sc) s += ` = ${this.formatScalar(sc)}`;
    const meta = v.metadata();
    if (meta) s += " " + this.formatMetadata(meta);
    return s;
  }

  private printRpc(ctx: RpcServiceDeclContext) {
    this.out.push(`rpc_service ${ctx.identifier().getText()} {`);
    const close = ctx.stop!.tokenIndex;
    this.endLine(this.openBrace(ctx), 1);
    const methods = ctx.rpcMethod();
    methods.forEach((m, i) => {
      this.writeLeading(m, 1, i === 0);
      this.writeInterior(m.start!.tokenIndex, m.stop!.tokenIndex, 1);
      this.out.push(this.indent(1));
      this.out.push(this.formatRpcMethod(m));
      this.endLine(m.stop!.tokenIndex, 1);
    });
    this.writeBodyEnd(close, methods.length === 0);
    this.out.push("}");
    this.endLine(close, 0);
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
    this.writeObject(ctx.objectLiteral(), 0);
    this.endLine(ctx.stop!.tokenIndex, 0);
  }

  // Object and array literals are written line by line, like a body:
  // each field or element ends its own line and keeps the comments on
  // it, and comments before a closing bracket stay inside. Blank lines
  // inside a literal are dropped, as they always were.
  private writeObject(ctx: ObjectLiteralContext, depth: number) {
    this.writeBracketed("{}", ctx.start!.tokenIndex, ctx.stop!.tokenIndex, ctx.objectField(), depth, (f) => {
      const v = f.objectValue();
      // Comments between the key and the value have no slot; a nested
      // literal keeps its own.
      const interiorEnd = v instanceof ScalarValueContext ? f.stop!.tokenIndex : v.start!.tokenIndex;
      this.writeInterior(f.start!.tokenIndex, interiorEnd, depth + 1);
      const key = f.identifier()?.getText() ?? f.STRING_LITERAL()!.getText();
      this.out.push(`${this.indent(depth + 1)}${key}: `);
      this.writeObjectValue(v, depth + 1);
    });
  }

  private writeObjectValue(v: ObjectValueContext, depth: number) {
    if (v instanceof ScalarValueContext) {
      this.out.push(this.formatScalar(v.scalar()));
    } else if (v instanceof NestedObjectValueContext) {
      this.writeObject(v.objectLiteral(), depth);
    } else if (v instanceof ArrayValueContext) {
      this.writeArray(v, depth);
    } else {
      this.out.push(v.getText());
    }
  }

  private writeArray(ctx: ArrayValueContext, depth: number) {
    const values = ctx.objectValue();
    const open = ctx.start!.tokenIndex;
    const close = ctx.stop!.tokenIndex;
    if (
      values.length > 0 &&
      values.every((x) => x instanceof ScalarValueContext) &&
      !hasCommentsBetween(open, close, this.stream)
    ) {
      const inline = `[${values.map((x) => this.formatScalar((x as ScalarValueContext).scalar())).join(", ")}]`;
      if (inline.length + depth * this.opts.indent <= this.opts.lineWidth) {
        this.out.push(inline);
        return;
      }
    }
    this.writeBracketed("[]", open, close, values, depth, (x) => {
      if (x instanceof ScalarValueContext) {
        this.writeInterior(x.start!.tokenIndex, x.stop!.tokenIndex, depth + 1);
      }
      this.out.push(this.indent(depth + 1));
      this.writeObjectValue(x, depth + 1);
    });
  }

  // A bracketed list at `depth`: tokens `open` … `close`, one item per
  // line written by `writeItem` after the item's leading comments. The
  // closing bracket is left on the current line for the caller to end.
  private writeBracketed<T extends ParserRuleContext>(
    brackets: "{}" | "[]",
    open: number,
    close: number,
    items: T[],
    depth: number,
    writeItem: (item: T) => void,
  ) {
    if (items.length === 0 && !hasCommentsBetween(open, close, this.stream)) {
      this.out.push(brackets);
      return;
    }
    this.out.push(brackets[0]!);
    this.endLine(open, depth + 1);
    items.forEach((item, i) => {
      this.writeTrivia(commentsOnly(leadingTrivia(item, this.stream)), depth + 1);
      writeItem(item);
      if (i < items.length - 1) this.out.push(",");
      const stop = item.stop!.tokenIndex;
      this.endLine(stop, depth + 1, this.anchorAfter(stop));
    });
    this.writeTrivia(commentsOnly(leadingTriviaAt(close, this.stream)), depth + 1);
    this.out.push(this.indent(depth) + brackets[1]!);
  }
}

function signText(
  ctx: IntScalarContext | FloatScalarContext | HexFloatScalarContext | IdentScalarContext,
): string {
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

function stripTrailingBlanks(trivia: Trivia[]): Trivia[] {
  let end = trivia.length;
  while (end > 0 && trivia[end - 1]!.kind === "blank_line") end--;
  return trivia.slice(0, end);
}

function renderComment(t: Trivia): string {
  if (t.kind === "line_comment") return `//${t.value}`;
  if (t.kind === "doc_comment") return `///${t.value}`;
  if (t.kind === "block_comment") return `/*${t.value}*/`;
  return "";
}

// Declarations whose header ends at a `{ … }` body of items.
function hasBody(item: unknown): boolean {
  return (
    item instanceof TableDeclContext ||
    item instanceof StructDeclContext ||
    item instanceof EnumDeclContext ||
    item instanceof UnionDeclContext ||
    item instanceof RpcServiceDeclContext ||
    item instanceof ObjectLiteralDeclContext
  );
}

// `// flatbuffers-format-ignore` (or Prettier's `// prettier-ignore`),
// optionally followed by a reason, keeps the next top-level declaration
// exactly as written.
const IGNORE = /^\s*(?:flatbuffers-format|prettier)-ignore(?:\s|$)/;

function isIgnoreComment(t: Trivia): boolean {
  return (t.kind === "line_comment" || t.kind === "block_comment") && IGNORE.test(t.value);
}

function commentsOnly(trivia: Trivia[]): Trivia[] {
  return trivia.filter((t) => t.kind !== "blank_line");
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
  let m: RegExpExecArray | null = urlRe.exec(body);
  while (m !== null) {
    if (m.index > lastIdx) {
      const segment = body.slice(lastIdx, m.index);
      for (const w of segment.split(/\s+/)) if (w) out.push(w);
    }
    out.push(m[0]);
    lastIdx = m.index + m[0].length;
    m = urlRe.exec(body);
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
