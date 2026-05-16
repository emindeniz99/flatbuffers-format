// Pure formatter. No `vscode` import — unit-testable in plain Node.
// Wrapped by src/extension.ts where the VS Code API hooks live.

import { format, FormatError, type FormatOptions } from "flatbuffers-format";

export type FormatResult =
  | { kind: "ok"; text: string }
  | { kind: "noop" }
  | { kind: "error"; message: string };

/**
 * Format a `.fbs` source string. Returns a tagged union so the caller
 * can branch cleanly on the three outcomes the format provider needs:
 * apply edits, do nothing, or surface an error.
 *
 * Accepts the full {@link FormatOptions} shape; the extension reads each
 * supported `flatbuffers.format.*` setting and forwards it here.
 */
export function formatText(text: string, options: FormatOptions): FormatResult {
  try {
    const formatted = format(text, options);
    if (formatted === text) return { kind: "noop" };
    return { kind: "ok", text: formatted };
  } catch (err) {
    if (err instanceof FormatError) {
      return {
        kind: "error",
        message: `${err.line}:${err.column + 1}: ${err.message.replace(/^line \d+:\d+ /, "")}`,
      };
    }
    return { kind: "error", message: (err as Error).message };
  }
}
