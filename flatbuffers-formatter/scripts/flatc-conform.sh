#!/usr/bin/env bash
#
# flatc-conform.sh — validate every .fbs file in test/corpus/ with Google's
# official `flatc` compiler, and check that formatting never changes what
# flatc generates from it.
#
# Why this exists:
#   Our formatter is driven by an ANTLR4 grammar (and a hand-rolled sibling).
#   Both are *our* implementations of the FlatBuffers schema language. The
#   corpus is the substrate they're tested against. If a corpus file is only
#   valid under our parser but not under upstream flatc, then we're testing
#   the formatter against a fictional dialect — that defeats the point.
#   This script provides an independent third-party check: each corpus
#   schema must round-trip through `flatc` without error.
#
#   Second, the formatter must not change a schema's meaning. For every
#   accepted file, flatc's C++ code and binary schema (doc comments
#   included) from the formatted file must be byte-identical to those from
#   the original, under the default options and under every option moved
#   off its default. This needs the engine built (dist/src/cli.js).
#
# Why opt-in (not in prepublishOnly):
#   flatc is a *system* dependency (apt-get install flatbuffers-compiler),
#   not an npm one. Requiring it in the publish chain would break maintainer
#   machines that haven't installed it. Hermetic publish > convenience.
#
# Installing flatc on Linux:
#   Debian/Ubuntu:  sudo apt-get install -y flatbuffers-compiler
#   Fedora/RHEL:    sudo dnf install -y flatbuffers-compiler
#   Arch:           sudo pacman -S flatbuffers
#   macOS:          brew install flatbuffers
#   From source:    https://github.com/google/flatbuffers — cmake build,
#                   then put the resulting `flatc` on PATH.
#
# Exit codes:
#   0 — all corpus files accepted by flatc (or flatc not on PATH; skipped
#       with a clear warning so `npm run` enumeration still works on fresh
#       checkouts without flatc). Skip-rather-than-fail is deliberate: this
#       is a supplementary check, not a gate.
#   1 — flatc is on PATH and at least one corpus file failed validation, or
#       formatting one changed flatc's output.

set -u  # not -e: we want to keep iterating past failures to gather them all.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CORPUS_DIR="${PKG_DIR}/test/corpus"
OUT_DIR="$(mktemp -d -t flatc-conform.XXXXXX)"
trap 'rm -rf "${OUT_DIR}"' EXIT

if ! command -v flatc >/dev/null 2>&1; then
  echo "flatc-conform: SKIPPED — \`flatc\` not on PATH."
  echo "  Install on Debian/Ubuntu: sudo apt-get install -y flatbuffers-compiler"
  echo "  See https://github.com/google/flatbuffers for other platforms."
  echo "  This check is supplementary; the rest of the test suite is unaffected."
  exit 0
fi

flatc_version_line="$(flatc --version)"
echo "flatc-conform: using ${flatc_version_line}"
echo "flatc-conform: corpus = ${CORPUS_DIR}"

# Parse the major version number out of "flatc version 25.12.19" or
# "flatc version 2.0.8". Used below to skip fixtures that require
# features not in older flatc releases.
flatc_major=0
if [[ "${flatc_version_line}" =~ flatc[[:space:]]+version[[:space:]]+([0-9]+) ]]; then
  flatc_major="${BASH_REMATCH[1]}"
fi

# --- unconditional skip list ---
# Each entry is a corpus file basename that intentionally exercises a
# formatter edge case that flatc rejects on grounds unrelated to the
# formatter's correctness, on EVERY flatc version. Adding to this list
# is a deliberate choice — every entry must have a one-line rationale.
declare -A SKIP_REASON=(
  # flatc requires at least one declaration; this fixture is intentionally
  # comments-only to exercise blank-/comment-only input through the formatter.
  ["02-comments-only.fbs"]="intentionally comments-only; flatc rejects empty input"
  # `[[ubyte]]` is grammar-legal in upstream FlatBuffers BNF; flatc's
  # semantic layer forbids it ("wrap in table first"). Keep as a formatter
  # over-acceptance test.
  ["04-vectors.fbs"]="nested vector types are grammar-legal but flatc-rejected"
)

# --- version-gated skip list ---
# Each entry uses a feature added to flatc in a specific release. If the
# installed flatc's major version is older, skip with a clear "upgrade your
# flatc to test this fixture" message. If it's new enough, treat as a
# normal test target.
declare -A MIN_FLATC_MAJOR=(
  ["20-enum-value-metadata.fbs"]=23
  ["21-offset64-vector64-attrs.fbs"]=23
  ["22-union-underlying-type.fbs"]=23
)

