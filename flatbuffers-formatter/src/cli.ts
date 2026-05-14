#!/usr/bin/env node
// CLI wrapper around `format()`. Node-only — the core stays in
// src/index.ts and src/{lexer,parser,printer}.ts so it can run in a
// browser.

import { readFileSync, writeFileSync, statSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { format } from "./index.js";

type Mode = "stdout" | "write" | "check";

type Args = {
  mode: Mode;
  indent: number;
  paths: string[];
  fromStdin: boolean;
};

const USAGE = `flatbuffers-format — FlatBuffers (.fbs) schema formatter

Usage:
  flatbuffers-format [options] <file...>        # print formatted output to stdout
  flatbuffers-format --write <file...>          # rewrite files in place
  flatbuffers-format --check <file...>          # exit non-zero if any file is unformatted
  flatbuffers-format fix <file...>              # alias for --write
  cat foo.fbs | flatbuffers-format -            # read source from stdin

Options:
  -w, --write           Rewrite files in place
  -c, --check           Check formatting; exit 1 on diff
      --indent <n>      Spaces per indent level (default: 2)
  -h, --help            Show this message

Directories are recursed; only files ending in .fbs are processed.`;

function parseArgs(argv: string[]): Args {
  const args: Args = {
    mode: "stdout",
    indent: 2,
    paths: [],
    fromStdin: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-h" || a === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else if (a === "-w" || a === "--write" || a === "fix") {
      args.mode = "write";
    } else if (a === "-c" || a === "--check") {
      args.mode = "check";
    } else if (a === "--indent") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 0) {
        console.error(`flatbuffers-format: --indent expects a non-negative integer`);
        process.exit(2);
      }
      args.indent = n;
    } else if (a === "-") {
      args.fromStdin = true;
    } else if (a.startsWith("-")) {
      console.error(`flatbuffers-format: unknown option '${a}'`);
      process.exit(2);
    } else {
      args.paths.push(a);
    }
  }
  return args;
}

function expandPaths(paths: string[]): string[] {
  const out: string[] = [];
  for (const p of paths) {
    const abs = resolve(p);
    let st;
    try {
      st = statSync(abs);
    } catch {
      console.error(`flatbuffers-format: cannot stat '${p}'`);
      process.exit(2);
    }
    if (st.isDirectory()) {
      walk(abs, out);
    } else if (st.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

// Directories to skip when recursing — anything that's clearly not
// a place users keep source `.fbs` files. Symlinks are not followed.
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  ".cache",
]);

function walk(dir: string, out: string[]) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // unreadable directory; skip silently
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && extname(entry.name) === ".fbs") {
      out.push(full);
    }
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const opts = { indent: args.indent };

  if (args.fromStdin) {
    const src = await readStdin();
    try {
      const out = format(src, opts);
      process.stdout.write(out);
    } catch (err) {
      console.error(`flatbuffers-format: ${(err as Error).message}`);
      process.exit(1);
    }
    return;
  }

  if (args.paths.length === 0) {
    console.error(USAGE);
    process.exit(2);
  }

  const files = expandPaths(args.paths);
  if (files.length === 0) {
    console.error(`flatbuffers-format: no .fbs files found`);
    process.exit(2);
  }

  let unformatted = 0;
  let failed = 0;

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    let out: string;
    try {
      out = format(src, opts);
    } catch (err) {
      console.error(`flatbuffers-format: ${file}: ${(err as Error).message}`);
      failed++;
      continue;
    }

    if (args.mode === "stdout") {
      process.stdout.write(out);
    } else if (args.mode === "write") {
      if (out !== src) {
        writeFileSync(file, out);
        console.error(`formatted ${file}`);
      }
    } else if (args.mode === "check") {
      if (out !== src) {
        console.error(`unformatted: ${file}`);
        unformatted++;
      }
    }
  }

  if (failed > 0) process.exit(1);
  if (args.mode === "check" && unformatted > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`flatbuffers-format: ${err.stack || err}`);
  process.exit(1);
});
