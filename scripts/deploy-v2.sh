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
  apps/portal/next.config.mjs \
  apps/portal/package.json \
  packages/core \
  packages/public \
  packages/sdk \
  packages/ui-kit \
  packages/plugin-host \
  extensions \
  docker docker-compose.yml \
  package.json pnpm-lock.yaml pnpm-workspace.yaml \
  "${HOST}:${REMOTE_APP}/"
echo

# ── 4/5 remote install + Prisma regen + engine symlink + DB sync + restart
echo "▸ 4/5  Remote: pnpm install + prisma:generate + engine symlink + deploy:db + pm2 restart"
${SSH} "${HOST}" "
  set -euo pipefail
  cd ${REMOTE_APP}
  if ! command -v pnpm >/dev/null 2>&1; then
    echo '  pnpm not found on server — installing globally'
    npm install -g pnpm
  fi
  pnpm install
  pnpm prisma:generate

  # Prisma engine symlink: the .next bundle searches
  # apps/portal/src/generated/prisma first; point it at the real engine dir
  # in packages/core. Recreated every deploy in case the path moves.
  mkdir -p apps/portal/src/generated
  ln -sfn ${REMOTE_APP}/packages/core/src/generated/prisma apps/portal/src/generated/prisma

  # Review-thread attachment storage. Created if missing; never wiped by
  # the rsync above because it lives outside any synced path. chmod 700
  # so only the app user can read uploaded files.
  mkdir -p ${REMOTE_APP}/storage/threads
  chmod 700 ${REMOTE_APP}/storage

  # Schema sync. --accept-data-loss is safe here: the warnings are about
  # newly-added unique constraints on nullable columns where no duplicate
  # data can exist yet. If a future migration actually has lossy intent,
  # promote to 'prisma migrate deploy' instead.
  pnpm --filter @airegistry/core exec dotenv -e ../../.env -- \
    prisma db push --skip-generate --accept-data-loss

  # Seed lookup tables that the migration SQL inserts cannot reach via
  # db push (db push only syncs schema, not migration SQL). Idempotent.
  pnpm tsx scripts/seed-lookups.ts

  # Backfill v1 ResourceVersion for any existing resource that lacks one
  # (same db-push limitation). Idempotent.
  pnpm tsx scripts/backfill-resource-versions.ts

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
