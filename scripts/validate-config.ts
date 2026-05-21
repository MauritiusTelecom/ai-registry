/**
 * Loads `.env` (if present) and runs the config module's validation. Exits
 * with code 0 on success, code 1 if any required key is missing or invalid.
 *
 * Run via:   npm run config:validate
 */

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { ConfigError, getConfig } from "../packages/core/src/lib/config";

// Monorepo root .env (same path Prisma scripts use via dotenv-cli -e ../../.env).
const repoRootEnv = resolve(__dirname, "../.env");
loadDotenv({ path: repoRootEnv });

try {
  const cfg = getConfig();
  console.log("✓ Configuration is valid.\n");
  console.log(`  registryName        ${cfg.registryName}`);
  console.log(`  portalDomain        ${cfg.portalDomain}`);
  console.log(`  apiBaseUrl          ${cfg.apiBaseUrl}`);
  console.log(`  jurisdiction        ${cfg.jurisdiction}`);
  console.log(`  identityDomain      ${cfg.identityDomain}`);
  console.log(`  operatorName        ${cfg.operatorName}`);
  console.log(`  supportedLanguages  ${cfg.supportedLanguages.join(", ")}`);
  console.log(`  defaultLanguage     ${cfg.defaultLanguage}`);
  console.log(`  resourceTypes       ${cfg.resourceTypes.join(", ")}`);
  console.log(`  databaseUrl         ${redact(cfg.databaseUrl)}`);
  process.exit(0);
} catch (error) {
  if (error instanceof ConfigError) {
    console.error("✗ Configuration is invalid.\n");
    console.error(`  ${error.message}`);
  } else {
    console.error("✗ Unexpected error while validating configuration:", error);
  }
  process.exit(1);
}

function redact(dsn: string): string {
  // Show user@host without password/path.
  try {
    const url = new URL(dsn);
    const user = url.username || "(no-user)";
    return `${url.protocol}//${user}@${url.hostname}:${url.port || "(default)"}/...`;
  } catch {
    return "(unparseable)";
  }
}
