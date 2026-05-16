#!/usr/bin/env node
// Node-only CLI. The `format()` core in ./index.ts is browser-safe;
// this file adds filesystem/stdin handling, diffing, and pretty
// parse-error reporting on top.

import {
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  existsSync,
  type Dirent,
  type Stats,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, extname } from "node:path";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import { FormatError, format, type FormatOptions } from "./index.js";
import { unifiedDiff } from "./diff.js";
import { renderParseError } from "./error-render.js";

type Mode = "stdout" | "write" | "check" | "diff";

const USAGE = `flatbuffers-format — FlatBuffers (.fbs) schema formatter (ANTLR-backed)

Usage:
  flatbuffers-format [options] <file-or-dir...>   # print formatted output to stdout
  flatbuffers-format --write <file-or-dir...>     # rewrite files in place
  flatbuffers-format --check <file-or-dir...>     # exit non-zero if any file is unformatted
  flatbuffers-format --diff  <file-or-dir...>     # print a unified diff for each unformatted file
  flatbuffers-format fix <file-or-dir...>         # alias for --write
  cat foo.fbs | flatbuffers-format -              # read source from stdin

Options:
  -w, --write                 Rewrite files in place
  -c, --check                 Check formatting; exit 1 on diff (no output)
  -d, --diff                  Print a unified diff for each file that would change; exit 1 if any
      --indent <n>            Spaces (or tabs, with --use-tabs) per indent level (default: 2)
      --use-tabs              Indent with tab characters instead of spaces (default: off)
      --line-width <n>        Target column for compact/wrap decisions (default: 80)
      --no-compact-single-line
                              Disable single-line collapsing of small enum/union/single-field bodies
      --max-blank-lines <n>   Max consecutive blank lines kept between decls (default: 1)
      --wrap-comments         Reflow long line comments at whitespace (default: off)
      --comment-width <n>     Wrap column for --wrap-comments (defaults to --line-width)
      --no-gitignore          Don't consult .gitignore when walking directories
  -V, --version               Print version and exit
  -h, --help                  Show this message

Directories are recursed; only files ending in .fbs are processed.
Inside a git repository, .gitignore is respected via \`git ls-files\`
(pass --no-gitignore to disable). Outside a repo, node_modules, .git,
dist, build, out, .next, .turbo, .cache, .hg, .svn are skipped
automatically.`;

function die(msg: string, code = 2): never {
  console.error(`flatbuffers-format: ${msg}`);
  process.exit(code);
}

function reportParseError(filePath: string, source: string, err: unknown): void {
  if (err instanceof FormatError) {
    console.error(renderParseError(filePath, source, err));
  } else {
    console.error(`flatbuffers-format: ${filePath}: ${(err as Error).message}`);
  }
}

