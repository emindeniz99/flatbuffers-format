#!/usr/bin/env bash
#
# upstream-schemas.sh <flatbuffers checkout> — run every .fbs file in
# google/flatbuffers' tests/ and samples/ through the formatter.
#
# Our own corpus only holds the syntax we thought of. flatbuffers' test
# schemas hold the syntax flatc actually supports, written by the people
# who wrote flatc, and they found five constructs the grammar rejected
# (signed inf/nan, `= []`, union discriminants and metadata, single
# quotes). For each file this checks that:
#   - the engine formats it, and formatting the result changes nothing;
#   - the hand-rolled oracle produces the same bytes;
#   - when flatc accepts the original, its C++ code and binary schema
#     (doc comments included) are byte-identical for the formatted file,
#     under the default options and under every option off its default.
#
# Needs both engines built and `flatc` on PATH. CI pins the checkout to
# the same flatbuffers release as the flatc binary.

set -uo pipefail

SRC="$(cd "${1:?usage: upstream-schemas.sh <flatbuffers checkout>}" && pwd)"
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENGINE="${PKG_DIR}/dist/src/cli.js"
ORACLE="${PKG_DIR}/../flatbuffers-formatter-handrolled/dist/cli.js"
WORK="$(mktemp -d -t upstream-schemas.XXXXXX)"
trap 'rm -rf "${WORK}"' EXIT

for bin in "${ENGINE}" "${ORACLE}"; do
  [[ -f "${bin}" ]] || { echo "upstream-schemas: ${bin} not found; build both engines first." >&2; exit 1; }
done
command -v flatc >/dev/null || { echo "upstream-schemas: flatc not on PATH." >&2; exit 1; }
echo "upstream-schemas: $(flatc --version), schemas from ${SRC}"

CHANGED="--trailing-comma=none --object-wrap=collapse --no-bracket-spacing --use-tabs --indent=1 --line-width=40 --max-blank-lines=0 --wrap-comments --no-compact-single-line"

# The schemas include each other by paths relative to tests/, so each
# copy keeps the whole tree.
mkdir -p "${WORK}/original"
cp -r "${SRC}/tests" "${SRC}/samples" "${WORK}/original/"
cp -r "${WORK}/original" "${WORK}/defaults"
cp -r "${WORK}/original" "${WORK}/changed"

cd "${WORK}/original" || exit 1
mapfile -t files < <(find . -name '*.fbs' | sort)

fail=0
for f in "${files[@]}"; do
  if ! out="$(node "${ENGINE}" --no-config "${f}" 2>&1)"; then
    echo "FORMAT FAILED: ${f}"; echo "${out}" | head -5 | sed 's/^/    /'; fail=$((fail + 1)); continue
  fi
  printf '%s\n' "${out}" > "${WORK}/defaults/${f}"
  if ! cmp -s <(node "${ENGINE}" --no-config - < "${WORK}/defaults/${f}") "${WORK}/defaults/${f}"; then
    echo "NOT IDEMPOTENT: ${f}"; fail=$((fail + 1))
  fi
  if ! cmp -s <(node "${ORACLE}" "${f}" 2>&1) "${WORK}/defaults/${f}"; then
    echo "ORACLE DIFFERS: ${f}"; fail=$((fail + 1))
  fi
  # Word splitting of the flag list is intended.
  # shellcheck disable=SC2086
  if ! node "${ENGINE}" --no-config ${CHANGED} "${f}" > "${WORK}/changed/${f}" 2>/dev/null; then
    echo "FORMAT FAILED (changed options): ${f}"; fail=$((fail + 1))
  fi
done

# generate <tree> <file> <out dir>: flatc run from the tree's root with
# the include paths flatbuffers' own build uses.
generate() {
  mkdir -p "$3"
  (cd "$1" && flatc --cpp -b --schema --bfbs-comments --no-warnings \
    -I tests -I tests/include_test -o "$3" "$2" >/dev/null 2>&1)
}
compared=0
for f in "${files[@]}"; do
  generate "${WORK}/original" "${f}" "${WORK}/gen-original" || { rm -rf "${WORK}/gen-original"; continue; }
  for set in defaults changed; do
    compared=$((compared + 1))
    if ! generate "${WORK}/${set}" "${f}" "${WORK}/gen-${set}" ||
       ! diff -r "${WORK}/gen-original" "${WORK}/gen-${set}" >/dev/null; then
      echo "CODEGEN CHANGED (${set}): ${f}"
      diff -r "${WORK}/gen-original" "${WORK}/gen-${set}" | head -10 | sed 's/^/    /'
      fail=$((fail + 1))
    fi
    rm -rf "${WORK}/gen-${set}"
  done
  rm -rf "${WORK}/gen-original"
done

echo "upstream-schemas: ${#files[@]} schemas formatted, ${compared} codegen comparisons, ${fail} problems"
[[ ${fail} -eq 0 ]]
