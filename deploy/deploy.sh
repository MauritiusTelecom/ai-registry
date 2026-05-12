#!/usr/bin/env bash
# =============================================================================
# deploy.sh — local pipeline for shipping ai-registry to the prod server.
# -----------------------------------------------------------------------------
# Pipeline stages (each fails the deploy on non-zero exit):
#
#   1.  Pre-flight     check config, secrets, ssh
#   2.  Quality gates  typecheck, lint
#   3.  Build          next build (emits .next/standalone)
#   4.  Stage          assemble a self-contained release directory locally
#   5.  Ship           rsync release to server, atomically into a new dir
#   6.  Activate       symlink `current` -> new release, pm2 startOrReload
#   7.  Verify         hit the health URL; on failure, roll back
#   8.  Prune          keep only the most recent N releases on the server
#
# Run with:
#
#   npm run deploy                              # standard
#   SKIP_LINT=1 npm run deploy                  # skip eslint
#   SKIP_TYPECHECK=1 npm run deploy             # skip tsc
#   RELEASE_TAG=hotfix-2026-05-12 npm run deploy
#   DRY_RUN=1 npm run deploy                    # everything except rsync/pm2
#
# Roll back manually without re-deploying:
#
#   ssh $DEPLOY_SSH_HOST 'cd /var/www/airegistry && \
#     ln -nfs releases/<previous-timestamp> current.new && \
#     mv -Tf current.new current && \
#     pm2 reload airegistry'
# =============================================================================

set -Eeuo pipefail

# ----- Paths ----------------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$REPO_ROOT/deploy"
CONFIG_FILE="$DEPLOY_DIR/deploy.config.sh"
SECRET_ENV="$DEPLOY_DIR/secrets/.env.production"
BUILD_DIR="$DEPLOY_DIR/build"
STAGE_DIR="$BUILD_DIR/release"

# ----- Output helpers -------------------------------------------------------
if [[ -t 1 ]]; then
  C_BLUE=$'\033[1;34m'; C_GREEN=$'\033[1;32m'; C_YELLOW=$'\033[1;33m'
  C_RED=$'\033[1;31m';  C_DIM=$'\033[2m';     C_RESET=$'\033[0m'
else
  C_BLUE=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_DIM=""; C_RESET=""
fi

step() { printf "\n${C_BLUE}▸ %s${C_RESET}\n" "$*"; }
info() { printf "  ${C_DIM}%s${C_RESET}\n" "$*"; }
ok()   { printf "  ${C_GREEN}✓ %s${C_RESET}\n" "$*"; }
warn() { printf "  ${C_YELLOW}! %s${C_RESET}\n" "$*"; }
fail() { printf "  ${C_RED}✗ %s${C_RESET}\n" "$*" >&2; }
die()  { fail "$*"; exit 1; }

# Time how long the whole thing takes.
START_TS=$SECONDS
on_exit() {
  local rc=$?
  if [[ $rc -eq 0 ]]; then
    printf "\n${C_GREEN}✓ deploy succeeded in %ds${C_RESET}\n" "$((SECONDS - START_TS))"
  else
    printf "\n${C_RED}✗ deploy failed after %ds (exit %d)${C_RESET}\n" \
      "$((SECONDS - START_TS))" "$rc" >&2
  fi
}
trap on_exit EXIT

# =============================================================================
# 1.  Pre-flight
# =============================================================================
step "1/8  Pre-flight"

[[ -f "$CONFIG_FILE" ]] || die "Missing $CONFIG_FILE.
  Copy deploy/deploy.config.example.sh to deploy/deploy.config.sh and edit."
# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${DEPLOY_SSH_HOST:?DEPLOY_SSH_HOST not set in deploy.config.sh}"
: "${DEPLOY_APP_DIR:?DEPLOY_APP_DIR not set in deploy.config.sh}"
: "${DEPLOY_USER:?DEPLOY_USER not set in deploy.config.sh}"
: "${DEPLOY_HEALTH_URL:?DEPLOY_HEALTH_URL not set in deploy.config.sh}"
: "${DEPLOY_PM2_NAME:?DEPLOY_PM2_NAME not set in deploy.config.sh}"
DEPLOY_KEEP_RELEASES="${DEPLOY_KEEP_RELEASES:-5}"

