#!/usr/bin/env node
// Node-only CLI. The `format()` core in ./index.ts is browser-safe;
// this file adds filesystem/stdin handling on top.

import {
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  existsSync,
  type Dirent,
  type Stats,
} from "node:fs";
import { join, resolve, extname } from "node:path";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import { format } from "./index.js";

type Mode = "stdout" | "write" | "check";

const USAGE = `flatbuffers-format — FlatBuffers (.fbs) schema formatter (ANTLR-backed)

Usage:
  flatbuffers-format [options] <file-or-dir...>   # print formatted output to stdout
  flatbuffers-format --write <file-or-dir...>     # rewrite files in place
  flatbuffers-format --check <file-or-dir...>     # exit non-zero if any file is unformatted
  flatbuffers-format fix <file-or-dir...>         # alias for --write
  cat foo.fbs | flatbuffers-format -              # read source from stdin

Options:
  -w, --write           Rewrite files in place
  -c, --check           Check formatting; exit 1 on diff
      --indent <n>      Spaces per indent level (default: 2)
      --no-gitignore    Don't consult .gitignore when walking directories
  -h, --help            Show this message

Directories are recursed; only files ending in .fbs are processed.
Inside a git repository, .gitignore is respected via \`git ls-files\`
(pass --no-gitignore to disable). Outside a repo, node_modules, .git,
dist, build, out, .next, .turbo, .cache, .hg, .svn are skipped
automatically.`;

function die(msg: string, code = 2): never {
  console.error(`flatbuffers-format: ${msg}`);
  process.exit(code);
}

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
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && extname(entry.name) === ".fbs") {
      out.push(full);
    }
  }
}

function gitListFbs(dir: string): string[] | null {
  try {
    const stdout = execFileSync(
      "git",
      ["-C", dir, "ls-files", "-z",
       "--cached", "--others", "--exclude-standard"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return stdout
      .split("\0")
      .filter((f) => f && extname(f) === ".fbs")
      .map((f) => resolve(dir, f))
      .filter(existsSync);
  } catch {
    return null;
  }
}

function expandPaths(paths: string[], useGitignore: boolean): string[] {
  const out: string[] = [];
  for (const p of paths) {
    const abs = resolve(p);
    let st: Stats;
    try {
      st = statSync(abs);
    } catch {
      die(`cannot stat '${p}'`);
    }
    if (st.isDirectory()) {
      const fromGit = useGitignore ? gitListFbs(abs) : null;
      if (fromGit) out.push(...fromGit);
      else walk(abs, out);
    } else if (st.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  let values: {
    write?: boolean;
    check?: boolean;
    indent?: string;
    help?: boolean;
    "no-gitignore"?: boolean;
  };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: process.argv.slice(2),
      options: {
        write: { type: "boolean", short: "w" },
        check: { type: "boolean", short: "c" },
        indent: { type: "string" },
        help: { type: "boolean", short: "h" },
        "no-gitignore": { type: "boolean" },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    die((err as Error).message);
  }

  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }

  if (values.write && values.check) {
    die("--write and --check are mutually exclusive");
  }

  let mode: Mode = "stdout";
  if (values.write) mode = "write";
  else if (values.check) mode = "check";

  const indent = values.indent !== undefined ? Number(values.indent) : 2;
  if (!Number.isInteger(indent) || indent < 0) {
    die("--indent expects a non-negative integer");
  }
  const opts = { indent };

  let fromStdin = false;
  const paths: string[] = [];
  for (const p of positionals) {
    if (p === "-") fromStdin = true;
    else if (p === "fix" && paths.length === 0 && mode === "stdout") mode = "write";
    else paths.push(p);
  }

  if (fromStdin) {
    const src = await readStdin();
    try {
      process.stdout.write(format(src, opts));
    } catch (err) {
      die((err as Error).message, 1);
    }
    return;
  }

  if (paths.length === 0) {
    console.error(USAGE);
    process.exit(2);
  }

  const useGitignore = !values["no-gitignore"];
  const files = expandPaths(paths, useGitignore);
  if (files.length === 0) die("no .fbs files found");

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

    if (mode === "stdout") {
      process.stdout.write(out);
    } else if (mode === "write") {
      if (out !== src) {
        writeFileSync(file, out);
        console.error(`formatted ${file}`);
      }
    } else if (mode === "check") {
      if (out !== src) {
        console.error(`unformatted: ${file}`);
        unformatted++;
      }
    }
  }

  if (failed > 0) process.exit(1);
  if (mode === "check" && unformatted > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`flatbuffers-format: ${err.stack || err}`);
  process.exit(1);
});
