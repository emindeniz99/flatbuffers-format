# Cookbook

Copy-paste recipes for `flatbuffers-format`. Each section is
self-contained — jump to the one that matches your use case.

1. [CI gate with `--check`](#1-ci-gate-with---check)
2. [Pre-commit hook (husky + lint-staged, vanilla git hook, or the pre-commit framework)](#2-pre-commit-hook)
3. [Programmatic use from Node](#3-programmatic-use-from-node)
4. [Programmatic use from the browser](#4-programmatic-use-from-the-browser)
5. [VS Code task — format current file on a keybinding](#5-vs-code-task)
6. [Custom indent width](#6-custom-indent-width)
7. [Integrating with Prettier](#7-integrating-with-prettier)
8. [Migrating an existing repo](#8-migrating-an-existing-repo)

Reference: the [README](../README.md) covers install, the CLI flag table,
and the full set of formatting rules. This file is the cookbook — short
recipes, no theory.

---

## 1. CI gate with `--check`

Fail the build whenever a `.fbs` file lands unformatted. `--check`
walks directories recursively, respects `.gitignore` inside git
repos, exits **0** if every file is already formatted, **1** if any file
differs from canonical output, and **2** on usage errors.

`.github/workflows/format.yml`:

```yaml
name: Format

on:
  pull_request:
  push:
    branches: [main]

jobs:
  flatbuffers-format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Check .fbs formatting
        run: npx --yes flatbuffers-format@0.1.0 --check .
```

Pin the version (`flatbuffers-format@0.1.0`) so a future release can't
silently change canonical output under your CI. Bump it in the same PR
that re-runs `--write`.

If you already run `npm ci` in CI and have `flatbuffers-format` in
`devDependencies`, drop the `npx --yes` form and call it directly:

```yaml
      - run: npm ci
      - run: npx flatbuffers-format --check .
```

---

## 2. Pre-commit hook

Two variants depending on whether you want a JS-toolchain hook manager.

### 2a. husky + lint-staged

Install once:

```bash
npm i -D husky lint-staged flatbuffers-format
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

`package.json`:

```json
{
  "lint-staged": {
    "*.fbs": "flatbuffers-format --write"
  }
}
```

`lint-staged` re-stages whatever `--write` modifies, so the formatted
files go into the commit automatically.

### 2b. vanilla `.git/hooks/pre-commit`

For teams that don't want husky in their dependency tree. Drop this in
`.git/hooks/pre-commit` and `chmod +x` it:

```bash
#!/usr/bin/env bash
# Format staged .fbs files in place, then re-stage them.
set -euo pipefail

mapfile -t files < <(git diff --cached --name-only --diff-filter=ACM | grep '\.fbs$' || true)
if [ ${#files[@]} -eq 0 ]; then
  exit 0
fi

npx --yes flatbuffers-format --write "${files[@]}"
git add "${files[@]}"
```

`.git/hooks/` isn't tracked by git, so commit a copy to
`scripts/git-hooks/pre-commit` and document `git config core.hooksPath
scripts/git-hooks` in your CONTRIBUTING.md if you want it shared.

### 2c. Python `pre-commit` framework

If your team already runs [pre-commit](https://pre-commit.com) (the
default in Python-heavy stacks, common in mixed-language monorepos),
add to `.pre-commit-config.yaml`:

```yaml
- repo: https://github.com/emindeniz99/flatbuffers-format
  rev: flatbuffers-format@v0.1.0   # bump on each release
  hooks:
    - id: flatbuffers-format        # rewrites in place
    # …or for the silent CI variant:
    # - id: flatbuffers-format-check
```

`pre-commit install` once per clone and pushing/committing
auto-triggers it on staged `.fbs` files. The framework installs the
npm package into an isolated environment — no global `flatbuffers-format`
required, no Node-version pinning conflict with the rest of your
toolchain.

Two hook IDs ship:
- `flatbuffers-format` — `--write` mode for local commits
- `flatbuffers-format-check` — `--check` mode for CI, fails the run
  on any unformatted file

---

## 3. Programmatic use from Node

`format()` and `check()` are pure functions. They throw `FormatError`
(with `.line` and `.column`) on syntactically invalid input — they do
**not** throw on already-formatted input.

```js
// format-one.js — run with `node format-one.js path/to/schema.fbs`
import { readFileSync } from "node:fs";
import { format, check, FormatError } from "flatbuffers-format";

const path = process.argv[2];
if (!path) {
  console.error("usage: format-one.js <file.fbs>");
  process.exit(2);
}

const source = readFileSync(path, "utf8");

try {
  if (check(source)) {
    console.log(`${path}: already formatted`);
  } else {
    process.stdout.write(format(source));
  }
} catch (err) {
  if (err instanceof FormatError) {
    console.error(`${path}:${err.line}:${err.column}: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
```

TypeScript variant — same shape, plus the `FormatOptions` type for
configurable callers:

```ts
import { format, check, FormatError, type FormatOptions } from "flatbuffers-format";

export function formatOrThrow(src: string, opts?: FormatOptions): string {
  try {
    return format(src, opts);
  } catch (err) {
    if (err instanceof FormatError) {
      throw new Error(`fbs syntax error at ${err.line}:${err.column}: ${err.message}`);
    }
    throw err;
  }
}
```

`check(source)` returns `true` iff `format(source) === source`. Use it
when you only need a yes/no answer — it still parses the input, so the
cost is the same as `format` minus the string compare.

---

## 4. Programmatic use from the browser

`format` and `check` are browser-safe — they only depend on `antlr4ng`,
which ships an ES-module build. For a quick demo with no bundler, use an
import map:

```html
<!doctype html>
<html>
  <body>
    <textarea id="in" rows="20" cols="80">table T { x:int; }</textarea>
    <pre id="out"></pre>

    <script type="importmap">
      {
        "imports": {
          "flatbuffers-format": "https://esm.sh/flatbuffers-format@0.1.0",
          "antlr4ng": "https://esm.sh/antlr4ng@3"
        }
      }
    </script>

    <script type="module">
      import { format, FormatError } from "flatbuffers-format";
      const $in = document.getElementById("in");
      const $out = document.getElementById("out");
      const render = () => {
        try {
          $out.textContent = format($in.value);
        } catch (e) {
          $out.textContent = e instanceof FormatError
            ? `error at ${e.line}:${e.column}: ${e.message}`
            : String(e);
        }
      };
      $in.addEventListener("input", render);
      render();
    </script>
  </body>
</html>
```

For production, bundle with esbuild / Rollup / Vite — the bare specifier
`"flatbuffers-format"` resolves through `node_modules` and you can drop
the import map entirely.

---

## 5. VS Code task

The README already covers format-on-save via the
[`emeraldwalk.RunOnSave`](https://marketplace.visualstudio.com/items?itemName=emeraldwalk.RunOnSave)
extension. This recipe adds an explicit task you can bind to a key
(e.g. `Ctrl+Shift+I`) and run on demand without a save trigger.

`.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "flatbuffers-format: write current file",
      "type": "shell",
      "command": "npx",
      "args": ["flatbuffers-format", "--write", "${file}"],
      "presentation": {
        "reveal": "silent",
        "panel": "shared",
        "clear": true
      },
      "problemMatcher": []
    }
  ]
}
```

Bind it in `keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+i",
    "command": "workbench.action.tasks.runTask",
    "args": "flatbuffers-format: write current file",
    "when": "resourceExtname == .fbs"
  }
]
```

---

## 6. Custom indent width

CLI — 4-space indent:

```bash
npx flatbuffers-format --indent 4 --write src/
```

Programmatic — same setting via `FormatOptions`:

```ts
import { format } from "flatbuffers-format";

const out = format(source, { indent: 4, newline: "\n" });
```

To make 4 the project default for everyone, wrap the CLI in a script:

```json
{
  "scripts": {
    "fmt:fbs": "flatbuffers-format --indent 4 --write",
    "fmt:fbs:check": "flatbuffers-format --indent 4 --check ."
  }
}
```

There's no config-file lookup — by intent. The flag (or the
`FormatOptions` argument) is the only source of truth, so a stale
`.fbsformatrc` can't lie about how a repo is actually being formatted.

### Configuring layout: indent, line width, blank lines

`indent` is the most common knob, but the formatter also accepts a
small set of layout options for projects that want tabs, wider lines,
or a different compaction policy. Every option is optional and
defaults to a value that matches the formatter's out-of-the-box
behavior.

```ts
import { format } from "flatbuffers-format";

const out = format(source, {
  indent: 2,              // spaces (or tabs, see useTabs) per level
  useTabs: false,         // true → indent with `\t` instead of spaces
  newline: "\n",          // or "\r\n"
  lineWidth: 80,          // target column for compact/wrap decisions
  compactSingleLine: true, // collapse small enum/union/single-field bodies
  maxBlankLines: 1,        // cap consecutive blank lines between decls
  wrapComments: false,     // reflow long `//` lines at whitespace
  commentWidth: 80,        // wrap column for wrapComments
});
```

CLI equivalents:

```bash
flatbuffers-format \
  --indent 2 \
  --use-tabs \
  --line-width 100 \
  --no-compact-single-line \
  --max-blank-lines 2 \
  --wrap-comments \
  --comment-width 100 \
  --write src/
```

Notes:

- `useTabs: true` emits one tab per `indent` level (so `useTabs: true,
  indent: 1` is the usual "one tab per level" setting).
- `compactSingleLine: true` is the default; it collapses enums, unions,
  and single-field tables/structs that fit on one line. Doc/block
  comments and per-value metadata always force the multi-line form.
- `maxBlankLines` only ever shrinks blank-line runs — it never inserts
  blank lines the source didn't have.
- `wrapComments` is opt-in. Block comments (`/* … */`) and doc
  comments (`///`) are never reflowed.

---

## 7. Integrating with Prettier

Prettier has no `.fbs` plugin, and `flatbuffers-format` isn't packaged
as one. Chain them in a `format` script instead — Prettier handles the
JS/TS/JSON/Markdown, `flatbuffers-format` handles the schemas:

```json
{
  "scripts": {
    "format": "npm run format:fbs && npm run format:prettier",
    "format:fbs": "flatbuffers-format --write .",
    "format:prettier": "prettier --write .",
    "format:check": "npm run format:fbs:check && npm run format:prettier:check",
    "format:fbs:check": "flatbuffers-format --check .",
    "format:prettier:check": "prettier --check ."
  }
}
```

Order matters in one direction only: if a Prettier plugin ever touches
`.fbs` files (e.g. a markdown-fenced code block), run `format:fbs`
**after** Prettier so the canonical output is what hits disk. For most
repos that situation doesn't arise and the order above is fine.

Add `*.fbs` to `.prettierignore` so Prettier doesn't try to format
schemas itself:

```text
# .prettierignore
*.fbs
```

---

## 8. Migrating an existing repo

Adding `--check` to CI on day one will produce a wall of "fix
formatting" diffs in every open PR. Do this instead:

1. **Land one dedicated `--write` commit** on `main`, on its own,
   before turning on the check:

   ```bash
   npm i -D flatbuffers-format
   npx flatbuffers-format --write .
   git add -A
   git commit -m "chore: format .fbs files with flatbuffers-format"
   ```

   Suggested commit message body (optional, but useful for `git blame`
   readers six months from now):

   ```text
   chore: format .fbs files with flatbuffers-format

   Mechanical reformat — no semantic changes. Run via:

       npx flatbuffers-format@0.1.0 --write .

   The --check CI gate is enabled in the follow-up commit.
   ```

   Add this SHA to a `.git-blame-ignore-revs` file so `git blame`
   skips it:

   ```bash
   echo "$(git rev-parse HEAD)  # chore: flatbuffers-format" \
     >> .git-blame-ignore-revs
   git config blame.ignoreRevsFile .git-blame-ignore-revs
   ```

2. **Then** add the CI gate in a separate commit (recipe 1) and any
   pre-commit hook (recipe 2). Open PRs only need a rebase — no manual
   reformatting.

Why split it: a single combined commit either drops the gate behind a
huge diff (reviewers can't see actual changes) or merges the
reformat into a feature commit (poisons `git blame` for every line
touched). The two-commit pattern keeps the noisy diff isolated and
makes the gate's introduction reviewable on its own.
