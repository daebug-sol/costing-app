#!/usr/bin/env bash
# Correctness backpressure before logging status=keep.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "== autoresearch checks: unit tests =="
npm test

echo "== autoresearch checks: lint =="
npm run lint

echo "CHECKS_OK"
