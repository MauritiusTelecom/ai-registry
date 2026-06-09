# Team notice: git history rewrite (`.env.prod` purge)

**Send this before the force push.** Replace `[DATE]` and `[YOUR NAME]` as needed.

---

**Subject:** Required action — `ai-registry` history rewrite (force push to `main`, `develop`, `feature/localisation`)

Hi team,

We removed a production env file (`.env.prod`) from the current tree earlier, but it was still recoverable from **git history**. The repo is now **public**, so we have **rewritten local history** to purge that file from every commit on all branches.

### What we did

- Ran `git filter-repo` to delete `.env.prod` from the entire history (all branches).
- `.env` was never committed; only `.env.prod` was affected.
- **Credentials in that file must be treated as compromised** — rotation is in progress / complete (DB password, `AUTH_SECRET`, SMTP, etc.).

### What you must do after we force-push

1. **Do not** `git pull` on an existing clone — it will fail or merge bad history.
2. **Re-clone** (simplest):

   ```bash
   git clone https://github.com/MauritiusTelecom/ai-registry.git
   cd ai-registry
   pnpm install
   ```

   Or, if you must keep the same folder:

   ```bash
   git fetch origin
   git checkout main
   git reset --hard origin/main
   git clean -fd
   ```

3. Copy your local `.env` back from a safe place (never from git).
4. Old commit SHAs (e.g. `66c1364`, `12b20fa`, `e336ca2`) are **invalid** after the push — update any bookmarks, PRs, or CI pins.

### Branches affected

- `main`
- `develop`
- `feature/localisation`

### Timeline

- Force push planned: **[DATE]**
- Contact: **[YOUR NAME / Slack channel]**

Sorry for the disruption — this is required for a public repo with no secrets in history.

---

## Maintainer: commands to publish (run once, after credential rotation)

From a clean machine with the **purged** clone:

```powershell
cd D:\src\AIRegistry\ai-registry
git remote -v   # confirm origin → MauritiusTelecom/ai-registry

git push origin --force main
git push origin --force develop
git push origin --force feature/localisation
git push origin --force --tags
```

Then on GitHub: confirm `.env.prod` does not appear in file history (try searching the repo for `.env.prod`).

**Backup:** `D:\src\AIRegistry\ai-registry-backup.git` is a **pre-purge mirror** and still contains secrets. Store offline or delete securely after you verify the new history on GitHub.
