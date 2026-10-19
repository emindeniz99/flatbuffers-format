// Pure formatter. No `vscode` import — unit-testable in plain Node.
// Wrapped by src/extension.ts where the VS Code API hooks live.

import { format, FormatError, type FormatOptions } from "flatbuffers-format";
import { resolveConfig } from "flatbuffers-format/config";

export type FormatResult =
  | { kind: "ok"; text: string }
  | { kind: "noop" }
  | { kind: "error"; message: string };

/**
 * The options for a document: its project's `.flatbuffers-format.json`
 * when one applies, else the editor settings. A config file replaces the
 * settings rather than merging with them, so the editor formats exactly
 * as the CLI and CI do for the same file. `filePath` is undefined for
 * buffers that are not on disk.
 *
 * @throws {ConfigError} if the config file found is invalid.
 */
export function optionsFor(filePath: string | undefined, settings: () => FormatOptions): FormatOptions {
  return (filePath ? resolveConfig(filePath) : null) ?? settings();
}

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
