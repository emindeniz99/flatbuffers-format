// Project config file. The point of `.flatbuffers-format.json` is that
// the CLI, CI and every editor plugin resolve the same options for the
// same file, so these tests pin the lookup (nearest file wins), the
// precedence (flags > file > defaults) and the strict validation.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ConfigError, loadConfig, resolveConfig } from "../src/config.js";
import { VERSION } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = join(here, "..", "src", "cli.js");

const UGLY = "enum E:byte{A,B}\n";
const COMPACT_2 = "enum E: byte { A, B }\n";
const EXPANDED_4 = "enum E: byte {\n    A,\n    B,\n}\n";
const EXPANDED_TAB = "enum E: byte {\n\tA,\n\tB,\n}\n";

// root/.flatbuffers-format.json        indent 4, never compact
// root/a/x.fbs                          → inherits root's file
// root/a/b/.flatbuffers-format.json    tabs, never compact
// root/a/b/y.fbs                        → nearest file wins, not merged
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "fbs-config-"));
  mkdirSync(join(root, "a", "b"), { recursive: true });
  writeFileSync(
    join(root, ".flatbuffers-format.json"),
    JSON.stringify({ indent: 4, compactSingleLine: false }),
  );
  writeFileSync(
    join(root, "a", "b", ".flatbuffers-format.json"),
    JSON.stringify({ useTabs: true, indent: 1, compactSingleLine: false }),
  );
  writeFileSync(join(root, "a", "x.fbs"), UGLY);
  writeFileSync(join(root, "a", "b", "y.fbs"), UGLY);
  return root;
}

function cli(args: string[], opts: { input?: string; cwd?: string } = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8", ...opts });
}

test("resolveConfig: the nearest config file wins and files are not merged", () => {
  const root = fixture();
  assert.deepEqual(resolveConfig(join(root, "a", "x.fbs")), { indent: 4, compactSingleLine: false });
  // y.fbs's own file has no `indent: 4`; the parent's must not leak in.
  assert.deepEqual(resolveConfig(join(root, "a", "b", "y.fbs")), {
    useTabs: true,
    indent: 1,
    compactSingleLine: false,
  });
  // The schema need not exist: editors resolve options for unsaved buffers.
  assert.deepEqual(resolveConfig(join(root, "a", "b", "unsaved.fbs"))?.useTabs, true);
});

test("minVersion rejects an older engine and is not a format option", () => {
  const dir = mkdtempSync(join(tmpdir(), "fbs-config-min-"));
  const file = join(dir, ".flatbuffers-format.json");
  const [major, minor, patch] = VERSION.split(".").map(Number) as [number, number, number];
  writeFileSync(file, JSON.stringify({ minVersion: VERSION, indent: 4 }));
  assert.deepEqual(loadConfig(file), { indent: 4 });
  const next = `${major}.${minor}.${patch + 1}`;
  writeFileSync(file, JSON.stringify({ minVersion: next }));
  assert.throws(() => loadConfig(file), (err: Error) =>
    err.message.includes(`needs flatbuffers-format ${next} or newer, but this is ${VERSION}; update it`));
  writeFileSync(file, JSON.stringify({ minVersion: `${major + 1}.0.0` }));
  assert.throws(() => loadConfig(file), /update it/);
  writeFileSync(file, JSON.stringify({ minVersion: "^0.5" }));
  assert.throws(() => loadConfig(file), /"minVersion" must be a version like "0.5.0", got "\^0.5"/);
});

test("VERSION is the package.json version", () => {
  // release-please bumps both; the bundled CLI and minVersion read VERSION.
  const pkg = JSON.parse(readFileSync(join(here, "..", "..", "package.json"), "utf8")) as { version: string };
  assert.equal(VERSION, pkg.version);
  assert.equal(cli(["--version"]).stdout, `flatbuffers-format ${pkg.version}\n`);
});