// Resolve the package version once at startup. Two paths:
//
//   (a) Regular Node install (`node dist/src/cli.js`, `npx
//       flatbuffers-format`, etc.) — read the sibling package.json
//       via `import.meta.url`. dist/src/cli.js → ../../package.json.
//
//   (b) Bundled distributions (Node SEA native binary, Javy WASM
//       module) — `import.meta.url` doesn't point at a real file
//       and there's no package.json to read. The build tooling
//       injects the version via an esbuild `--define` for
//       `process.env.FLATBUFFERS_FORMAT_VERSION`, replacing the
//       reference with a literal string at build time.
function readPackageVersion(): string {
  const injected = process.env.FLATBUFFERS_FORMAT_VERSION;
  if (injected && injected.length > 0) return injected;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(here, "..", "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
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
    // Skip symlinks: a directory walk should only touch tree-local
    // files the user actually intended to include. A symlink could
    // point outside the tree (or at /etc/passwd) — following it via
    // entry.isFile()/isDirectory() (which DOES resolve the link)
    // would let an attacker who can plant a symlink in a directory
    // we --write into have that file rewritten. Skipping at the walk
    // level matches gofmt / prettier behavior. User-provided paths
    // (handled in expandPaths) still resolve symlinks because the
    // user explicitly typed that path.
    if (entry.isSymbolicLink()) continue;
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
    diff?: boolean;
    indent?: string;
    help?: boolean;
    version?: boolean;
    "no-gitignore"?: boolean;
    "use-tabs"?: boolean;
    "line-width"?: string;
    "no-compact-single-line"?: boolean;
    "max-blank-lines"?: string;
    "wrap-comments"?: boolean;
    "comment-width"?: string;
  };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: process.argv.slice(2),
      options: {
        write: { type: "boolean", short: "w" },
        check: { type: "boolean", short: "c" },
        diff: { type: "boolean", short: "d" },
        indent: { type: "string" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "V" },
        "no-gitignore": { type: "boolean" },
        "use-tabs": { type: "boolean" },
        "line-width": { type: "string" },
        "no-compact-single-line": { type: "boolean" },
        "max-blank-lines": { type: "string" },
        "wrap-comments": { type: "boolean" },
        "comment-width": { type: "string" },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    die((err as Error).message);
  }

  if (values.version) {
    console.log(`flatbuffers-format ${readPackageVersion()}`);
    process.exit(0);
  }

  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const modeFlags = [values.write, values.check, values.diff].filter(Boolean).length;
  if (modeFlags > 1) {
    die("--write, --check, and --diff are mutually exclusive");
  }

  let mode: Mode = "stdout";
  if (values.write) mode = "write";
  else if (values.check) mode = "check";
  else if (values.diff) mode = "diff";

  const indent = values.indent !== undefined ? Number(values.indent) : 2;
  if (!Number.isInteger(indent) || indent < 0) {
    die("--indent expects a non-negative integer");
  }

  const opts: FormatOptions = { indent };

  if (values["use-tabs"]) opts.useTabs = true;

  if (values["line-width"] !== undefined) {
    const n = Number(values["line-width"]);
    if (!Number.isInteger(n) || n < 1) die("--line-width expects a positive integer");
    opts.lineWidth = n;
  }

  if (values["no-compact-single-line"]) opts.compactSingleLine = false;

  if (values["max-blank-lines"] !== undefined) {
    const n = Number(values["max-blank-lines"]);
    if (!Number.isInteger(n) || n < 0) die("--max-blank-lines expects a non-negative integer");
    opts.maxBlankLines = n;
  }

  if (values["wrap-comments"]) opts.wrapComments = true;

  if (values["comment-width"] !== undefined) {
    const n = Number(values["comment-width"]);
    if (!Number.isInteger(n) || n < 1) die("--comment-width expects a positive integer");
    opts.commentWidth = n;
  }

  let fromStdin = false;
  const paths: string[] = [];
  for (const p of positionals) {
    if (p === "-") fromStdin = true;
    else if (p === "fix" && paths.length === 0 && mode === "stdout") mode = "write";
    else paths.push(p);
  }

  if (fromStdin) {
    const src = await readStdin();
    let out: string;
    try {
      out = format(src, opts);
    } catch (err) {
      reportParseError("<stdin>", src, err);
      process.exit(1);
    }
    if (mode === "diff") {
      if (out !== src) {
        process.stdout.write(unifiedDiff("a/<stdin>", "b/<stdin>", src, out));
        process.exit(1);
      }
      process.exit(0);
    }
    if (mode === "check") {
      process.exit(out !== src ? 1 : 0);
    }
    process.stdout.write(out);
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
      reportParseError(file, src, err);
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
    } else if (mode === "diff") {
      if (out !== src) {
        process.stdout.write(unifiedDiff(`a/${file}`, `b/${file}`, src, out));
        unformatted++;
      }
    }
  }

  if (failed > 0) process.exit(1);
  if ((mode === "check" || mode === "diff") && unformatted > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`flatbuffers-format: ${err.stack || err}`);
  process.exit(1);
});
