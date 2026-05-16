#!/usr/bin/env bash
# Cross-check the hand-rolled and ANTLR-backed formatters against
# every .fbs in test/corpus/.
#
# Three properties checked for each file:
#   I-A) hand-rolled is idempotent: format(format(x)) == format(x)
#   I-B) ANTLR is idempotent:       same property
#   EQ)  hand-rolled output == ANTLR output (byte-identical)
#
# Parse-status divergences (one accepts, the other rejects) are
# reported separately.
#
# Run from anywhere — paths are computed relative to this script.
# Both projects must be built first:
#   (cd ../flatbuffers-formatter-handrolled && npm run build)
#   (cd ..                                  && npm run build)

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HAND="node $HERE/../../flatbuffers-formatter-handrolled/dist/cli.js"
ANTL="node $HERE/../dist/src/cli.js"
CORPUS="$HERE/corpus"
pass=0
fail=0
parse_div=0
total=0

for f in "$CORPUS"/*.fbs; do
  total=$((total+1))
  name=$(basename "$f")

  h1=$($HAND "$f" 2>/dev/null);    h1_status=$?
  a1=$($ANTL "$f" 2>/dev/null);    a1_status=$?

  if [ $h1_status -ne 0 ] && [ $a1_status -ne 0 ]; then
    echo "  BOTH-FAIL  $name (both rejected)"
    parse_div=$((parse_div+1))
    continue
  fi
  if [ $h1_status -ne 0 ] || [ $a1_status -ne 0 ]; then
    echo "  PARSE-DIV  $name  (hand=$h1_status, antlr=$a1_status)"
    parse_div=$((parse_div+1))
    continue
  fi

  # Idempotency: feed each formatter's output back to itself.
  h2=$(echo "$h1" | $HAND - 2>/dev/null)
  a2=$(echo "$a1" | $ANTL - 2>/dev/null)

  h_idem=$([ "$h1" = "$h2" ] && echo "y" || echo "n")
  a_idem=$([ "$a1" = "$a2" ] && echo "y" || echo "n")
  eq=$([ "$h1" = "$a1" ] && echo "y" || echo "n")

  if [ "$h_idem" = "y" ] && [ "$a_idem" = "y" ] && [ "$eq" = "y" ]; then
    echo "  OK         $name"
    pass=$((pass+1))
  else
    echo "  MISMATCH   $name  (hand-idem=$h_idem, antlr-idem=$a_idem, eq=$eq)"
    fail=$((fail+1))
  fi
done

echo
echo "Summary: $pass/$total OK, $fail mismatches, $parse_div parse-divergences"

# Second pass: a representative non-default option combo, just enough to
# catch a divergence in the new layout knobs (useTabs / lineWidth /
# compactSingleLine / maxBlankLines). If the default-options pass agrees
# but this combo disagrees, the engines have drifted on one of the new
# options' implementations.
flags="--use-tabs --indent=1 --no-compact-single-line --max-blank-lines=2"
combo_fail=0
for f in "$CORPUS"/*.fbs; do
  name=$(basename "$f")
  h=$($HAND $flags "$f" 2>/dev/null);  h_st=$?
  a=$($ANTL $flags "$f" 2>/dev/null);  a_st=$?
  if [ $h_st -ne 0 ] && [ $a_st -ne 0 ]; then
    continue
  fi
  if [ "$h" != "$a" ]; then
    echo "  COMBO-MISMATCH $name"
    combo_fail=$((combo_fail+1))
  fi
done
echo "Non-default combo ($flags): $combo_fail mismatches"

[ $fail -eq 0 ] && [ $parse_div -eq 0 ] && [ $combo_fail -eq 0 ]