[[ -f "$SECRET_ENV" ]] || die "Missing $SECRET_ENV.
  Copy deploy/.env.production.example to deploy/secrets/.env.production,
  fill in real values, and: chmod 600 deploy/secrets/.env.production"

# Refuse to ship if the secret file is world-readable.
PERM=$(stat -c '%a' "$SECRET_ENV" 2>/dev/null || stat -f '%A' "$SECRET_ENV")
if [[ "$PERM" != "600" && "$PERM" != "400" ]]; then
  die "$SECRET_ENV has permissions $PERM. Run: chmod 600 $SECRET_ENV"
fi

# Refuse to ship a file that still contains the example placeholders.
if grep -qE '(REPLACE|USER:PASSWORD@DB_HOST|REPLACE_WITH_32_BYTE_BASE64URL_SECRET)' "$SECRET_ENV"; then
  die "$SECRET_ENV still contains placeholder values. Fill in real secrets first."
fi

ok "config: $CONFIG_FILE"
ok "secrets: $SECRET_ENV ($PERM)"

# Validate we can SSH non-interactively. -o BatchMode=yes refuses to prompt.
info "Verifying SSH to $DEPLOY_SSH_HOST..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=8 "$DEPLOY_SSH_HOST" "true" 2>/dev/null; then
  die "Cannot SSH to $DEPLOY_SSH_HOST without prompting. Add the host to
  ~/.ssh/config and ensure your key is loaded (try: ssh-add -l)."
fi
ok "ssh: $DEPLOY_SSH_HOST"

# Verify rsync is on the remote (it almost always is).
ssh -o BatchMode=yes "$DEPLOY_SSH_HOST" "command -v rsync >/dev/null" \
  || die "rsync not installed on remote. Install: sudo apt install rsync"
ok "remote tools present"

# Verify required local tools.
for bin in node npm rsync ssh tar curl; do
  command -v "$bin" >/dev/null || die "Required tool not found locally: $bin"
done
ok "local tools present"

# =============================================================================
# 2.  Quality gates
# =============================================================================
step "2/8  Quality gates"
cd "$REPO_ROOT"

# Use a clean install only if package-lock changed since last install.
# `npm ci` is correct for CI but slow; for the local pipeline we trust the
# lockfile is up to date and use a regular `npm install` once.
if [[ ! -d node_modules ]]; then
  info "Installing dependencies (first run)..."
  npm install --no-audit --no-fund
fi

if [[ -z "${SKIP_TYPECHECK:-}" ]]; then
  info "Typecheck (tsc --noEmit)..."
  npx --no-install tsc --noEmit
  ok "typecheck clean"
else
  warn "SKIP_TYPECHECK=1 — skipping tsc"
fi

if [[ -z "${SKIP_LINT:-}" ]]; then
  info "Lint (next lint)..."
  npm run -s lint
  ok "lint clean"
else
  warn "SKIP_LINT=1 — skipping eslint"
fi

# =============================================================================
# 3.  Build
# =============================================================================
step "3/8  Build"

# Prisma client must be generated for the build to typecheck the imports.
info "Prisma generate..."
npm run -s prisma:generate

info "next build (output: standalone)..."
NODE_ENV=production npm run -s build
ok "build complete"

# Sanity-check that the standalone output exists where we expect.
[[ -f "$REPO_ROOT/.next/standalone/server.js" ]] \
  || die "Expected .next/standalone/server.js after build. Did you remove
  output: 'standalone' from next.config.mjs?"

# =============================================================================
# 4.  Stage
# =============================================================================
step "4/8  Stage release"

rm -rf "$BUILD_DIR"
mkdir -p "$STAGE_DIR"

# Standalone bundle: server.js, node_modules (traced minimal subset), package.json
info "Copying standalone bundle..."
cp -a "$REPO_ROOT/.next/standalone/." "$STAGE_DIR/"

# Static assets: standalone does NOT include these — must be copied in.
info "Copying .next/static and public..."
mkdir -p "$STAGE_DIR/.next"
cp -a "$REPO_ROOT/.next/static" "$STAGE_DIR/.next/static"
if [[ -d "$REPO_ROOT/public" ]]; then
  cp -a "$REPO_ROOT/public" "$STAGE_DIR/public"
