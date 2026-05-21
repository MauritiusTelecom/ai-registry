#!/usr/bin/env bash
#
# Deploy to v2 production at https://www.airegistry.mu/ (root@10.144.5.24).
# Monorepo-aware. Backs up on the server first, then builds + rsyncs.
#
# Usage:
#     pnpm deploy:v2
#
# Hard rules:
#   - NEXT_PUBLIC_BASE_PATH= empty (v2 serves at root, not /ui/ai-registry)
#   - rsync uses -R to preserve apps/portal/ and packages/core/ prefixes
#   - backup runs first; if backup fails the deploy aborts
#
# Rollback command is printed at the end so you can paste it if needed.

set -euo pipefail

HOST="root@10.144.5.24"
REMOTE_DIR="/data"
APP_DIR="ai-registry-v2"
REMOTE_APP="${REMOTE_DIR}/${APP_DIR}"
PM2_NAME="ai-registry-v2"
URL="https://www.airegistry.mu/"

SSH=/usr/bin/ssh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

echo "━━━ AI Registry deploy → v2 (${URL}) ━━━━━━━━━━━━━━━━━━━━━━"
echo "  Host:    ${HOST}"
echo "  Remote:  ${REMOTE_APP}"
echo "  PM2:     ${PM2_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# ── 1/5 backup on the server ─────────────────────────────────────
echo "▸ 1/5  Backup on server"
TS="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${APP_DIR}-backup-${TS}.tar.gz"
${SSH} "${HOST}" "
  set -euo pipefail
  cd ${REMOTE_DIR}
  tar --exclude='${APP_DIR}/node_modules' \
      --exclude='${APP_DIR}/apps/portal/node_modules' \
      --exclude='${APP_DIR}/packages/*/node_modules' \
      --exclude='${APP_DIR}/.next/cache' \
      --exclude='${APP_DIR}/apps/portal/.next/cache' \
      -czf '${ARCHIVE}' '${APP_DIR}'
  ls -lh '${ARCHIVE}'
"
echo

# ── 2/5 regenerate Prisma client, clean + build for v2 ──────────
echo "▸ 2/5  Regenerate Prisma client + clean + build (NEXT_PUBLIC_BASE_PATH= empty)"
pnpm prisma:generate
rm -rf apps/portal/.next
NEXT_PUBLIC_BASE_PATH= pnpm --filter @airegistry/portal build
echo

# ── 3/5 rsync to the server ──────────────────────────────────────
echo "▸ 3/5  Rsync to ${REMOTE_APP}"
rsync -avzR --delete -e "${SSH}" \
  apps/portal/.next \
  packages/core/src/generated \
  packages/core/prisma \
  docker docker-compose.yml \
  package.json pnpm-lock.yaml pnpm-workspace.yaml \
  apps/portal/next.config.mjs \
  packages/core/package.json \
  apps/portal/package.json \
  "${HOST}:${REMOTE_APP}/"
echo

# ── 4/5 remote install + DB sync + restart ──────────────────────
echo "▸ 4/5  Remote: pnpm install + deploy:db + pm2 restart"
${SSH} "${HOST}" "
  set -euo pipefail
  cd ${REMOTE_APP}
  if ! command -v pnpm >/dev/null 2>&1; then
    echo '  pnpm not found on server — installing globally'
    npm install -g pnpm
  fi
  pnpm install
  pnpm deploy:db
  pm2 restart ${PM2_NAME}
"
echo

# ── 5/5 tail logs ────────────────────────────────────────────────
echo "▸ 5/5  Recent pm2 logs"
${SSH} "${HOST}" "pm2 logs ${PM2_NAME} --lines 30 --nostream"

echo
echo "✓ Deploy complete."
echo "   Visit:  ${URL}"
echo "   Backup: ${REMOTE_DIR}/${ARCHIVE}"
echo
echo "   Rollback (if needed):"
echo "     ${SSH} ${HOST} 'cd ${REMOTE_DIR} && pm2 stop ${PM2_NAME} && mv ${APP_DIR} ${APP_DIR}.broken && tar -xzf ${ARCHIVE} && cd ${APP_DIR} && pnpm install && pm2 restart ${PM2_NAME}'"
