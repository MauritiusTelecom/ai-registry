#!/usr/bin/env bash
# =============================================================================
# deploy.config.example.sh
# -----------------------------------------------------------------------------
# Copy to deploy/deploy.config.sh (gitignored) and edit values for your server.
# This file holds NON-SECRET configuration only — host, paths, user names.
# Real secrets live in deploy/secrets/.env.production.
# =============================================================================

# SSH target. Use a hostname from ~/.ssh/config when possible — it keeps the
# IdentityFile, Port, and User out of this file and out of your shell history.
#   Host airegistry-prod
#     HostName 203.0.113.10
#     User deploy
#     Port 22
#     IdentityFile ~/.ssh/airegistry_ed25519
#     IdentitiesOnly yes
export DEPLOY_SSH_HOST="airegistry-prod"

# Path on the server where releases are unpacked. Owned by DEPLOY_USER.
# Layout:
#   $DEPLOY_APP_DIR/
#     current  -> releases/2026-05-12_14-30-00  (symlink, atomic switch)
#     releases/<timestamp>/                     (kept, last N retained)
#     shared/.env.production                    (symlinked into each release)
export DEPLOY_APP_DIR="/var/www/airegistry"

# User on the server that owns DEPLOY_APP_DIR and runs the PM2 process.
# Created by deploy/bootstrap-server.sh.
export DEPLOY_USER="deploy"

# Public URL used for the post-deploy health check. Must return 200.
export DEPLOY_HEALTH_URL="https://airegistry.mu/api/health"

# PM2 application name. Must match `name` in deploy/ecosystem.config.cjs.
export DEPLOY_PM2_NAME="airegistry"

# How many old releases to retain on the server for rollback.
export DEPLOY_KEEP_RELEASES=5

# Node version expected on the server (informational; bootstrap installs it).
export DEPLOY_NODE_VERSION="20"
