#!/usr/bin/env node
/**
 * Point this clone's git hooks at `.githooks/` (runs on `pnpm install` via prepare).
 * Skips silently when .git is missing (e.g. exported tarball) or git is unavailable.
 */
import { execSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";
import { join } from "node:path";

const hook = join(".githooks", "pre-commit");

if (!existsSync(".git")) {
  process.exit(0);
}

if (!existsSync(hook)) {
  console.warn("install-git-hooks: missing .githooks/pre-commit — skipped");
  process.exit(0);
}

try {
  execSync("git config core.hooksPath .githooks", { stdio: "pipe" });
  chmodSync(hook, 0o755);
  console.log("install-git-hooks: core.hooksPath → .githooks (pre-commit runs check:env-secrets)");
} catch {
  // CI or read-only .git — do not fail the install.
  process.exit(0);
}
