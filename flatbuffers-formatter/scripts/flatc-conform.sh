#!/usr/bin/env bash
#
# flatc-conform.sh — validate every .fbs file in test/corpus/ with Google's
# official `flatc` compiler.
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
#   1 — flatc is on PATH and at least one corpus file failed validation.

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

echo "flatc-conform: using $(flatc --version)"
echo "flatc-conform: corpus = ${CORPUS_DIR}"

shopt -s nullglob
files=("${CORPUS_DIR}"/*.fbs)
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  echo "flatc-conform: no .fbs files found in ${CORPUS_DIR}" >&2
  exit 1
fi

pass=0
fail=0
failed_files=()

for f in "${files[@]}"; do
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
    echo "FAIL: $(basename "${f}")"
    echo "${err}" | sed 's/^/    /'
  fi
done

total=$((pass + fail))
echo "---"
echo "Summary: ${pass}/${total} files accepted by flatc"

if [[ ${fail} -gt 0 ]]; then
  echo "Failed files:"
  for f in "${failed_files[@]}"; do
    echo "  - $(basename "${f}")"
  done
  exit 1
fi

exit 0
