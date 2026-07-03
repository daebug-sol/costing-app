#!/usr/bin/env bash
# Fast benchmark for costing-app autoresearch sessions.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

gates_pass=0
jest_seconds=0
test_count=0
lint_errors=0

# --- lint (fast signal) ---
lint_out="$(npm run lint 2>&1)" || lint_rc=$?
lint_rc="${lint_rc:-0}"
lint_errors="$(printf '%s\n' "$lint_out" | awk '/✖/ {print $2; exit}')"
lint_errors="${lint_errors:-0}"

# --- unit tests (primary workload) ---
start_ms="$(date +%s%3N 2>/dev/null || python -c 'import time; print(int(time.time()*1000))')"
set +e
test_out="$(npm test -- --passWithNoTests 2>&1)"
test_rc=$?
set -e
end_ms="$(date +%s%3N 2>/dev/null || python -c 'import time; print(int(time.time()*1000))')"
jest_seconds="$(awk "BEGIN {printf \"%.3f\", ($end_ms - $start_ms) / 1000}")"

test_count="$(printf '%s\n' "$test_out" | awk '/Tests:/ {print $2; exit}')"
test_count="${test_count:-0}"

tests_ok=0
[[ "$test_rc" -eq 0 ]] && tests_ok=1

lint_ok=0
[[ "$lint_rc" -eq 0 ]] && lint_ok=1

if [[ "$tests_ok" -eq 1 && "$lint_ok" -eq 1 ]]; then
  gates_pass=1
fi

echo "METRIC gates_pass=$gates_pass"
echo "METRIC jest_seconds=$jest_seconds"
echo "METRIC test_count=$test_count"
echo "METRIC lint_errors=$lint_errors"
