// Pretty-printer. Walks the AST and emits formatted FlatBuffers schema
// text. The output is deterministic — running format() on already
// formatted source is a no-op (fixed point).

import type {
  EnumDecl,
  EnumValueDecl,
  FieldDecl,
  Metadata,
  ObjectField,
  ObjectLiteralDecl,
  ObjectValue,
  RpcServiceDecl,
  ScalarValue,
  Schema,
  StructDecl,
  TableDecl,
  TopLevel,
  Trivia,
  TypeRef,
  UnionDecl,
  WithTrivia,
} from "./types.js";

export type FormatOptions = {
  /**
   * Spaces per indent level (or tabs per level when `useTabs` is true).
   * Default: 2.
   */
  indent?: number;
  /**
   * Use literal tab characters for indentation instead of spaces. When
   * true, each indent level emits `indent` tab characters (so
   * `useTabs: true, indent: 1` is one tab per level — the usual
   * setting). Default: false.
   */
  useTabs?: boolean;
  /** Line endings. Default "\n". */
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

class Printer {
  private out: string[] = [];
  private readonly opts: Resolved;
  constructor(opts: FormatOptions) {
    const merged = { ...DEFAULTS, ...opts };
    this.opts = {
      ...merged,
      commentWidth: opts.commentWidth ?? merged.lineWidth,
    };
  }

  print(schema: Schema): string {
    let prev: TopLevel | undefined;
    for (const item of schema.items) {
      if (prev) {
        // Preserve up to `maxBlankLines` consecutive blank lines
        // between top-level items. Always insert a single blank line
        // around block declarations (table / struct / enum / union /
        // rpc_service / object) even if the source omitted it.
        const blanks = countBlankLines(item.leading);
        const forced = isBlockDecl(item) || isBlockDecl(prev);
        let want = 0;
        if (forced && blanks === 0) want = 1;
        else if (blanks > 0) want = Math.min(blanks, this.opts.maxBlankLines);
        for (let k = 0; k < want; k++) this.nl();
      }
      this.printTopLevel(item);
      prev = item;
    }
    // Emit any trivia that lived between the last decl and EOF —
    // trailing file comments, etc. Strip leading blank_lines so we
    // don't pile up newlines between the last decl and the comment.
    const tail = stripLeadingBlankLines(schema.tail);
    if (tail.length > 0) {
      if (schema.items.length > 0) this.nl();
      this.writeLeading(tail, 0);
    }
    // Always end with a single trailing newline.
    const text = this.out.join("");
    return text.endsWith(this.opts.newline)
      ? text
      : text + this.opts.newline;
  }

  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------

  private nl() {
    this.out.push(this.opts.newline);
  }

  private indentStr(depth: number) {
    const ch = this.opts.useTabs ? "\t" : " ";
    return ch.repeat(this.opts.indent * depth);
  }

  private writeLeading(leading: Trivia[], depth: number) {
    // Top-level leading is rendered as standalone comment lines /
    // blank lines. blank_line markers are honored up to maxBlankLines
    // (the printer-side cap). Lex-level captures all blank lines, so
    // doing the cap here keeps it a runtime knob.
    const pad = this.indentStr(depth);
    let blankRun = 0;
    for (const t of leading) {
      if (t.kind === "blank_line") {
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

  private writeTrailing(node: WithTrivia) {
    if (!node.trailing) return;
    const t = node.trailing;
    if (t.kind === "line_comment") {
      this.out.push(` //${t.value}`);
    } else if (t.kind === "block_comment") {
      this.out.push(` /*${t.value}*/`);
    }
  }

  // -----------------------------------------------------------------
  // Top level
  // -----------------------------------------------------------------

  private printTopLevel(item: TopLevel) {
    // Strip a leading blank_line from this item's leading trivia — the
    // separator between items is handled in `print()`.
    const leading = stripLeadingBlankLines(item.leading);
    this.writeLeading(leading, 0);

    switch (item.kind) {
      case "include":
        this.out.push(`${item.native ? "native_include" : "include"} "${item.path}";`);
        this.writeTrailing(item);
        this.nl();
        return;
      case "namespace":
        this.out.push(`namespace ${item.segments.join(".")};`);
        this.writeTrailing(item);
        this.nl();
        return;
      case "attribute":
        if (item.quoted) {
          this.out.push(`attribute "${item.value}";`);
        } else {
          this.out.push(`attribute ${item.value};`);
        }
        this.writeTrailing(item);
        this.nl();
        return;
      case "root_type":
        this.out.push(`root_type ${item.name};`);
        this.writeTrailing(item);
        this.nl();
        return;
      case "file_extension":
        this.out.push(`file_extension "${item.value}";`);
        this.writeTrailing(item);
        this.nl();
        return;
      case "file_identifier":
        this.out.push(`file_identifier "${item.value}";`);
        this.writeTrailing(item);
        this.nl();
        return;
      case "table":
      case "struct":
        this.printTableOrStruct(item);
        return;
      case "enum":
        this.printEnum(item);
        return;
      case "union":
        this.printUnion(item);
        return;
      case "rpc_service":
        this.printRpcService(item);
        return;
      case "object":
        this.printObjectLiteral(item);
        return;
    }
  }

  private printTableOrStruct(decl: TableDecl | StructDecl) {
    let head = `${decl.kind} ${decl.name}`;
    if (decl.metadata) head += " " + this.formatMetadata(decl.metadata);

    if (this.opts.compactSingleLine && this.tryCompactTableLike(head, decl)) return;

    this.out.push(`${head} {`);
    this.nl();

    let firstField = true;
    for (const field of decl.fields) {
      const leading = firstField
        ? stripLeadingBlankLines(field.leading)
        : field.leading;
      this.writeLeading(leading, 1);
      this.out.push(this.indentStr(1));
      this.out.push(this.formatField(field));
      this.writeTrailing(field);
      this.nl();
      firstField = false;
    }
    this.out.push("}");
    this.writeTrailing(decl);
    this.nl();
  }

  private tryCompactTableLike(head: string, decl: TableDecl | StructDecl): boolean {
    if (decl.fields.length !== 1) return false;
    const f = decl.fields[0]!;
    if (f.metadata) return false;
    // Any non-stripped leading trivia (comments, blank lines) means
    // the user wanted commentary inside the body. Don't collapse it
    // away.
    if (stripLeadingBlankLines(f.leading).length > 0) return false;
    if (f.trailing) return false;
    if (decl.trailing) return false;
    const body = this.formatField(f);
    const candidate = `${head} { ${body} }`;
    if (candidate.length > this.opts.lineWidth) return false;
    this.out.push(candidate);
    this.nl();
    return true;
  }

  private formatField(field: FieldDecl): string {
    let s = `${field.name}:${this.formatType(field.type)}`;
    if (field.defaultValue) {
      s += ` = ${formatScalar(field.defaultValue)}`;
    }
    if (field.metadata) s += ` ${this.formatMetadata(field.metadata)}`;
    s += ";";
    return s;
  }

  private formatType(t: TypeRef): string {
    if (t.kind === "named") {
      return " " + t.name;
    }
    const inner = this.formatType(t.element).trimStart();
    const size = t.size !== undefined ? `:${t.size}` : "";
    return " [" + inner + size + "]";
  }

  private formatMetadata(m: Metadata): string {
    if (m.entries.length === 0) return "()";
    const parts = m.entries.map((e) => {
      if (e.value === undefined) return e.key;
      return `${e.key}: ${formatScalar(e.value)}`;
    });
    return `(${parts.join(", ")})`;
  }

  private printEnum(decl: EnumDecl) {
    let head = `enum ${decl.name}`;
    if (decl.baseType) head += `: ${decl.baseType}`;
    if (decl.metadata) head += " " + this.formatMetadata(decl.metadata);
    if (this.opts.compactSingleLine && this.tryCompactEnum(head, decl)) return;

    this.out.push(`${head} {`);
    this.nl();
    this.printEnumValues(decl.values);
    this.out.push("}");
    this.writeTrailing(decl);
    this.nl();
  }

  private tryCompactEnum(head: string, decl: EnumDecl): boolean {
    if (decl.values.length === 0) return false;
    for (let i = 0; i < decl.values.length; i++) {
      const v = decl.values[i]!;
      if (v.metadata) return false;
      const leading = i === 0 ? stripLeadingBlankLines(v.leading) : v.leading;
      if (leading.length > 0) return false;
      if (v.trailing) return false;
    }
    if (decl.trailing) return false;
    const parts = decl.values.map((v) => this.formatEnumValInline(v));
    const candidate = `${head} { ${parts.join(", ")} }`;
    if (candidate.length > this.opts.lineWidth) return false;
    this.out.push(candidate);
    this.nl();
    return true;
  }

  private formatEnumValInline(v: EnumValueDecl): string {
    let s = v.name;
    if (v.value) s += ` = ${formatScalar(v.value)}`;
    if (v.metadata) s += " " + this.formatMetadata(v.metadata);
    return s;
  }

  private printEnumValues(values: EnumValueDecl[]) {
    for (let i = 0; i < values.length; i++) {
      const v = values[i]!;
      const leading = i === 0 ? stripLeadingBlankLines(v.leading) : v.leading;
      this.writeLeading(leading, 1);
      this.out.push(this.indentStr(1));
      let s = v.name;
      if (v.value) s += ` = ${formatScalar(v.value)}`;
      if (v.metadata) s += " " + this.formatMetadata(v.metadata);
      if (i < values.length - 1) s += ",";
      this.out.push(s);
      this.writeTrailing(v);
      this.nl();
    }
  }

  private printUnion(decl: UnionDecl) {
    let head = `union ${decl.name}`;
    if (decl.baseType) head += `: ${decl.baseType}`;
    if (decl.metadata) head += " " + this.formatMetadata(decl.metadata);
    if (this.opts.compactSingleLine && this.tryCompactUnion(head, decl)) return;

    this.out.push(`${head} {`);
    this.nl();
    for (let i = 0; i < decl.values.length; i++) {
      const v = decl.values[i]!;
      const leading = i === 0 ? stripLeadingBlankLines(v.leading) : v.leading;
      this.writeLeading(leading, 1);
      this.out.push(this.indentStr(1));
      let s = v.alias ? `${v.alias}: ${v.type}` : v.type;
      if (i < decl.values.length - 1) s += ",";
      this.out.push(s);
      this.writeTrailing(v);
      this.nl();
    }
    this.out.push("}");
    this.writeTrailing(decl);
    this.nl();
  }

  private tryCompactUnion(head: string, decl: UnionDecl): boolean {
    if (decl.values.length === 0) return false;
    for (let i = 0; i < decl.values.length; i++) {
      const v = decl.values[i]!;
      const leading = i === 0 ? stripLeadingBlankLines(v.leading) : v.leading;
      if (leading.length > 0) return false;
      if (v.trailing) return false;
    }
    if (decl.trailing) return false;
    const parts = decl.values.map((v) => (v.alias ? `${v.alias}: ${v.type}` : v.type));
    const candidate = `${head} { ${parts.join(", ")} }`;
    if (candidate.length > this.opts.lineWidth) return false;
    this.out.push(candidate);
    this.nl();
    return true;
  }

  private printRpcService(decl: RpcServiceDecl) {
    this.out.push(`rpc_service ${decl.name} {`);
    this.nl();
    for (let i = 0; i < decl.methods.length; i++) {
      const m = decl.methods[i]!;
      const leading = i === 0 ? stripLeadingBlankLines(m.leading) : m.leading;
      this.writeLeading(leading, 1);
      this.out.push(this.indentStr(1));
      let s = `${m.name}(${m.request}): ${m.response}`;
      if (m.metadata) s += " " + this.formatMetadata(m.metadata);
      s += ";";
      this.out.push(s);
      this.writeTrailing(m);
      this.nl();
    }
    this.out.push("}");
    this.writeTrailing(decl);
    this.nl();
  }

  private printObjectLiteral(decl: ObjectLiteralDecl) {
    this.out.push(this.formatObjectValue({ kind: "object", fields: decl.fields }, 0));
    this.nl();
  }

  private formatObjectValue(v: ObjectValue, depth: number): string {
    if ("kind" in v && v.kind === "object") {
      if (v.fields.length === 0) return "{}";
      const inner = this.indentStr(depth + 1);
      const close = this.indentStr(depth);
      const parts = v.fields.map((f) => inner + this.formatObjectField(f, depth + 1));
      return `{${this.opts.newline}${parts.join("," + this.opts.newline)}${this.opts.newline}${close}}`;
    }
    if ("kind" in v && v.kind === "array") {
      if (v.values.length === 0) return "[]";
      // Inline short arrays of scalars.
      const allScalar = v.values.every((x) => !("fields" in x) && !("values" in x));
      if (allScalar) {
        const parts = v.values.map((x) => formatScalar(x as ScalarValue));
        const inline = `[${parts.join(", ")}]`;
        if (inline.length + depth * this.opts.indent <= this.opts.lineWidth) return inline;
      }
      const inner = this.indentStr(depth + 1);
      const close = this.indentStr(depth);
      const parts = v.values.map((x) => inner + this.formatObjectValue(x, depth + 1));
      return `[${this.opts.newline}${parts.join("," + this.opts.newline)}${this.opts.newline}${close}]`;
    }
    return formatScalar(v as ScalarValue);
  }

  private formatObjectField(f: ObjectField, depth: number): string {
    return `${f.key}: ${this.formatObjectValue(f.value, depth)}`;
  }
}

function formatScalar(v: ScalarValue): string {
  switch (v.kind) {
    case "string":
      return v.raw; // includes the quotes
    case "int":
    case "float":
    case "ident":
      return v.raw;
  }
}

function isBlockDecl(item: TopLevel): boolean {
  return (
    item.kind === "table" ||
    item.kind === "struct" ||
    item.kind === "enum" ||
    item.kind === "union" ||
    item.kind === "rpc_service" ||
    item.kind === "object"
  );
}

function countBlankLines(leading: Trivia[]): number {
  let n = 0;
  for (const t of leading) if (t.kind === "blank_line") n++;
  return n;
}

function stripLeadingBlankLines(leading: Trivia[]): Trivia[] {
  let i = 0;
  while (i < leading.length && leading[i]!.kind === "blank_line") i++;
  return leading.slice(i);
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

export function print(schema: Schema, opts: FormatOptions = {}): string {
  return new Printer(opts).print(schema);
}
