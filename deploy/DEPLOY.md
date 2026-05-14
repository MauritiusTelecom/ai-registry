# Deploying ai-registry

This is the deploy pipeline that runs from your laptop and ships the Next.js
app to the production VPS. It is designed for the case where you have shell
access to the server, want full control of what runs, and don't want to put
secrets into a hosted CI provider.

```
laptop  ──[ssh]──▶  VPS
  │                  ├─ deploy user (no password, key-only ssh)
  │                  ├─ /var/www/airegistry/
  │                  │    ├─ current ─▶ releases/<timestamp>
  │                  │    ├─ releases/<timestamp>/
  │                  │    │    ├─ server.js  (Next.js standalone)
  │                  │    │    ├─ .next/static, public/, prisma/
  │                  │    │    └─ ecosystem.config.cjs
  │                  │    └─ shared/.env.production   (chmod 600)
  │                  ├─ pm2 (cluster mode, systemd-supervised)
  │                  └─ nginx ──▶ 127.0.0.1:3002 (Next process)
  │                              with TLS via Let's Encrypt
  │
  └─ deploy/secrets/.env.production   (chmod 600, gitignored)
     deploy/deploy.config.sh          (host/user/paths, gitignored)
```

The rest of this file walks through:

1. First-time server setup
2. Moving your secrets out of plain text notes (do this NOW)
3. The day-to-day deploy flow
4. Rolling back
5. Applying schema changes

---

## 1. First-time server setup

You only do this once per server.

### 1a. Generate an SSH key dedicated to this deploy

On your laptop:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/airegistry_ed25519 -C "airegistry-deploy"
# When asked for a passphrase, USE ONE. It will be cached by ssh-agent.
```

Add it to your ssh-agent so the deploy script can use it without prompting:

```bash
ssh-add ~/.ssh/airegistry_ed25519
```

### 1b. Run the server bootstrap

Copy `deploy/bootstrap-server.sh` onto the new VPS and run it as root with
the **public** half of the key you just made:

```bash
scp deploy/bootstrap-server.sh root@<server-ip>:/tmp/
ssh root@<server-ip> "SSH_PUBKEY='$(cat ~/.ssh/airegistry_ed25519.pub)' bash /tmp/bootstrap-server.sh"
```

The script installs Node 20, PM2, Nginx, ufw, fail2ban; creates a `deploy`
user; locks SSH to key-only; and lays out `/var/www/airegistry/`. It's
idempotent — re-running it later is safe.

### 1c. Wire your laptop up

Add the host to `~/.ssh/config`:

```sshconfig
Host airegistry-prod
  HostName 203.0.113.10
  User deploy
  Port 22
  IdentityFile ~/.ssh/airegistry_ed25519
  IdentitiesOnly yes
```

Then copy the config and secret templates into place:

```bash
cp deploy/deploy.config.example.sh deploy/deploy.config.sh
cp deploy/.env.production.example  deploy/secrets/.env.production
chmod 600 deploy/secrets/.env.production
```

Edit both files with real values (see next section).

### 1d. Install the Nginx site + Let's Encrypt cert

The first deploy will land the app at `127.0.0.1:3002` on the server but
won't be reachable publicly yet. Install the Nginx site config and issue the
cert:

```bash
ssh airegistry-prod 'sudo install -d /etc/nginx/sites-available'
scp deploy/nginx/airegistry.mu.conf airegistry-prod:/tmp/
ssh airegistry-prod '
  sudo mv /tmp/airegistry.mu.conf /etc/nginx/sites-available/
  sudo ln -sf /etc/nginx/sites-available/airegistry.mu.conf /etc/nginx/sites-enabled/
  sudo certbot --nginx -d airegistry.mu -d www.airegistry.mu \
       --redirect --hsts --staple-ocsp \
       -m admin@airegistry.mu --agree-tos -n
  sudo nginx -t && sudo systemctl reload nginx
'
```

Certbot installs a systemd timer that auto-renews. Verify with:

```bash
ssh airegistry-prod 'systemctl list-timers | grep certbot'
```

---

## 2. Move secrets out of the notes file (do this first)

Right now your prod-looking credentials live in plain text. That's the
single most important thing to fix before you deploy anything else, because
the longer they sit there the more places they leak to (chat history,
backups, screen shares).

**Steps:**

1. Open `deploy/secrets/.env.production`. Paste each key from your notes
   into it, one at a time.

2. **Rotate every secret you paste.** Any value that has been in a notes
   file should be considered burned. In particular:

   | Variable | How to rotate |
   |---|---|
   | `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
   | `SMTP_PASS` (Office 365) | Generate a new app password in the M365 admin portal; rotate immediately. |
   | `DATABASE_URL` password | Update in your Postgres admin, then update the DSN here. |
   | `SEED_ADMIN_PASSWORD` / `SEED_PROVIDER_PASSWORD` | Pick fresh values; remove from `.env` after first seed so they don't keep reapplying. |

