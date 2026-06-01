#!/usr/bin/env bash
# Fail if real env files are staged or tracked. Safe to run before commit/push.
set -euo pipefail
cd "$(dirname "$0")/.."

blocked=(
  .env
  .env.prod
  .env.local
  .env.production
  .env.production.local
  packages/core/.env
)

tracked=()
for f in "${blocked[@]}"; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    tracked+=("$f")
  fi
done

if ((${#tracked[@]})); then
  echo "Tracked secret env files (remove with: git rm --cached <file>):" >&2
  printf '  %s\n' "${tracked[@]}" >&2
  exit 1
fi

staged_all=$(git diff --cached --name-only 2>/dev/null || true)
staged=()
for f in "${blocked[@]}"; do
  if echo "$staged_all" | grep -qx "$f"; then
    staged+=("$f")
  fi
done

if ((${#staged[@]})); then
  echo "Staged secret env files (unstage with: git restore --staged <file>):" >&2
  printf '  %s\n' "${staged[@]}" >&2
  exit 1
fi

echo "OK: no .env / .env.prod (or other blocked env files) staged or tracked."
