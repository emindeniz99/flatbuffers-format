#!/usr/bin/env node
// Bundle the extension into a single CommonJS file for the .vsix.
//
// Why bundle at all: `.vscodeignore` keeps `node_modules/**` out of the
// package, but `src/format.ts` imports the `flatbuffers-format` engine at
// runtime. Shipping the unbundled output would package an extension that
// throws `Cannot find module 'flatbuffers-format'` on first activation.
// esbuild inlines the engine (and its only dependency, antlr4ng — both are
// plain, browser-safe ESM with no dynamic require, no __dirname asset
// loading, no native addon and no WASM), so the .vsix is self-contained.
//
// Why CommonJS, and why the `.cjs` extension: the extension host loads the
// `main` entry with `require()`. package.json declares `"type": "module"`
// (the source and the test build are ESM), so a `dist/*.js` output would be
// interpreted as ESM — VS Code's own entry-point sniffing is literally
// `main.endsWith(".mjs") || (type === "module" && !main.endsWith(".cjs"))`.
// Naming the bundle `.cjs` pins it to CommonJS on every VS Code version,
// including the ones at our `engines.vscode` floor that predate ESM
// extension support entirely.
//
// `vscode` stays external: it is injected by the extension host and has no
// npm package to bundle.

import { build } from "esbuild";

await build({
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  // Matches `engines.node` (>=20); VS Code 1.94 ships Node 20.
  target: "node20",
  external: ["vscode"],
  logLevel: "info",
});