3. Confirm permissions: `chmod 600 deploy/secrets/.env.production`. The
   deploy script refuses to run if the file is world-readable.

4. Delete the notes file. Empty your clipboard. If the notes file was in a
   cloud-synced folder (iCloud Drive, OneDrive, Dropbox), assume copies
   exist in versioned backups for the retention window and treat the old
   credentials as compromised — that's why step 2 matters.

5. From now on, `deploy/secrets/.env.production` is the single source of
   truth for runtime secrets. Back it up with a password manager (1Password,
   Bitwarden — "Secure Note" or "Document" item), not a text file.

The same applies to the committed `.env` at the repo root: it currently
contains real-looking SMTP and admin credentials. The `.gitignore` keeps it
off git, but if it was ever pushed before `.gitignore` was added, those
credentials are in the git history. Check with:

```bash
git log --all -- .env
```

If it shows commits, rotate everything in it.

---

## 3. Day-to-day deploy

Once 1–2 are done, every release looks like this:

```bash
npm run deploy
```

That runs the full pipeline:

1. **Pre-flight** — verifies config, secret-file perms, SSH reachability.
2. **Quality gates** — `tsc --noEmit`, `next lint`. Set `SKIP_LINT=1` or
   `SKIP_TYPECHECK=1` to bypass for emergencies.
3. **Build** — `prisma generate` then `next build` (emits
   `.next/standalone/`).
4. **Stage** — assembles a self-contained release directory locally:
   standalone bundle + `.next/static` + `public/` + `prisma/` schema +
   `ecosystem.config.cjs` + a `RELEASE` manifest.
5. **Ship** — `rsync` to `releases/<timestamp>.tmp/`, then atomic rename to
   `releases/<timestamp>/`. `.env.production` is rsync'd separately into
   `shared/`.
6. **Activate** — symlink-swap `current → releases/<timestamp>`, then
   `pm2 reload` (cluster-mode rolling reload = zero downtime).
7. **Verify** — polls `DEPLOY_HEALTH_URL` until 200 or fails. On failure,
   automatically rolls the symlink back to the previous release and reloads
   PM2.
8. **Prune** — keeps the most recent `DEPLOY_KEEP_RELEASES` (default 5).

**Useful flags:**

```bash
DRY_RUN=1 npm run deploy        # everything up to the rsync
RELEASE_TAG=hotfix npm run deploy
SKIP_LINT=1 SKIP_TYPECHECK=1 npm run deploy   # emergency hot path
```

---

## 4. Roll back

Auto-rollback fires when the health check fails. To roll back manually:

```bash
ssh airegistry-prod '
  cd /var/www/airegistry
  echo "Available releases:"; ls -1t releases
  read -p "Roll back to: " R
  ln -nsf releases/$R current.new && mv -Tf current.new current
  cd current
  set -a; source /var/www/airegistry/shared/.env.production; set +a
  pm2 reload ecosystem.config.cjs --update-env
'
```

---

## 5. Schema changes

`npm run deploy` does **not** touch the database. Apply schema changes
explicitly:

```bash
npm run deploy:db:remote
```

That `prisma db push`es the schema currently shipped in the live release.
Deploy code first, then schema, so the running app already knows about new
columns when the DB grows them. (If you're dropping columns or doing
breaking renames, you want the inverse order and an intermediate compat
release — talk it through before pushing.)

---

## Trust model and what the pipeline does *not* do

- **No secrets in CI.** Everything sensitive lives on your laptop
  (`deploy/secrets/`) and on the server (`/var/www/airegistry/shared/`).
  The deploy script never logs secret values.
- **No secrets baked into the release tarball.** The release dir gets a
  symlink to `shared/.env.production`; the file itself is never copied into
  the release directory, so a leaked release tarball doesn't leak env.
- **No deploy keys checked into git.** `deploy.config.sh` and
  `deploy/secrets/` are gitignored.
- **No reliance on the example `AUTH_SECRET`.** Generate your own — the
  example file's value is a placeholder, not a secret.
- **No automatic schema changes.** Required by design (see §5).

What this pipeline doesn't give you, and what's worth adding next as you
grow:

- Off-host build (so a compromised laptop can't ship a poisoned build).
- Automated dependency-vulnerability gate (`npm audit --omit=dev` in the
  quality-gates step).
- Backups + tested restore for the Postgres data.
- Centralised log shipping (right now logs live on the box in
  `/var/log/airegistry/`).
- Container-image deploys if you outgrow PM2 (you have Docker on the box
  already, so the lift is mostly writing a Dockerfile and switching the
  release format from rsync'd tarball to image pull).
