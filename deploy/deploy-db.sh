#!/usr/bin/env bash
# =============================================================================
# deploy-db.sh — run Prisma schema sync against production.
# -----------------------------------------------------------------------------
# Schema changes are kept OUT of the regular deploy.sh on purpose: applying
# them is irreversible and needs human review. Run this script when you
# explicitly want to push schema changes.
#
# It executes on the server, inside the current release directory, using the
# DATABASE_URL from shared/.env.production. It runs `prisma db push` to match
# what package.json's `deploy:db` script uses; switch to `prisma migrate
# deploy` once you've committed a real migrations/ history.
# =============================================================================

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$REPO_ROOT/deploy/deploy.config.sh"

[[ -f "$CONFIG_FILE" ]] || { echo "Missing $CONFIG_FILE" >&2; exit 1; }
# shellcheck disable=SC1090
source "$CONFIG_FILE"

read -r -p "Apply Prisma schema to ${DEPLOY_SSH_HOST}? (type 'yes'): " CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "aborted"; exit 1; }

# shellcheck disable=SC2087
ssh "$DEPLOY_SSH_HOST" bash -se <<REMOTE
set -Eeuo pipefail
cd "$DEPLOY_APP_DIR/current"
set -a; source "$DEPLOY_APP_DIR/shared/.env.production"; set +a

# Prisma CLI is included in the standalone bundle's node_modules because it's
# a dependency in the app package.json. Run it from there.
if [[ -x node_modules/.bin/prisma ]]; then
  PRISMA=node_modules/.bin/prisma
else
  PRISMA="npx --no-install prisma"
fi

echo "Schema: prisma/schema.prisma"
\$PRISMA db push --schema prisma/schema.prisma --skip-generate
echo "Schema sync complete."
REMOTE
