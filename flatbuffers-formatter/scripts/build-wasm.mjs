#!/usr/bin/env node
// Build a portable `flatbuffers-format.wasm` via Javy
// (https://github.com/bytecodealliance/javy). The resulting single
// `.wasm` is a WASI module: hand it to wasmtime/wasmer/any WASI host
// and it reads `.fbs` on stdin, writes formatted output on stdout.
//
//   wasmtime flatbuffers-format.wasm < schema.fbs > schema.formatted.fbs
//   wasmer run flatbuffers-format.wasm < schema.fbs
//
// Why this exists:
//   - Non-Node runtimes: build tools written in Rust/Go/Python can
//     embed the formatter via wasmtime-py / wasmer-rs / wazero, no
//     Node install.
//   - Sandboxed environments: Cloudflare Workers Pages plugins,
//     Vercel Edge, Deno Deploy can run WASM modules without giving
//     them filesystem access — the formatter is pure-text-in,
//     pure-text-out, so the sandbox suits us perfectly.
//   - Reproducibility: a single 1–2 MB .wasm hash is the entire
//     formatter; no transitive npm deps to vet.
//
// Why Javy:
//   - Embeds QuickJS-compiled-to-WASM. Doesn't require rewriting the
//     engine in AssemblyScript or Rust.
//   - Maintained by the Bytecode Alliance.
//   - Officially supports Node-style stdin/stdout IO via WASI's
//     `wasi_snapshot_preview1`.
//
// Local usage:
//   cd projects/flatbuffers-formatter
//   npm run build                     # produce dist/
//   node scripts/build-wasm.mjs       # writes build/wasm/flatbuffers-format.wasm
//   wasmtime build/wasm/flatbuffers-format.wasm < test/corpus/01-monster.fbs

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(here, "..");
const outDir = join(projectDir, "build", "wasm");

const cliEntry = join(projectDir, "dist", "src", "index.js");
if (!existsSync(cliEntry)) {
  console.error("dist/src/index.js not found. Run `npm run build` first.");
  process.exit(1);
}

const javyPath = process.env.JAVY ?? "javy";
const javyCheck = spawnSync(javyPath, ["--version"], { encoding: "utf8" });
if (javyCheck.status !== 0) {
  console.error(
    "javy binary not found. Install from https://github.com/bytecodealliance/javy/releases\n" +
      "or set JAVY=/path/to/javy. (The CI workflow downloads it automatically.)",
  );
  process.exit(1);
}
console.log(`Using javy: ${javyCheck.stdout.trim()}`);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// --- 1. Write a stdin/stdout wrapper around format() -----------------------
// Javy turns `console.log` into stdout writes and `readSync(0, …)` into a
// stdin pull. The wrapper:
//   1. read all of stdin (filename is ignored)
//   2. call format(text)
//   3. console.log(out) — Javy turns this into a single write to stdout
// Errors print to stderr and exit code 1.

const wrapperPath = join(outDir, "wrapper.mjs");
writeFileSync(
  wrapperPath,
  `import { format } from "${cliEntry.replaceAll("\\", "/")}";

// Javy's QuickJS-on-WASM doesn't ship Node's fs/process modules.
// stdin/stdout/stderr are exposed as global IO functions:
//   Javy.IO.readSync(fd, buffer)  → bytes read
//   Javy.IO.writeSync(fd, buffer) → bytes written
// We read all of stdin in 4 KiB chunks, run format(), write stdout.

function readAllStdin() {
  const chunks = [];
  const buf = new Uint8Array(4096);
  while (true) {
    const n = Javy.IO.readSync(0, buf);
    if (n <= 0) break;
    chunks.push(buf.slice(0, n));
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.length;
  }
  return new TextDecoder("utf-8").decode(merged);
}

function writeStdout(s) {
  Javy.IO.writeSync(1, new TextEncoder().encode(s));
}

function writeStderr(s) {
  Javy.IO.writeSync(2, new TextEncoder().encode(s));
}

const input = readAllStdin();
try {
  writeStdout(format(input));
} catch (e) {
  writeStderr("flatbuffers-format.wasm: parse error: " + (e && e.message || e) + "\\n");
  // Javy has no process.exit; throwing surfaces as a wasm trap which
  // wasmtime maps to exit code 134 (SIGABRT). For a clean non-zero
  // exit code, callers can use \`wasmtime --invoke\` patterns or wrap
  // the .wasm in their own runner.
  throw e;
}
`,
);

// --- 2. Bundle the wrapper + engine into a single CJS file -----------------
// Javy wants a single file with no imports; esbuild --bundle gives us
// that. Target=es2022 because Javy's QuickJS supports ES2022 syntax.

const bundlePath = join(outDir, "bundle.js");
console.log("Bundling with esbuild...");
const esb = spawnSync(
  "npx",
  [
    "--yes",
    "esbuild",
    wrapperPath,
    "--bundle",
    "--platform=node",
    // Javy's embedded QuickJS doesn't accept the ES2022 public class
    // field declaration syntax — specifically chokes on declarations
    // whose name matches a reserved-in-some-contexts identifier
    // (`set`, `get`). antlr4ng uses `set` as a field. Targeting
    // es2019 makes esbuild lower the field declaration to a plain
    // `this.set = undefined` assignment inside the constructor,
    // which QuickJS handles fine.
    "--target=es2019",
    // ESM, not CJS — Javy 5 supports ECMAScript modules natively
    // but doesn't provide a `require` shim, so a CJS bundle from
    // esbuild crashes at "`require` is not defined" in any code
    // path that touches Node built-ins.
    "--format=esm",
    "--outfile=" + bundlePath,
    // Drop banner — Javy doesn't want a shebang and treats the file as raw JS.
    "--banner:js=",
  ],
  { stdio: "inherit", shell: process.platform === "win32" },
);
if (esb.status !== 0) {
  console.error("esbuild failed");
  process.exit(esb.status ?? 1);
}

// --- 3. javy compile -------------------------------------------------------

const wasmPath = join(outDir, "flatbuffers-format.wasm");
console.log("Running javy compile...");
const jav = spawnSync(
  javyPath,
  ["build", "-o", wasmPath, bundlePath],
  { stdio: "inherit" },
);
if (jav.status !== 0) {
  // older Javy CLI used `compile` instead of `build`
  console.warn("javy build failed, retrying with `javy compile` (older CLI)...");
  const jav2 = spawnSync(
    javyPath,
    ["compile", bundlePath, "-o", wasmPath],
    { stdio: "inherit" },
  );
  if (jav2.status !== 0) {
    console.error("javy failed under both `build` and `compile` invocations");
    process.exit(jav2.status ?? 1);
  }
}

const size = statSync(wasmPath).size;
console.log(`\nDone. ${wasmPath} (${(size / 1024 / 1024).toFixed(2)} MiB)`);
console.log(`Test:   echo 'table T { x: int; }' | wasmtime ${wasmPath}`);