fi

# Prisma schema for `prisma migrate deploy` on the server (optional step,
# triggered with `npm run deploy:db`, not by this script).
if [[ -d "$REPO_ROOT/src/prisma" ]]; then
  mkdir -p "$STAGE_DIR/prisma"
  cp -a "$REPO_ROOT/src/prisma/." "$STAGE_DIR/prisma/"
fi

# PM2 ecosystem file lives at the release root.
cp -a "$DEPLOY_DIR/ecosystem.config.cjs" "$STAGE_DIR/ecosystem.config.cjs"

# Embed a tiny RELEASE file so it's trivial to see what's deployed.
RELEASE_TAG="${RELEASE_TAG:-$(date -u +%Y-%m-%d_%H-%M-%S)}"
GIT_SHA=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "no-git")
GIT_BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no-git")
GIT_DIRTY=$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null | head -1)
cat > "$STAGE_DIR/RELEASE" <<EOF
tag:        $RELEASE_TAG
git_sha:    $GIT_SHA
git_branch: $GIT_BRANCH
git_dirty:  $([[ -n "$GIT_DIRTY" ]] && echo "yes" || echo "no")
built_at:   $(date -u +"%Y-%m-%dT%H:%M:%SZ")
built_by:   $(whoami)@$(hostname)
node:       $(node -v)
EOF
ok "staged: $STAGE_DIR ($(du -sh "$STAGE_DIR" | cut -f1))"
info "release tag: $RELEASE_TAG ($GIT_SHA)"

if [[ -n "$GIT_DIRTY" ]]; then
  warn "Working tree has uncommitted changes — RELEASE file marks this build dirty."
fi

# =============================================================================
# 5.  Ship
# =============================================================================
step "5/8  Ship to $DEPLOY_SSH_HOST"

REMOTE_RELEASE="$DEPLOY_APP_DIR/releases/$RELEASE_TAG"
REMOTE_TMP="$REMOTE_RELEASE.tmp"

if [[ -n "${DRY_RUN:-}" ]]; then
  warn "DRY_RUN=1 — stopping before any remote mutation."
  info "Would rsync $STAGE_DIR/ to $DEPLOY_SSH_HOST:$REMOTE_TMP"
  exit 0
fi

# Make sure the destination tree exists.
ssh "$DEPLOY_SSH_HOST" "mkdir -p '$DEPLOY_APP_DIR/releases' '$DEPLOY_APP_DIR/shared'"

# rsync the release into a temporary directory, then atomically rename. The
# atomic rename means an interrupted rsync never produces a half-deployed
# release directory that current/ might accidentally point to.
info "rsync release..."
rsync -az --delete --info=stats1 \
  -e "ssh -o BatchMode=yes" \
  "$STAGE_DIR/" \
  "$DEPLOY_SSH_HOST:$REMOTE_TMP/"
ok "release uploaded to $REMOTE_TMP"

# Ship the secret env separately so it lands in shared/ (not the release dir).
# 0600 on both ends.
info "rsync .env.production to shared/..."
rsync -az --chmod=0600 \
  -e "ssh -o BatchMode=yes" \
  "$SECRET_ENV" \
  "$DEPLOY_SSH_HOST:$DEPLOY_APP_DIR/shared/.env.production"
ok "secret env uploaded"

# =============================================================================
# 6.  Activate
# =============================================================================
step "6/8  Activate"

# Single remote script so we can roll back in one shot if anything fails.
# All variable interpolation happens here, on the laptop, so the remote
# script never sees secrets — only paths. Server-side vars are \$-escaped.
# shellcheck disable=SC2087
ssh "$DEPLOY_SSH_HOST" bash -se <<REMOTE
set -Eeuo pipefail

APP_DIR="$DEPLOY_APP_DIR"
RELEASE_DIR="$REMOTE_RELEASE"
TMP_DIR="$REMOTE_TMP"
PM2_NAME="$DEPLOY_PM2_NAME"

cd "\$APP_DIR"

