// Pure helpers for turning a FormatError + source string into an
// IDE-link-friendly error report. No IO, no color, no Node deps —
// trivially unit-testable.

import { FormatError } from "./index.js";

/**
 * Build a multi-line error report with source-snippet context.
 *
 * Output shape:
 * ```
 * flatbuffers-format: path/to/file.fbs:12:4: no viable alternative at 'foo'
 *
 *    10 |   x: int;
 *    11 |   y: string;
 *  > 12 |   foo bar baz;
 *       |       ^
 *    13 |   z: bool;
 * ```
 *
 * - `filePath` may be `<stdin>` for stdin mode.
 * - 1-based line and column in the leader line; the column is the
 *   FormatError's `.column` (0-based) + 1, matching most IDE
 *   click-to-jump conventions.
 * - Two lines of context above and two below, clamped at file edges.
 */
export function renderParseError(
  filePath: string,
  source: string,
  err: FormatError,
  contextLines = 2,
): string {
  const line1 = err.line; // 1-based
  const col1 = err.column + 1; // 0-based → 1-based for display
  const header = `flatbuffers-format: ${filePath}:${line1}:${col1}: ${err.message.replace(/^line \d+:\d+ /, "")}`;

  // Split preserving trailing-newline semantics; if the offending line
  // is past the actual line count (rare but possible — e.g. error at
  // EOF after a missing closing brace), show what we have without crashing.
  const lines = source.split("\n");
  const totalLines = lines.length;
  const start = Math.max(1, line1 - contextLines);
  const end = Math.min(totalLines, line1 + contextLines);

  const gutterWidth = String(end).length;
  const out: string[] = [header, ""];
  for (let n = start; n <= end; n++) {
    const text = lines[n - 1] ?? "";
    const marker = n === line1 ? ">" : " ";
    const gutter = String(n).padStart(gutterWidth, " ");
    out.push(` ${marker} ${gutter} | ${text}`);
    if (n === line1) {
      // Caret-line padding mirrors the offending-line gutter shape
      // ` > ${gutter} | ` so the `^` lands in the same column as the
      // intended character: 1 leading + 1 marker + 1 + gutterWidth + 1
      // + "|" + 1 = `gutterWidth + 5` chars before the text column.
      const padding = " ".repeat(gutterWidth) + "    | ";
      const caretIndent = " ".repeat(Math.max(0, col1 - 1));
      out.push(padding + caretIndent + "^");
    }
  }
  return out.join("\n");
}
