#!/usr/bin/env node
// Compare a fresh bench.mjs --json payload against scripts/bench-baseline.json.
//
// Usage:
//   node scripts/bench.mjs --json --repeat 3 | node scripts/bench-compare.mjs
//   node scripts/bench-compare.mjs bench-current.json
//
// Output (stdout): a Markdown table with baseline / current / % change /
// status per metric. Suitable for posting as a PR comment.
//
// Exit codes:
//   0 — no metric regressed beyond its tolerance
//   2 — at least one metric regressed (CI gate fails)
//
// Tolerances (per project spec — generous because GitHub-hosted runners
// vary by ~20% from cold cache to hot cache):
//   in_process.us_per_call          +25% slower  = regression
//   cold_start_cli.median_ms        +30% slower  = regression
//   bundle.min_gz_bytes             +15% larger  = regression
//
// Improvements (negative deltas) never fail the gate.
//
// To legitimately accept slower numbers, re-baseline locally:
//   npm run bench -- --json --repeat 3 > scripts/bench-baseline.json
// (strip the `node` and `commit` fields the bench prints — they're
// volatile and not used by this script anyway.)

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const baselinePath = resolve(here, "bench-baseline.json");

// The metrics we gate on. `lower_is_better: true` means a +ve delta is bad.
const METRICS = [
  {
    label: "in-process µs/file",
    path: ["in_process", "us_per_call"],
    unit: "µs",
    lower_is_better: true,
    regress_pct: 25,
  },
  {
    label: "cold-start CLI median",
    path: ["cold_start_cli", "median_ms"],
    unit: "ms",
    lower_is_better: true,
    regress_pct: 30,
  },
  {
    label: "bundle min+gz",
    path: ["bundle", "min_gz_bytes"],
    unit: "B",
    lower_is_better: true,
    regress_pct: 15,
  },
];

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const current = await loadCurrent();

let anyRegressed = false;
const rows = METRICS.map((m) => {
  const b = pluck(baseline, m.path);
  const c = pluck(current, m.path);
  const deltaPct = ((c - b) / b) * 100;
  // `lower_is_better` is true for all 3 metrics, but kept explicit so
  // adding a "higher is better" metric later (e.g. files_per_sec) is a
  // one-line change.
  const regressed = m.lower_is_better ? deltaPct > m.regress_pct : -deltaPct > m.regress_pct;
  let status;
  if (regressed) {
    status = "FAIL";
    anyRegressed = true;
  } else if ((m.lower_is_better ? -deltaPct : deltaPct) > 5) {
    // >5% improvement is worth highlighting.
    status = "PASS+";
  } else {
    status = "PASS";
  }
  return { m, b, c, deltaPct, status };
});

// --- markdown table ---------------------------------------------------------

const lines = [];
lines.push("<!-- perf-regression-report -->");
lines.push("### flatbuffers-format performance report");
lines.push("");
lines.push("| Metric | Baseline | Current | Δ% | Status |");
lines.push("|---|---:|---:|---:|:---:|");
for (const { m, b, c, deltaPct, status } of rows) {
  const arrow = status === "FAIL" ? "FAIL" : status === "PASS+" ? "PASS (improved)" : "PASS";
  const sign = deltaPct > 0 ? "+" : "";
  lines.push(
    `| ${m.label} | ${fmt(b, m.unit)} | ${fmt(c, m.unit)} | ${sign}${deltaPct.toFixed(1)}% | ${arrow} |`,
  );
}
lines.push("");
lines.push(
  `Tolerances: in-process µs/file +${METRICS[0].regress_pct}%, cold-start median +${METRICS[1].regress_pct}%, bundle min+gz +${METRICS[2].regress_pct}%. Improvements never fail the gate.`,
);
if (current.node || current.commit) {
  lines.push("");
  lines.push(`Run: node ${current.node ?? "?"} · commit ${current.commit ?? "?"}`);
}
if (anyRegressed) {
  lines.push("");
  lines.push(
    "**A metric regressed beyond tolerance.** If this is intentional (e.g. correctness fix worth the cost), re-baseline with `npm run bench -- --json --repeat 3 > scripts/bench-baseline.json` and commit the new baseline in the same PR with a body explaining the tradeoff.",
  );
}

process.stdout.write(`${lines.join("\n")}\n`);
process.exit(anyRegressed ? 2 : 0);

// --- helpers ---------------------------------------------------------------

function pluck(obj, path) {
  return path.reduce((o, k) => o?.[k], obj);
}

function fmt(n, unit) {
  if (unit === "B") return `${n.toLocaleString()} B`;
  if (unit === "ms") return `${n.toFixed(1)} ms`;
  if (unit === "µs") return `${n.toFixed(1)} µs`;
  return `${n}`;
}

async function loadCurrent() {
  // Path arg wins; otherwise read stdin.
  const arg = process.argv[2];
  if (arg) return JSON.parse(readFileSync(arg, "utf8"));
  let buf = "";
  for await (const chunk of process.stdin) buf += chunk;
  if (!buf.trim()) {
    process.stderr.write(
      "bench-compare: no input. Pipe bench.mjs --json output or pass a path arg.\n",
    );
    process.exit(1);
  }
  return JSON.parse(buf);
}
