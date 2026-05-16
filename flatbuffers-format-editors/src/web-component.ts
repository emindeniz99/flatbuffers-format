// `<flatbuffers-editor>` — a drop-in custom element that wraps a
// CodeMirror 6 editor configured for FlatBuffers schemas. Designed so
// users can sprinkle one onto any HTML page and get syntax
// highlighting + format-on-Ctrl+Shift+F without writing any wiring:
//
//   <flatbuffers-editor>
//     table Monster {
//       hp: short = 100;
//     }
//   </flatbuffers-editor>
//
//   <script type="module">
//     import "flatbuffers-format-editors/web-component";
//   </script>
//
// The element exposes:
//   - `value` getter/setter — the current schema text.
//   - `format()` — runs the formatter, replaces the text.
//   - A `change` CustomEvent on edits (debounced, `detail.value`).
//   - An optional `readonly` boolean attribute.
//   - An optional `theme="dark"` attribute (defaults to light).
//
// Why a Web Component instead of "just" a CodeMirror wrapper: lets it
// drop into static HTML pages and frameworks that don't share a JS
// module system (React, Vue, Lit, Astro, Markdown→HTML pipelines all
// accept custom elements).

import { EditorView, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  bracketMatching,
  indentOnInput,
} from "@codemirror/language";
import { flatbuffers, formatKeymap, formatCommand } from "./codemirror.js";

export class FlatBuffersEditorElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["value", "readonly", "theme"];
  }

  private view: EditorView | null = null;
  private host: HTMLDivElement;
  private changeTimer: ReturnType<typeof setTimeout> | null = null;
  // Compartments let us reconfigure individual extension slots without
  // tearing down + rebuilding the entire state.
  private readonlyCompartment = new Compartment();

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    this.host = document.createElement("div");
    this.host.className = "host";
    root.append(style, this.host);
  }

  connectedCallback(): void {
    if (this.view) return;
    const initialValue =
      this.getAttribute("value") ??
      // Light-touch detection of inline child text: drop indentation
      // from the surrounding markup so users don't have to outdent.
      dedent(this.textContent ?? "");

    const extensions: Extension[] = [
      lineNumbers(),
      drawSelection(),
      highlightActiveLine(),
      bracketMatching(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      flatbuffers(),
      formatKeymap(),
      this.readonlyCompartment.of(EditorView.editable.of(!this.hasAttribute("readonly"))),
      EditorView.updateListener.of((u) => {
        if (!u.docChanged) return;
        this.queueChangeEvent();
      }),
    ];
    // Theme is intentionally lightweight — the host page's stylesheet
    // owns the look-and-feel beyond what CodeMirror's defaults give.
    if (this.getAttribute("theme") === "dark") {
      extensions.push(
        EditorView.theme({ "&": { backgroundColor: "#1e1e1e", color: "#d4d4d4" } }, { dark: true }),
      );
    }

    // Clear the slot-style fallback content from the light DOM so it
    // doesn't double-render when the editor mounts.
    this.textContent = "";

    this.view = new EditorView({
      state: EditorState.create({ doc: initialValue, extensions }),
      parent: this.host,
    });
  }

  disconnectedCallback(): void {
    if (this.changeTimer) {
      clearTimeout(this.changeTimer);
      this.changeTimer = null;
    }
    this.view?.destroy();
    this.view = null;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (
      name === "value" &&
      this.view &&
      value !== null &&
      value !== this.view.state.doc.toString()
    ) {
      this.view.dispatch({
        changes: { from: 0, to: this.view.state.doc.length, insert: value },
      });
    }
    if (name === "readonly" && this.view) {
      const editable = value === null;
      this.view.dispatch({
        effects: this.readonlyCompartment.reconfigure(EditorView.editable.of(editable)),
      });
    }
  }

  get value(): string {
    return this.view?.state.doc.toString() ?? "";
  }

  set value(text: string) {
    if (!this.view) {
      this.setAttribute("value", text);
      return;
    }
    if (text === this.view.state.doc.toString()) return;
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: text },
    });
  }

  /** Runs `flatbuffers-format` on the current contents. */
  format(): void {
    if (!this.view) return;
    formatCommand(this.view);
  }

  private queueChangeEvent(): void {
    if (this.changeTimer) clearTimeout(this.changeTimer);
    this.changeTimer = setTimeout(() => {
      this.dispatchEvent(
        new CustomEvent("change", { detail: { value: this.value }, bubbles: true, composed: true }),
      );
    }, 100);
  }
}

function dedent(s: string): string {
  if (!s) return s;
  const lines = s.replace(/^\n+/, "").replace(/\s+$/, "").split("\n");
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === "") continue;
    const m = /^[ \t]*/.exec(line);
    if (m && m[0].length < minIndent) minIndent = m[0].length;
  }
  if (!Number.isFinite(minIndent) || minIndent === 0) return lines.join("\n");
  return lines.map((l) => l.slice(minIndent)).join("\n");
}

const STYLE = `
:host {
  display: block;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  overflow: hidden;
  font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
}
:host([hidden]) { display: none; }
.host { height: 100%; }
.cm-editor { height: 100%; }
.cm-editor.cm-focused { outline: none; }
`;

// Register on import; if the consumer has its own custom-element
// name collision, they can extend the class and call `define()`
// themselves on a different tag.
if (typeof customElements !== "undefined" && !customElements.get("flatbuffers-editor")) {
  customElements.define("flatbuffers-editor", FlatBuffersEditorElement);
}
