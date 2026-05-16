// Activation entry point. We register one thing: a
// DocumentFormattingEditProvider for the `flatbuffers` language.
// When the user runs "Format Document" or has format-on-save on,
// VS Code calls into the provider; the provider calls into the
// flatbuffers-format engine and returns a single TextEdit that
// replaces the whole document with the canonical output.
//
// We also publish a TextMate grammar (declared in package.json,
// not registered from code) for syntax highlighting.

import * as vscode from "vscode";
import type { FormatOptions } from "flatbuffers-format";
import { formatText } from "./format.js";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider("flatbuffers", {
      provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
      ): vscode.TextEdit[] {
        const config = vscode.workspace.getConfiguration("flatbuffers", document);
        const formatOptions = readFormatOptions(config, options);

        const result = formatText(document.getText(), formatOptions);
        if (result.kind === "noop") return [];
        if (result.kind === "error") {
          const fileName = document.fileName.split(/[\\/]/).pop() ?? "<file>";
          void vscode.window.showErrorMessage(`flatbuffers-format: ${fileName}:${result.message}`);
          return [];
        }
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length),
        );
        return [vscode.TextEdit.replace(fullRange, result.text)];
      },
    }),
  );
}

// Read the user's `flatbuffers.format.*` settings into a FormatOptions
// object. Each setting is optional — only forward what the user
// explicitly set so the engine's defaults remain authoritative.
function readFormatOptions(
  config: vscode.WorkspaceConfiguration,
  editorOptions: vscode.FormattingOptions,
): FormatOptions {
  const opts: FormatOptions = {};
  // Prefer the per-extension `indent` setting; fall back to VS Code's
  // language-agnostic `editor.tabSize` when unset.
  opts.indent = config.get<number>("format.indent") ?? editorOptions.tabSize ?? 2;

  const useTabs = config.get<boolean>("format.useTabs");
  if (typeof useTabs === "boolean") opts.useTabs = useTabs;

  const lineWidth = config.get<number>("format.lineWidth");
  if (typeof lineWidth === "number") opts.lineWidth = lineWidth;

  const compactSingleLine = config.get<boolean>("format.compactSingleLine");
  if (typeof compactSingleLine === "boolean") opts.compactSingleLine = compactSingleLine;

  const maxBlankLines = config.get<number>("format.maxBlankLines");
  if (typeof maxBlankLines === "number") opts.maxBlankLines = maxBlankLines;

  const wrapComments = config.get<boolean>("format.wrapComments");
  if (typeof wrapComments === "boolean") opts.wrapComments = wrapComments;

  const commentWidth = config.get<number>("format.commentWidth");
  if (typeof commentWidth === "number") opts.commentWidth = commentWidth;

  return opts;
}

export function deactivate(): void {
  // No teardown required; VS Code disposes of `subscriptions`.
}
