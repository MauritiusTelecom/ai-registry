#!/usr/bin/env bash
#
# Mauritius AI Registry - one-command deployment pipeline.
#
# !!! MONOREPO MIGRATION NOTICE !!!
# This script was written for the pre-monorepo layout where the Next.js app
# lived at the repo root and Prisma lived at src/prisma. After the monorepo
# split, the app is at apps/portal/ and Prisma is at packages/core/prisma/.
# Update the rsync arglist (line ~78) and the build directory (line ~70)
# before re-using this script. See MIGRATION.md for the path mapping.
#
# Usage:
#     pnpm deploy:v2          # production at https://www.airegistry.mu/
#     pnpm deploy:legacy      # legacy at specialprojects.telecom.mu/ui/ai-registry
#
# What it does, in order:
#   1. Confirms target (v2 or legacy) and prints a summary
#   2. git pull --rebase    so colleague's commits are included
#   3. rm -rf .next         clean slate
#   4. npm run build        with the right NEXT_PUBLIC_BASE_PATH for the target
#   5. rsync to server      with -R so the src/ prefix is preserved
#   6. ssh in and run:      npm install -> npm run deploy:db -> pm2 restart -> pm2 logs
#
# Hard rules enforced:
#   - rsync uses -R; without it Prisma can't find src/prisma/schema.prisma
#   - v2 builds force NEXT_PUBLIC_BASE_PATH= (empty) so the bundle ships at root
#   - exits non-zero on the first failing step (set -e)
#

set -euo pipefail

TARGET="${1:-v2}"

case "$TARGET" in
  v2)
    HOST="root@10.144.5.24"
    REMOTE_PATH="/data/ai-registry-v2"
    PM2_NAME="ai-registry-v2"
    BASE_PATH=""
    URL="https://www.airegistry.mu/"
    ;;
  legacy)
    HOST="admin@10.10.117.249"
    REMOTE_PATH="/data/ui/ai-registry"
    PM2_NAME="ai-registry"
    BASE_PATH="/ui/ai-registry"
    URL="https://specialprojects.telecom.mu/ui/ai-registry/"
    ;;
  *)
    echo "✗ unknown target: $TARGET (use 'v2' or 'legacy')" >&2
    exit 2
    ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "━━━ AI Registry deploy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Target:        $TARGET"
echo "  Host:          $HOST"
echo "  Remote path:   $REMOTE_PATH"
echo "  PM2 service:   $PM2_NAME"
echo "  Public URL:    $URL"
echo "  Repo:          $REPO_ROOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

echo "▸ 1/6  git pull --rebase (catch up with origin/main)"
git pull --rebase origin main

echo
echo "▸ 2/6  clean .next/"
rm -rf .next

echo
echo "▸ 3/6  npm run build  (NEXT_PUBLIC_BASE_PATH='${BASE_PATH}')"
NEXT_PUBLIC_BASE_PATH="$BASE_PATH" npm run build

BUILD_ID="$(cat .next/BUILD_ID)"
echo "    .next/BUILD_ID = $BUILD_ID"

echo
echo "▸ 4/6  rsync -avzR --delete (with relative paths) → $HOST:$REMOTE_PATH"
rsync -avzR --delete -e /usr/bin/ssh \
  .next src/generated src/prisma src/lib docker docker-compose.yml \
  package.json package-lock.json next.config.mjs \
  "$HOST:$REMOTE_PATH/"

echo
echo "▸ 5/6  remote: npm install + deploy:db"
ssh "$HOST" bash -se <<EOF
  set -euo pipefail
  cd "$REMOTE_PATH"
  echo "  - npm install"
  npm install --silent
  echo "  - npm run deploy:db"
  npm run deploy:db
EOF

echo
echo "▸ 6/6  remote: pm2 restart $PM2_NAME + tail logs"
ssh "$HOST" bash -se <<EOF
  set -euo pipefail
  cd "$REMOTE_PATH"
  pm2 restart "$PM2_NAME" --update-env
  pm2 save
  echo
  echo "  pm2 status:"
  pm2 jlist | python3 -c "import sys, json; [print(f'    {p[\"name\"]:<24} {p[\"pm2_env\"][\"status\"]:<10} uptime={p[\"pm2_env\"][\"pm_uptime\"]}') for p in json.load(sys.stdin)]" 2>/dev/null || pm2 list
  echo
  echo "  recent logs:"
  pm2 logs "$PM2_NAME" --lines 15 --nostream
EOF

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ deploy complete  →  $URL"
echo "  BUILD_ID: $BUILD_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