test("loadConfig rejects unknown keys and wrong types, naming the file and key", () => {
  const dir = mkdtempSync(join(tmpdir(), "fbs-config-bad-"));
  const cases: [string, RegExp][] = [
    ['{"indnt": 2}', /unknown key "indnt" \(allowed: minVersion, indent, .*\)\. If a newer flatbuffers-format added it, update this one/],
    ['{"indent": "4"}', /"indent" must be a non-negative integer, got "4"/],
    ['{"indent": -1}', /"indent" must be a non-negative integer/],
    ['{"lineWidth": 0}', /"lineWidth" must be a positive integer/],
    ['{"maxBlankLines": 1.5}', /"maxBlankLines" must be a non-negative integer/],
    ['{"useTabs": "yes"}', /"useTabs" must be a boolean/],
    ['{"trailingComma": "es5"}', /"trailingComma" must be one of "all", "none", got "es5"/],
    ['{"objectWrap": true}', /"objectWrap" must be one of "preserve", "collapse"/],
    ['{"endOfLine": "cr"}', /"endOfLine" must be one of "lf", "crlf", "auto"/],
    ['{"bracketSpacing": 0}', /"bracketSpacing" must be a boolean/],
    ['{"newline": "\\r\\n"}', /unknown key "newline"/],
    ['{"constructor": 1}', /unknown key "constructor"/],
    ['{"__proto__": 1}', /unknown key "__proto__"/],
    ["[]", /must contain a JSON object/],
    ["{indent: 2}", /invalid JSON/],
  ];
  for (const [text, message] of cases) {
    const file = join(dir, "c.json");
    writeFileSync(file, text);
    assert.throws(
      () => loadConfig(file),
      (err: unknown) =>
        err instanceof ConfigError &&
        err.file === file &&
        err.message.startsWith(`${file}: `) &&
        message.test(err.message),
      text,
    );
  }
});

test("CLI: each file uses its nearest config", () => {
  const root = fixture();
  assert.equal(cli([join(root, "a", "x.fbs")]).stdout, EXPANDED_4);
  assert.equal(cli([join(root, "a", "b", "y.fbs")]).stdout, EXPANDED_TAB);
});

test("CLI: flags override the config file, --no-config ignores it", () => {
  const root = fixture();
  const x = join(root, "a", "x.fbs");
  // --indent beats the file's indent 4; the file's compactSingleLine stays.
  assert.equal(cli(["--indent", "2", x]).stdout, "enum E: byte {\n  A,\n  B,\n}\n");
  assert.equal(cli(["--no-config", x]).stdout, COMPACT_2);
});

test("CLI: --config forces one file for every input", () => {
  const root = fixture();
  const forced = join(root, "a", "b", ".flatbuffers-format.json");
  assert.equal(cli(["--config", forced, join(root, "a", "x.fbs")]).stdout, EXPANDED_TAB);
  const r = cli(["--config", forced, "--no-config", join(root, "a", "x.fbs")]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /mutually exclusive/);
});

test("CLI: stdin looks up the config from --stdin-filepath, else the working directory", () => {
  const root = fixture();
  const viaPath = cli(["--stdin-filepath", join(root, "a", "b", "z.fbs"), "-"], { input: UGLY });
  assert.equal(viaPath.stdout, EXPANDED_TAB);
  const viaCwd = cli(["-"], { input: UGLY, cwd: join(root, "a") });
  assert.equal(viaCwd.stdout, EXPANDED_4);
});

test("CLI: --check, --diff and --write honor the config", () => {
  const root = fixture();
  const x = join(root, "a", "x.fbs");
  writeFileSync(x, EXPANDED_4);
  // Canonical under the config, so not "unformatted" — although it would
  // be under the defaults.
  assert.equal(cli(["--check", x]).status, 0);
  assert.equal(cli(["--diff", x]).status, 0);
  assert.equal(cli(["--check", "--no-config", x]).status, 1);

  writeFileSync(x, UGLY);
  assert.equal(cli(["--write", x]).status, 0);
  assert.equal(readFileSync(x, "utf8"), EXPANDED_4);
});

test("CLI: an invalid config for a later file stops --write before any file changes", () => {
  const root = fixture();
  writeFileSync(join(root, "a", "b", ".flatbuffers-format.json"), '{"indnt": 4}');
  const x = join(root, "a", "x.fbs"); // valid config, needs formatting
  const y = join(root, "a", "b", "y.fbs"); // invalid config
  const r = cli(["--write", x, y]);
  assert.equal(r.status, 2);
  assert.equal(readFileSync(x, "utf8"), UGLY, "earlier file left untouched");
  assert.equal(readFileSync(y, "utf8"), UGLY);
});

test("CLI: an invalid config exits 2, names the file and key, and writes nothing", () => {
  const root = fixture();
  const bad = join(root, "a", "b", ".flatbuffers-format.json");
  writeFileSync(bad, '{"indent": 4, "lineWidht": 100}');
  const y = join(root, "a", "b", "y.fbs");
  const r = cli(["--write", y]);
  assert.equal(r.status, 2);
  assert.ok(r.stderr.includes(bad), r.stderr);
  assert.match(r.stderr, /unknown key "lineWidht"/);
  assert.equal(readFileSync(y, "utf8"), UGLY);
});
