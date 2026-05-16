# flatbuffers-format-editors

> Browser editor integrations for FlatBuffers schemas — CodeMirror 6,
> Monaco editor, and a drop-in `<flatbuffers-editor>` Web Component.

[![npm version](https://img.shields.io/npm/v/flatbuffers-format-editors.svg)](https://www.npmjs.com/package/flatbuffers-format-editors)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Three thin wrappers around the
[`flatbuffers-format`](https://www.npmjs.com/package/flatbuffers-format)
engine. Each lets you put a FlatBuffers schema editor on a web page,
with syntax highlighting and one-shortcut formatting that produces
byte-for-byte the same output as the CLI / VS Code / IntelliJ /
pre-commit-hook integrations.

Pick whichever integration matches the editor you already use:

| If you're using…                       | Import this                                       |
|----------------------------------------|---------------------------------------------------|
| CodeMirror 6                           | `flatbuffers-format-editors/codemirror`           |
| Monaco editor                          | `flatbuffers-format-editors/monaco`               |
| Plain HTML / Markdown / framework HTML | `flatbuffers-format-editors/web-component`        |

## Install

```bash
npm install flatbuffers-format-editors flatbuffers-format
```

The editor packages (`@codemirror/*`, `monaco-editor`) are listed as
**optional peer dependencies** — install whichever ones the
integration you import actually needs.

```bash
# CodeMirror integration
npm install @codemirror/state @codemirror/view @codemirror/language

# Monaco integration
npm install monaco-editor

# Web Component: depends on CodeMirror under the hood, so install those.
npm install @codemirror/state @codemirror/view @codemirror/language
```

## CodeMirror 6

```ts
import { EditorView, basicSetup } from "codemirror";
import { flatbuffers, formatKeymap } from "flatbuffers-format-editors/codemirror";

new EditorView({
  doc: "table T { x: int; }",
  parent: document.body,
  extensions: [basicSetup, flatbuffers(), formatKeymap()],
});
```

`flatbuffers()` returns a `LanguageSupport` (the standard CodeMirror 6
shape — slot it into `extensions:` alongside `basicSetup`).
`formatKeymap()` binds Ctrl/Cmd+Shift+F to "format the document via
the in-process engine." `formatCommand` is also exported if you
prefer to wire your own keybinding.

## Monaco

```ts
import * as monaco from "monaco-editor";
import { registerFlatBuffers } from "flatbuffers-format-editors/monaco";

registerFlatBuffers(monaco);

monaco.editor.create(document.getElementById("editor")!, {
  value: "table T { x: int; }",
  language: "flatbuffers",
  formatOnSave: true,
});
```

`registerFlatBuffers(monaco)` does three things in one call:

1. `monaco.languages.register({ id: "flatbuffers", extensions: [".fbs"], … })`
2. `setMonarchTokensProvider("flatbuffers", …)` — keywords / builtin
   types / constants / numbers / strings / comments.
3. `registerDocumentFormattingEditProvider("flatbuffers", …)` — `Format
   Document` (Shift+Alt+F by default) runs the engine.

We don't bundle `monaco-editor`; you pass your own Monaco namespace.
Works against any Monaco ≥ 0.40 that exposes the standard public API.

## Web Component

For static HTML pages, Markdown→HTML pipelines, Astro, or any
framework that accepts custom elements:

```html
<flatbuffers-editor>
  table Monster {
    hp: short = 100;
    name: string;
  }
</flatbuffers-editor>

<script type="module">
  import "flatbuffers-format-editors/web-component";
</script>
```

Attributes:

| Attribute  | Default | What it does |
|------------|---------|--------------|
| `value`    | inline text content | Initial schema text. Live-bound. |
| `readonly` | (off)   | Disables editing when present. |
| `theme`    | `light` | Set `theme="dark"` for a dark-friendly editor surface. |

JS API:

```js
const el = document.querySelector("flatbuffers-editor");
el.value;                    // getter — current schema text
el.value = "table T {}";     // setter — replaces content
el.format();                 // runs flatbuffers-format
el.addEventListener("change", e => {
  console.log("new value:", e.detail.value);
});
```

Internally backed by CodeMirror 6 (so the `@codemirror/*` packages
need to be available to your bundler). Custom element name:
`<flatbuffers-editor>`. If you need a different tag (collision,
multiple variants), import the `FlatBuffersEditorElement` class
directly and call `customElements.define("my-editor", class extends
FlatBuffersEditorElement {})`.

## How releases happen

Same release-please flow as the rest of the monorepo. Don't bump
`version` in `package.json` by hand — Conventional Commits drive it.
See [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
