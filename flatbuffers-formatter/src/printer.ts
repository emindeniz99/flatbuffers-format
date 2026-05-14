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
  /** Spaces per indent level. Default 2. */
  indent?: number;
  /** Line endings. Default "\n". */
  newline?: "\n" | "\r\n";
};

type Resolved = Required<FormatOptions>;

const DEFAULTS: Resolved = {
  indent: 2,
  newline: "\n",
};

class Printer {
  private out: string[] = [];
  private readonly opts: Resolved;
  constructor(opts: FormatOptions) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  print(schema: Schema): string {
    let prev: TopLevel | undefined;
    for (const item of schema.items) {
      if (prev) {
        // Preserve a single blank line between top-level items if the
        // user had one. Always force at least one blank line between
        // declarations of different kinds and around block decls
        // (table / struct / enum / union / rpc_service).
        const hadBlank = hasBlankLine(item.leading);
        // Always insert a blank line around block declarations
        // (table/struct/enum/union/rpc_service). For runs of single-line
        // statements (include/namespace/root_type/...), only insert one
        // if the user had one.
        const forceBlank = isBlockDecl(item) || isBlockDecl(prev);
        if (hadBlank || forceBlank) {
          this.out.push(this.opts.newline);
        }
      }
      this.printTopLevel(item);
      prev = item;
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
    return " ".repeat(this.opts.indent * depth);
  }

  private writeLeading(leading: Trivia[], depth: number) {
    // Top-level leading is rendered as standalone comment lines /
    // blank lines. blank_line markers are handled at the call site.
    const pad = this.indentStr(depth);
    for (const t of leading) {
      if (t.kind === "blank_line") {
        this.nl();
        continue;
      }
      if (t.kind === "line_comment") {
        this.out.push(`${pad}//${t.value}`);
        this.nl();
      } else if (t.kind === "doc_comment") {
        this.out.push(`${pad}///${t.value}`);
        this.nl();
      } else if (t.kind === "block_comment") {
        this.out.push(`${pad}/*${t.value}*/`);
        this.nl();
      }
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
        this.out.push(`include "${item.path}";`);
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
    this.out.push(`${decl.kind} ${decl.name}`);
    if (decl.metadata) this.out.push(" " + this.formatMetadata(decl.metadata));
    this.out.push(" {");
    this.writeTrailing(decl);
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
    this.nl();
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
      // Field-type-position colon: the upstream `flatc` formatter keeps
      // `field:Type` flush (no spaces around colon). Vector elements:
      // `[Type]` with no inner padding.
      return " " + t.name;
    }
    return " [" + this.formatType(t.element).trimStart() + "]";
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
    this.out.push(head);
    if (decl.metadata) this.out.push(" " + this.formatMetadata(decl.metadata));
    this.out.push(" {");
    this.writeTrailing(decl);
    this.nl();
    this.printEnumValues(decl.values);
    this.out.push("}");
    this.nl();
  }

  private printEnumValues(values: EnumValueDecl[]) {
    for (let i = 0; i < values.length; i++) {
      const v = values[i]!;
      const leading = i === 0 ? stripLeadingBlankLines(v.leading) : v.leading;
      this.writeLeading(leading, 1);
      this.out.push(this.indentStr(1));
      let s = v.name;
      if (v.value) s += ` = ${formatScalar(v.value)}`;
      if (i < values.length - 1) s += ",";
      this.out.push(s);
      this.writeTrailing(v);
      this.nl();
    }
  }

  private printUnion(decl: UnionDecl) {
    let head = `union ${decl.name}`;
    if (decl.metadata) head += " " + this.formatMetadata(decl.metadata);
    this.out.push(head);
    this.out.push(" {");
    this.writeTrailing(decl);
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
    this.nl();
  }

  private printRpcService(decl: RpcServiceDecl) {
    this.out.push(`rpc_service ${decl.name} {`);
    this.writeTrailing(decl);
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
        if (inline.length + depth * this.opts.indent <= 80) return inline;
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

function hasBlankLine(leading: Trivia[]): boolean {
  return leading.some((t) => t.kind === "blank_line");
}

function stripLeadingBlankLines(leading: Trivia[]): Trivia[] {
  let i = 0;
  while (i < leading.length && leading[i]!.kind === "blank_line") i++;
  return leading.slice(i);
}

export function print(schema: Schema, opts: FormatOptions = {}): string {
  return new Printer(opts).print(schema);
}
