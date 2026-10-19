// Project config file: `.flatbuffers-format.json`. Node-only (it reads
// the filesystem), so it is a separate entry point —
// `flatbuffers-format/config` — and ./index.ts stays browser-safe.
//
// A team commits the file once; the CLI, CI and the editor plugins all
// resolve options from it the same way, instead of each developer
// passing flags or configuring their IDE by hand.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { FormatOptions } from "./printer.js";

/** The config file name looked up next to, and above, each schema. */
export const CONFIG_FILE_NAME = ".flatbuffers-format.json";

/**
 * Thrown when a config file cannot be read, is not valid JSON, has a
 * key that is not a format option, or has a value of the wrong type.
 * `file` is the config file's path.
 */
export class ConfigError extends Error {
  constructor(public readonly file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = "ConfigError";
  }
}

type Check = (v: unknown) => boolean;
const isBool: Check = (v) => typeof v === "boolean";
const isInt = (min: number): Check => (v) => Number.isInteger(v) && (v as number) >= min;
const oneOf = (...allowed: string[]): [Check, string] => [
  (v) => allowed.includes(v as string),
  `one of ${allowed.map((a) => JSON.stringify(a)).join(", ")}`,
];

// The options a config file may set, with the same bounds the CLI
// flags enforce. `newline` is absent: `endOfLine` sets line endings.
const KEYS: Record<string, [Check, string]> = {
  indent: [isInt(0), "a non-negative integer"],
  useTabs: [isBool, "a boolean"],
  lineWidth: [isInt(1), "a positive integer"],
  compactSingleLine: [isBool, "a boolean"],
  maxBlankLines: [isInt(0), "a non-negative integer"],
  wrapComments: [isBool, "a boolean"],
  commentWidth: [isInt(1), "a positive integer"],
  trailingComma: oneOf("all", "none"),
  objectWrap: oneOf("preserve", "collapse"),
  bracketSpacing: [isBool, "a boolean"],
  endOfLine: oneOf("lf", "crlf", "auto"),
};

/**
 * Read and validate the config file at `file`. Unknown keys and values
 * of the wrong type are rejected rather than ignored, so a typo fails
 * loudly instead of silently formatting with defaults.
 *
 * @throws {ConfigError}
 */
export function loadConfig(file: string): FormatOptions {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (err) {
    throw new ConfigError(file, `cannot read: ${(err as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new ConfigError(file, `invalid JSON: ${(err as Error).message}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ConfigError(file, "must contain a JSON object");
  }
  const options: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    // Own keys only: "constructor" or "__proto__" must be unknown keys,
    // not Object.prototype members.
    const rule = Object.hasOwn(KEYS, key) ? KEYS[key] : undefined;
    if (!rule) {
      throw new ConfigError(
        file,
        `unknown key "${key}" (allowed: ${Object.keys(KEYS).join(", ")})`,
      );
    }
    const [check, expected] = rule;
    if (!check(value)) {
      throw new ConfigError(file, `"${key}" must be ${expected}, got ${JSON.stringify(value)}`);
    }
    options[key] = value;
  }
  return options as FormatOptions;
}

/**
 * The nearest `.flatbuffers-format.json` at or above `dir`, walking up
 * to the filesystem root; `null` when there is none.
 */
export function findConfigFile(dir: string): string | null {
  let current = resolve(dir);
  for (;;) {
    const candidate = join(current, CONFIG_FILE_NAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * The format options for the schema at `filePath`, read from the
 * nearest `.flatbuffers-format.json` in its directory or any parent;
 * `null` when no config file applies. The file itself need not exist,
 * which lets an editor resolve options for an unsaved buffer.
 *
 * This is the same lookup the CLI performs, so editor plugins that call
 * it format exactly as `flatbuffers-format --write` does.
 *
 * @throws {ConfigError} if the config file found is invalid.
 */
export function resolveConfig(filePath: string): FormatOptions | null {
  const file = findConfigFile(dirname(resolve(filePath)));
  return file ? loadConfig(file) : null;
}
