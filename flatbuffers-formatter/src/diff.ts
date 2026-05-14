// Tiny unified-diff implementation. Pure function, no deps.
//
// Why inline rather than a dep: keeping the package zero-runtime-dep
// (besides antlr4ng) is a stated goal. The diff doesn't need to be
// elegant — the formatter's whole-file output is what's compared, so
// edits per file are usually 0–20 lines. A straightforward LCS over
// line arrays produces correct unified-diff output and runs in
// O(n·m) time. n·m is small here.

type Op = { kind: "equal" | "del" | "add"; line: string };

function lcsOps(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  // dp[i][j] = LCS length of a[i..] and b[j..]
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i]![j]! = dp[i + 1]![j + 1]! + 1;
      else dp[i]![j]! = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: "equal", line: a[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push({ kind: "del", line: a[i]! });
      i++;
    } else {
      ops.push({ kind: "add", line: b[j]! });
      j++;
    }
  }
  while (i < n) ops.push({ kind: "del", line: a[i++]! });
  while (j < m) ops.push({ kind: "add", line: b[j++]! });
  return ops;
}

// Group ops into hunks with `context` lines of equal-line context on
// each side. Returns an array of hunk-objects with header coords and
// the lines (each prefixed with " ", "-", or "+").
type Hunk = { aStart: number; aLen: number; bStart: number; bLen: number; lines: string[] };

function buildHunks(ops: Op[], context: number): Hunk[] {
  const hunks: Hunk[] = [];
  let aLine = 1;
  let bLine = 1;
  let i = 0;
  while (i < ops.length) {
    // Skip leading equal runs.
    while (i < ops.length && ops[i]!.kind === "equal") {
      aLine++;
      bLine++;
      i++;
    }
    if (i >= ops.length) break;
    // Found a change. Back up `context` equal lines for the prefix.
    let pre = 0;
    while (pre < context && i - pre - 1 >= 0 && ops[i - pre - 1]!.kind === "equal") pre++;
    const hunkAStart = aLine - pre;
    const hunkBStart = bLine - pre;
    const lines: string[] = [];
    for (let k = i - pre; k < i; k++) lines.push(" " + ops[k]!.line);
    // Consume changes + interleaved equal runs up to `context` size.
    let aLen = pre;
    let bLen = pre;
    while (i < ops.length) {
      const op = ops[i]!;
      if (op.kind === "del") {
        lines.push("-" + op.line);
        aLine++;
        aLen++;
        i++;
      } else if (op.kind === "add") {
        lines.push("+" + op.line);
        bLine++;
        bLen++;
        i++;
      } else {
        // Equal run inside hunk: keep up to 2*context, then check whether
        // the run is long enough to split into separate hunks.
        let runStart = i;
        while (i < ops.length && ops[i]!.kind === "equal") i++;
        const runLen = i - runStart;
        if (runLen >= 2 * context + 1) {
          // Take `context` lines, end this hunk, the rest will start a new one.
          for (let k = 0; k < context; k++) {
            lines.push(" " + ops[runStart + k]!.line);
            aLine++;
            bLine++;
            aLen++;
            bLen++;
          }
          // Rewind so the next iteration of the outer loop sees the remaining run.
          i = runStart + context;
          break;
        }
        // Otherwise the whole run is part of this hunk.
        for (let k = 0; k < runLen; k++) {
          lines.push(" " + ops[runStart + k]!.line);
          aLine++;
          bLine++;
          aLen++;
          bLen++;
        }
      }
    }
    hunks.push({ aStart: hunkAStart, aLen, bStart: hunkBStart, bLen, lines });
  }
  return hunks;
}

/**
 * Generate a unified-diff string suitable for printing to a terminal
 * or piping into `patch`. `aText` and `bText` are the old and new file
 * contents. `aPath` and `bPath` are header path labels (typically
 * `a/<file>` and `b/<file>`). Returns the empty string when the two
 * texts are identical — caller can branch on that.
 */
export function unifiedDiff(
  aPath: string,
  bPath: string,
  aText: string,
  bText: string,
  context = 3,
): string {
  if (aText === bText) return "";
  // Split keeping trailing-newline semantics. We don't bother with the
  // "\ No newline at end of file" marker; both inputs to the formatter
  // always end in \n by construction.
  const a = aText.split("\n");
  const b = bText.split("\n");
  // .split("\n") leaves a trailing "" if the text ends in "\n"; drop it
  // for the diff so we don't show a phantom empty line, but the line
  // counts in the header still reflect the original size.
  if (a[a.length - 1] === "") a.pop();
  if (b[b.length - 1] === "") b.pop();
  const ops = lcsOps(a, b);
  const hunks = buildHunks(ops, context);
  const out: string[] = [`--- ${aPath}`, `+++ ${bPath}`];
  for (const h of hunks) {
    const aRange = h.aLen === 1 ? `${h.aStart}` : `${h.aStart},${h.aLen}`;
    const bRange = h.bLen === 1 ? `${h.bStart}` : `${h.bStart},${h.bLen}`;
    out.push(`@@ -${aRange} +${bRange} @@`);
    out.push(...h.lines);
  }
  return out.join("\n") + "\n";
}
