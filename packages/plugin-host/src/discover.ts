/**
 * Synchronous, dependency-free manifest discovery.
 *
 * This file is intentionally NOT `import "server-only"` so that
 * tsx-run scripts (deploy backfills, ops tooling) can walk the
 * extensions/ directory without going through the full plugin
 * loader. It reads JSON manifests and returns them; nothing more.
 *
 * The full loader (load.server.ts) builds on this for the Next.js
 * runtime where REST routes + UI slots are registered.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import type { PluginManifest } from "@airegistry/sdk/plugin";

const MANIFEST_FILE = "airegistry-plugin.json";

export function findMonorepoRoot(startCwd: string = process.cwd()): string {
  if (existsSync(join(startCwd, "extensions"))) return startCwd;
  const twoUp = resolve(startCwd, "../..");
  if (existsSync(join(twoUp, "extensions"))) return twoUp;
  return startCwd;
}

export function discoverManifestPaths(root: string): string[] {
  const base = join(root, "extensions");
  if (!existsSync(base)) return [];

  const paths: string[] = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const direct = join(base, entry.name, MANIFEST_FILE);
    if (existsSync(direct)) {
      paths.push(direct);
      continue;
    }
    // Nested layout (extensions/examples/<name>/airegistry-plugin.json)
    const examples = join(base, entry.name);
    if (!existsSync(examples)) continue;
    for (const sub of readdirSync(examples, { withFileTypes: true })) {
      if (!sub.isDirectory()) continue;
      const nested = join(examples, sub.name, MANIFEST_FILE);
      if (existsSync(nested)) paths.push(nested);
    }
  }
  return paths;
}

export function readAllManifestsSync(root?: string): PluginManifest[] {
  const r = root ?? findMonorepoRoot();
  const paths = discoverManifestPaths(r);
  const out: PluginManifest[] = [];
  for (const p of paths) {
    try {
      const raw = readFileSync(p, "utf8");
      out.push(JSON.parse(raw) as PluginManifest);
    } catch (err) {
      console.warn(`[discover] could not read ${p}:`, err);
    }
  }
  return out;
}