shopt -s nullglob
files=("${CORPUS_DIR}"/*.fbs)
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  echo "flatc-conform: no .fbs files found in ${CORPUS_DIR}" >&2
  exit 1
fi

pass=0
fail=0
skip=0
failed_files=()

for f in "${files[@]}"; do
  base="$(basename "${f}")"
  if [[ -n "${SKIP_REASON[$base]:-}" ]]; then
    skip=$((skip + 1))
    echo "SKIP: ${base} — ${SKIP_REASON[$base]}"
    continue
  fi
  min_major="${MIN_FLATC_MAJOR[$base]:-0}"
  if (( min_major > flatc_major )); then
    skip=$((skip + 1))
    echo "SKIP: ${base} — needs flatc >= ${min_major}.x (installed: ${flatc_major}.x). Upgrade to test this fixture."
    continue
  fi
  # `flatc -b --schema -o <dir> <file>` parses the .fbs and emits a binary
  # schema (.bfbs). It's the lightest invocation that exercises the full
  # parser without generating language bindings. --no-warnings keeps the
  # output focused on hard errors; we treat warnings as informational.
  if err="$(flatc -b --schema --no-warnings -o "${OUT_DIR}" "${f}" 2>&1)"; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    failed_files+=("${f}")
    echo "---"
    echo "FAIL: ${base}"
    echo "${err}" | sed 's/^/    /'
  fi
done

# --- codegen equivalence ---
# The original and each formatted copy live in sibling directories with
# the same file names, so `include` lines resolve the same way in both.
CLI="${PKG_DIR}/dist/src/cli.js"
if [[ ! -f "${CLI}" ]]; then
  echo "flatc-conform: ${CLI} not found; build the engine first (pnpm --filter flatbuffers-format build)." >&2
  exit 1
fi
declare -A OPTION_SETS=(
  [defaults]=""
  [changed]="--trailing-comma=none --object-wrap=collapse --no-bracket-spacing --use-tabs --indent=1 --line-width=40 --max-blank-lines=0 --wrap-comments --no-compact-single-line"
)
cp -r "${CORPUS_DIR}" "${OUT_DIR}/original"
codegen_fail=0
codegen_checked=0
# generate <schema dir> <file> <output dir>
generate() {
  mkdir -p "$3"
  flatc --cpp -b --schema --bfbs-comments --no-warnings -I "$1" -o "$3" "$1/$2" >/dev/null 2>&1
}
for set_name in "${!OPTION_SETS[@]}"; do
  formatted="${OUT_DIR}/formatted-${set_name}"
  mkdir -p "${formatted}"
  for f in "${CORPUS_DIR}"/*.fbs; do
    # Word splitting of the flag list is intended.
    # shellcheck disable=SC2086
    node "${CLI}" --no-config ${OPTION_SETS[$set_name]} "${f}" > "${formatted}/$(basename "${f}")"
  done
  for f in "${files[@]}"; do
    base="$(basename "${f}")"
    # Only files flatc accepted above; the rest have nothing to compare.
    generate "${OUT_DIR}/original" "${base}" "${OUT_DIR}/gen-a" || { rm -rf "${OUT_DIR}/gen-a"; continue; }
    codegen_checked=$((codegen_checked + 1))
    if ! generate "${formatted}" "${base}" "${OUT_DIR}/gen-b" || ! diff -r "${OUT_DIR}/gen-a" "${OUT_DIR}/gen-b" >/dev/null; then
      codegen_fail=$((codegen_fail + 1))
      echo "---"
      echo "CODEGEN CHANGED: ${base} (${set_name}: ${OPTION_SETS[$set_name]:-default options})"
      diff -r "${OUT_DIR}/gen-a" "${OUT_DIR}/gen-b" | head -20 | sed 's/^/    /'
    fi
    rm -rf "${OUT_DIR}/gen-a" "${OUT_DIR}/gen-b"
  done
done
echo "---"
echo "Codegen: ${codegen_checked} file/option checks, ${codegen_fail} changed flatc's output"

checked=$((pass + fail))
total=$((checked + skip))
echo "---"
echo "Summary: ${pass}/${checked} checked files accepted by flatc (${skip} skipped, ${total} total)"

if [[ ${fail} -gt 0 || ${codegen_fail} -gt 0 ]]; then
  echo "Failed files:"
  for f in "${failed_files[@]}"; do
    echo "  - $(basename "${f}")"
  done
  exit 1
fi

exit 0
