#!/usr/bin/env bash
#
# Backup the v2 production app directory on the server.
#
# Creates a timestamped tarball in /data/ on root@10.144.5.24, excluding
# node_modules and any .next/cache directories so the archive stays small.
#
# Run before any risky deploy:
#     pnpm backup:prod
#
# Restore (replace <TIMESTAMP> with the actual filename printed below):
#     ssh root@10.144.5.24
#     cd /data
#     pm2 stop ai-registry-v2
#     mv ai-registry-v2 ai-registry-v2.broken
#     tar -xzf ai-registry-v2-backup-<TIMESTAMP>.tar.gz
#     cd ai-registry-v2 && pnpm install && pm2 restart ai-registry-v2

set -euo pipefail

HOST="root@10.144.5.24"
REMOTE_DIR="/data"
APP_DIR="ai-registry-v2"
TS="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${APP_DIR}-backup-${TS}.tar.gz"

echo "▸ Backing up ${HOST}:${REMOTE_DIR}/${APP_DIR}"
echo "  Archive:    ${ARCHIVE}"
echo

/usr/bin/ssh "${HOST}" "
  set -euo pipefail
  cd ${REMOTE_DIR}
  tar --exclude='${APP_DIR}/node_modules' \
      --exclude='${APP_DIR}/apps/portal/node_modules' \
      --exclude='${APP_DIR}/packages/*/node_modules' \
      --exclude='${APP_DIR}/.next/cache' \
      --exclude='${APP_DIR}/apps/portal/.next/cache' \
      -czf '${ARCHIVE}' '${APP_DIR}'
  echo
  echo '▸ Backup created:'
  ls -lh '${ARCHIVE}'
  echo
  echo '▸ Existing backups (most recent first):'
  ls -lht ${APP_DIR}-backup-*.tar.gz | head -5
"

echo
echo "✓ Backup complete."
echo "  Restore command:"
echo "    /usr/bin/ssh ${HOST} 'cd ${REMOTE_DIR} && pm2 stop ai-registry-v2 && mv ${APP_DIR} ${APP_DIR}.broken && tar -xzf ${ARCHIVE} && cd ${APP_DIR} && pnpm install && pm2 restart ai-registry-v2'"
