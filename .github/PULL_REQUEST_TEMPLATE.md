<!--
Thanks for the PR! A few quick checks below help reviewers move fast.
Delete sections that don't apply.
-->

## What changes

<!-- One- or two-sentence summary of the change. -->

## Why

<!-- Motivation. Link to an issue if one exists. -->

## Which packages are touched

- [ ] `flatbuffers-formatter/` (published `flatbuffers-format`)
- [ ] `flatbuffers-formatter-handrolled/` (differential-oracle sibling)
- [ ] `prettier-plugin-flatbuffers/`
- [ ] `tree-sitter-flatbuffers/`
- [ ] `vscode-flatbuffers/`
- [ ] `intellij-flatbuffers/`
- [ ] `flatbuffers-format-editors/`
- [ ] Repo-level (`.github/`, root docs, CI, etc.)

If you ticked more than one, **make sure each area's changes are in
their own commit** — see
[`CONTRIBUTING.md` → Commit conventions](../CONTRIBUTING.md#commit-conventions).

## Tests run locally

For changes that touch `flatbuffers-format` (from the repo root):

- [ ] `pnpm --filter flatbuffers-format test` passes (unit tests)
- [ ] `bash flatbuffers-formatter/test/crosscheck.sh` reports `N/N OK, 0 mismatches, 0 parse-divergences`
- [ ] `bash flatbuffers-formatter/scripts/flatc-conform.sh` passes (or is N/A on this change)
- [ ] `pnpm --filter flatbuffers-format-handrolled test` passes

For grammar changes:

- [ ] Mirrored in `flatbuffers-formatter-handrolled/src/` and `tree-sitter-flatbuffers/grammar.js`
- [ ] New corpus fixture added under `flatbuffers-formatter/test/corpus/`
- [ ] `flatbuffers-formatter/docs/ebnf-conformance.md` updated if the change closes/alters a row

## Commit convention

- [ ] All commit subjects follow
      [`CONTRIBUTING.md`](../CONTRIBUTING.md#commit-conventions):
      `<type>(<scope>): <subject>`, with scope = an area of this repo
      (`formatter`, `prettier-plugin`, `tree-sitter`, `vscode`,
      `intellij`, `editors`, `ci`, `docs`, `repo`).

<!--
Note for maintainers: this repo merges with a real merge commit.
Never squash, never rebase-merge.
-->

## Anything reviewers should know?

<!-- Trade-offs, alternatives you considered, follow-up work, etc. -->
