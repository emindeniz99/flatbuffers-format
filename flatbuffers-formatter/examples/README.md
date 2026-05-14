# examples/

Curated `.fbs` files that show what `flatbuffers-format` does on
realistic input. None of these are grammar test fixtures — for those see
[`test/corpus/`](../test/corpus). Recipes for common workflows
(CI gates, pre-commit hooks, programmatic use, etc.) live in
[`../docs/cookbook.md`](../docs/cookbook.md).

| File | What it demonstrates |
|---|---|
| [`sample.fbs`](./sample.fbs) | A deliberately *ugly* schema. Run `npx flatbuffers-format examples/sample.fbs` to see every formatting rule fire at once. Used by the README's quick demo. |
| [`before-format/monster.fbs`](./before-format/monster.fbs) | A realistic, lightly-inconsistent multiplayer-lobby schema as a human might check it in (~95 lines). Exercises tables, structs, unions, enums, an RPC service, metadata, doc comments, and a deprecated field. |
| [`after-format/monster.fbs`](./after-format/monster.fbs) | The same file after `node dist/src/cli.js examples/before-format/monster.fbs`. Side-by-side comparison shows the canonical output and is a fixed point — re-running the formatter is a no-op. |

To regenerate the `after-format/` snapshot after changing the formatter
or the `before-format/` source:

```bash
npm run build
node dist/src/cli.js examples/before-format/monster.fbs \
  > examples/after-format/monster.fbs
```

If `--check` ever flags `after-format/monster.fbs` as unformatted, the
formatter is no longer idempotent for that input — that's a bug, file
an issue.
