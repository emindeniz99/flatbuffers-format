# Claude rules — flatbuffers-format

Rules for any AI assistant making changes in this repo. Human-facing
detail (setup, test layers, grammar procedure, release process) lives in
[`CONTRIBUTING.md`](CONTRIBUTING.md) — read it before your first change.

## What this repo is

Seven sibling packages, one pnpm workspace rooted at the repo root. Every
package delegates to one engine, so output is byte-identical everywhere:

| Directory | What it is |
|---|---|
| `flatbuffers-formatter/` | **The engine** — published as `flatbuffers-format`. ANTLR4 grammar → generated parser → printer, plus CLI, native binaries, WASM. |
| `flatbuffers-formatter-handrolled/` | Unpublished hand-rolled parser+printer, kept as a **differential oracle**. Every corpus file must format byte-identically through both. |
| `prettier-plugin-flatbuffers/` | Prettier 3 plugin — thin shim over the engine. |
| `tree-sitter-flatbuffers/` | Tree-sitter grammar, mirrors the ANTLR4 grammar. |
| `vscode-flatbuffers/` | VS Code extension — thin shim. |
| `intellij-flatbuffers/` | Kotlin/Gradle JetBrains plugin; shells out to the engine CLI. |
| `flatbuffers-format-editors/` | CodeMirror 6 / Monaco / Web Component integrations, in-process. |

Consequences that bite:

- **Grammar changes are never single-package.** The ANTLR grammar, the
  hand-rolled sibling, and the tree-sitter grammar must stay in lockstep,
  and `flatbuffers-formatter/test/crosscheck.sh` must report `N/N OK`
  with zero mismatches. Full procedure: CONTRIBUTING.md → "Making a
  grammar change".
- **Don't hand-edit `version` in any `package.json` or any
  `CHANGELOG.md`** — release-please owns both.
- **Don't hand-edit `flatbuffers-formatter/generated/`** — it is produced
  by `pnpm --filter flatbuffers-format build` from `grammar/FlatBuffers.g4`.

## Git commits — Conventional Commits, scope **mandatory**

```
<type>(<scope>): <subject>

[optional body — wrap at 72 chars, explain *why*]

[optional footer — BREAKING CHANGE: …, Refs: …, etc.]
```

### Hard rules

1. **Scope is required.** Never `feat: …` — always `feat(<scope>): …`.
2. **Scope is an area of this repo**, from this set:

   | Scope | Covers |
   |---|---|
   | `formatter` | `flatbuffers-formatter/` |
   | `handrolled` | `flatbuffers-formatter-handrolled/` |
   | `prettier-plugin` | `prettier-plugin-flatbuffers/` |
   | `tree-sitter` | `tree-sitter-flatbuffers/` |
   | `vscode` | `vscode-flatbuffers/` |
   | `intellij` | `intellij-flatbuffers/` |
   | `editors` | `flatbuffers-format-editors/` |
   | `ci` | `.github/workflows/`, CI config |
   | `docs` | docs not owned by one package (README, CONTRIBUTING, SECURITY, this file) |
   | `repo` | root config — workspace, `.gitignore`, release-please config, tool pins |

   release-please routes commits to packages by the **files touched**,
   not by the scope string; the scope is for humans reading `git log`.
3. **Cross-area changes** → split into one commit per area. Don't ship a
   single commit that touches `vscode-flatbuffers/` and
   `intellij-flatbuffers/` together.
4. **Subject line:** imperative mood ("add X", not "added X"), lowercase
   first letter, no trailing period, ≤72 chars for the whole header.
5. **The description states the problem being solved**, not just the
   mechanics of the diff.
6. **Add a `Co-Authored-By:` trailer** crediting the AI assistant that
   made the commit, e.g.
   `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

### Allowed types

`feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `build`,
`ci`, `revert`. If none fit, prefer `chore`.

### Body — when to write one

Skip it for trivial commits. Write one when the *why* isn't obvious from
the diff (constraint, incident, upstream bug), when the change has
non-local consequences (deprecates an API, changes a default, needs a
migration), or when you picked a non-obvious approach — note the
trade-off. Don't restate the diff. Don't paste tool output.

### Breaking changes

`!` after the scope **and** a `BREAKING CHANGE:` footer with the
migration path.

### Committing on the user's behalf

- **One commit = one reason.** Stage by pathspec, not `git add -A`:
  `git commit --only -m "<message>" -- <path1> <path2>`. If `--only` is
  awkward, fall back to `git add <paths> && git diff --cached
  --name-only && git commit` — same one-topic rule.
- Verify the scope matches the paths actually touched before committing.
- Never use `--no-verify`, `--amend` on pushed commits, or force-push
  without explicit user confirmation.

## Merging pull requests — always a real merge commit

- **Default to the `merge` method** — a real merge commit that preserves
  every commit on the branch. Per-commit history is the record of how
  each package was built; don't collapse it.
- **Never squash. Never rebase-merge.** Squashing throws the branch's
  history away; on `main` that is irreversible. Rebase-merging rewrites
  SHAs and loses the merge topology.
- This is a **standing instruction** — don't ask "merge or squash?" each
  time. The answer is `merge` unless the maintainer says otherwise *for
  that specific PR*. Via the GitHub API pass `merge_method: "merge"`;
  locally use `git merge --no-ff`.
- Don't delete the source branch as part of the merge unless asked.

## Working rules

Bias: caution over speed on non-trivial work. Use judgment on trivial
tasks. (Rules 1–4 are Forrest Chang's Karpathy-derived baseline; 5–12
extend it, from @Mnilax.)

1. **Think before coding.** State assumptions; if multiple readings
   exist, surface them instead of picking silently. If something is
   unclear, stop and ask.
2. **Simplicity first.** Minimum code that solves the problem. No
   speculative features, abstractions for single-use code, or error
   handling for impossible scenarios.
3. **Surgical changes.** Touch only what the request requires. Don't
   "improve" adjacent code or reformat. Match existing style. Clean up
   only the orphans *your* change created; mention pre-existing dead
   code rather than deleting it.
4. **Goal-driven execution.** Turn the task into a verifiable goal
   ("fix the bug" → "write a failing test, then make it pass") and loop
   until it's verified.
5. **Use the model only for judgment calls.** If code can answer
   deterministically, code answers.
6. **Token budgets are not advisory.** Summarize and start fresh rather
   than silently overrunning.
7. **Surface conflicts, don't average them.** If two patterns
   contradict, pick one (more recent / more tested), say why, flag the
   other.
8. **Read before you write.** Read exports, callers, and shared helpers
   first. "Looks orthogonal" is dangerous.
9. **Tests verify intent, not just behavior.** A test that can't fail
   when the logic changes is wrong.
10. **Checkpoint after every significant step.** Say what's done,
    what's verified, what's left.
11. **Match this codebase's conventions even if you disagree.**
    Conformance > taste. Surface the disagreement; don't fork silently.
12. **Fail loud.** "Completed" is wrong if anything was skipped
    silently; "tests pass" is wrong if any were skipped.
