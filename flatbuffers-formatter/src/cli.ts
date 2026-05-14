#!/usr/bin/env node
// CLI wrapper around `format()`. Node-only — the core stays in
// src/index.ts and src/{lexer,parser,printer}.ts so it can run in a
// browser.

import { readFileSync, writeFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import { format } from "./index.js";

type Mode = "stdout" | "write" | "check";

const USAGE = `flatbuffers-format-handrolled — FlatBuffers (.fbs) schema formatter

Usage:
  flatbuffers-format-handrolled [options] <file-or-dir...>   # print formatted output to stdout
  flatbuffers-format-handrolled --write <file-or-dir...>     # rewrite files in place
  flatbuffers-format-handrolled --check <file-or-dir...>     # exit non-zero if any file is unformatted
  flatbuffers-format-handrolled fix <file-or-dir...>         # alias for --write
  cat foo.fbs | flatbuffers-format-handrolled -              # read source from stdin

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
  console.error(`flatbuffers-format-handrolled: ${msg}`);
  process.exit(code);
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
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && extname(entry.name) === ".fbs") {
      out.push(full);
    }
  }
}

// When the directory is inside a git work tree, ask git itself which
// files are not ignored. Returns null if `dir` isn't in a repo or git
// isn't available — caller should fall back to `walk()`.
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
      .filter(existsSync); // skip staged-deleted files
  } catch {
    return null;
  }
}

function expandPaths(paths: string[], useGitignore: boolean): string[] {
  const out: string[] = [];
  for (const p of paths) {
    const abs = resolve(p);
    let st;
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
      // Explicit file paths always processed — gitignore only filters
      // directory walks.
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

  // Positional handling: `-` means stdin, `fix` is an alias for
  // --write when it appears as the first positional, everything else
  // is a path.
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
      console.error(`flatbuffers-format-handrolled: ${file}: ${(err as Error).message}`);
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
  console.error(`flatbuffers-format-handrolled: ${err.stack || err}`);
  process.exit(1);
});