# 6a. Atomic rename of the staged release into its final name.
mv -T "\$TMP_DIR" "\$RELEASE_DIR"

# 6b. Symlink shared env into the release.
ln -sf "\$APP_DIR/shared/.env.production" "\$RELEASE_DIR/.env.production"

# 6c. Remember previous release for rollback.
if [[ -L current ]]; then
  PREVIOUS=\$(readlink current)
else
  PREVIOUS=""
fi
echo "previous release: \${PREVIOUS:-<none>}"

# 6d. Atomic symlink swap: build the new symlink under a temp name, then
# rename it on top of current. This is a single inode swap — no instant where
# current points at nothing.
ln -nsf "\$RELEASE_DIR" "\$APP_DIR/current.new"
mv -Tf "\$APP_DIR/current.new" "\$APP_DIR/current"
echo "current -> \$RELEASE_DIR"

# 6e. Reload PM2 with the new release. Load env vars first so PM2 picks them
# up; --update-env makes it re-read from the current process env on reload.
set -a
# shellcheck disable=SC1091
source "\$APP_DIR/shared/.env.production"
set +a

cd "\$APP_DIR/current"
if pm2 describe "\$PM2_NAME" >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs --update-env
fi
pm2 save >/dev/null
echo "pm2 reloaded"
REMOTE
ok "release activated"

# =============================================================================
# 7.  Verify
# =============================================================================
step "7/8  Health check"

ATTEMPTS=15
SLEEP=2
HTTP=""
for i in $(seq 1 $ATTEMPTS); do
  HTTP=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "$DEPLOY_HEALTH_URL" || echo "000")
  if [[ "$HTTP" == "200" ]]; then
    ok "health 200 at $DEPLOY_HEALTH_URL (attempt $i/$ATTEMPTS)"
    break
  fi
  info "attempt $i/$ATTEMPTS: $HTTP — retrying in ${SLEEP}s"
  sleep "$SLEEP"
done

if [[ "$HTTP" != "200" ]]; then
  fail "Health check failed (last status: $HTTP). Rolling back."
  # shellcheck disable=SC2087
  ssh "$DEPLOY_SSH_HOST" bash -se <<REMOTE
set -Eeuo pipefail
cd "$DEPLOY_APP_DIR"
# Find the most recent release that ISN'T the broken one.
BROKEN="$(basename "$REMOTE_RELEASE")"
PREV=\$(ls -1 releases | grep -v "^\$BROKEN\$" | sort -r | head -1 || true)
if [[ -z "\$PREV" ]]; then
  echo "no previous release to roll back to" >&2
  exit 1
fi
echo "rolling current -> releases/\$PREV"
ln -nsf "releases/\$PREV" current.new
mv -Tf current.new current

cd current
set -a; source "$DEPLOY_APP_DIR/shared/.env.production"; set +a
pm2 reload ecosystem.config.cjs --update-env
pm2 save >/dev/null
REMOTE
  die "Rolled back. Inspect with: ssh $DEPLOY_SSH_HOST 'pm2 logs $DEPLOY_PM2_NAME --lines 100'"
fi

# =============================================================================
# 8.  Prune old releases
# =============================================================================
step "8/8  Prune (keep $DEPLOY_KEEP_RELEASES)"
# shellcheck disable=SC2087
ssh "$DEPLOY_SSH_HOST" bash -se <<REMOTE
set -Eeuo pipefail
cd "$DEPLOY_APP_DIR/releases"
KEEP=$DEPLOY_KEEP_RELEASES
CURRENT_TARGET=\$(basename "\$(readlink "$DEPLOY_APP_DIR/current")")
# List releases newest first, skip the first KEEP, never delete current target.
ls -1t | tail -n +\$((KEEP + 1)) | while read -r r; do
  if [[ "\$r" == "\$CURRENT_TARGET" ]]; then continue; fi
  echo "removing old release: \$r"
  rm -rf -- "\$r"
done
REMOTE
ok "prune complete"

printf "\n${C_GREEN}Deployed:${C_RESET} %s\n" "$RELEASE_TAG"
printf "${C_GREEN}Health:${C_RESET}   %s\n"  "$DEPLOY_HEALTH_URL"
