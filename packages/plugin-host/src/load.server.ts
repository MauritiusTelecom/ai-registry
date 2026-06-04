import "server-only";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { PluginManifest, PluginRestRoute, PluginUiSlot } from "@airegistry/sdk/plugin";
import {
  clearRegistry,
  isPluginsEnabled,
  listPlugins,
  registerPlugin,
  registerRestRoute,
  registerUiSlot
} from "./registry";
import { importRestHandler, importUiComponent } from "./resolve-module.server";
import { setVerificationManifestSource } from "@airegistry/core/services/verification";
import { setResourceRequirementManifestSource } from "@airegistry/core/services/resource-verification";

// Re-exported synchronous manifest discovery lives in ./discover.ts so
// non-Next contexts (tsx scripts) can read manifests without pulling in
// server-only. The Next.js loader below uses the same helpers but adds
// REST/UI registration.

const MANIFEST_FILE = "airegistry-plugin.json";

let loadPromise: Promise<void> | null = null;

function monorepoRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, "extensions"))) return cwd;
  const twoUp = resolve(cwd, "../..");
  if (existsSync(join(twoUp, "extensions"))) return twoUp;
  return cwd;
}

function extensionsRoot(root: string): string {
  return join(root, "extensions");
}

function discoverManifestPaths(root: string): string[] {
  const base = extensionsRoot(root);
  if (!existsSync(base)) return [];

  const paths: string[] = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const direct = join(base, entry.name, MANIFEST_FILE);
    if (existsSync(direct)) {
      paths.push(direct);
      continue;
    }
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

function readManifest(manifestPath: string): PluginManifest {
  const raw = readFileSync(manifestPath, "utf8");
  return JSON.parse(raw) as PluginManifest;
}

function packageNameForManifest(manifestPath: string, manifest: PluginManifest): string {
  const dir = resolve(manifestPath, "..");
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
    if (pkg.name) return pkg.name;
  }
  return `@airegistry/extension-${manifest.id}`;
}

function handlerSpecifier(route: PluginRestRoute, packageName: string): string {
  return route.handler.startsWith("@")
    ? route.handler
    : `${packageName}/${route.handler.replace(/^\.\//, "")}`;
}

function componentSpecifier(slot: PluginUiSlot, packageName: string): string {
  return slot.component.startsWith("@")
    ? slot.component
    : `${packageName}/${slot.component.replace(/^\.\//, "")}`;
}

async function wireRestRoute(
  pluginId: string,
  route: PluginRestRoute,
  packageName: string
): Promise<void> {
  const specifier = handlerSpecifier(route, packageName);
  const mod = await importRestHandler(specifier);

  for (const method of route.methods) {
    const handler =
      (method === "GET" && mod.GET) ||
      (method === "POST" && mod.POST) ||
      (method === "PUT" && mod.PUT) ||
      (method === "PATCH" && mod.PATCH) ||
      (method === "DELETE" && mod.DELETE) ||
      mod.default;

    if (!handler) {
      throw new Error(
        `Plugin ${pluginId}: handler ${specifier} has no export for ${method}`
      );
    }
    registerRestRoute(pluginId, method, route.path, handler);
  }
}

async function wireUiSlot(slot: PluginUiSlot, packageName: string): Promise<void> {
  const specifier = componentSpecifier(slot, packageName);
  const component = await importUiComponent(specifier);
  registerUiSlot(slot.slotId, component);
}

async function loadManifestFile(manifestPath: string): Promise<void> {
  const manifest = readManifest(manifestPath);
  const packageName = packageNameForManifest(manifestPath, manifest);

  registerPlugin({ manifest, packageName });

  if (manifest.rest?.length) {
    for (const route of manifest.rest) {
      await wireRestRoute(manifest.id, route, packageName);
    }
  }

  if (manifest.ui?.length) {
    const ordered = [...manifest.ui].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const slot of ordered) {
      await wireUiSlot(slot, packageName);
    }
  }
}

export async function loadPlugins(): Promise<void> {
  if (!isPluginsEnabled()) return;

  clearRegistry();
  const root = monorepoRoot();
  const manifests = discoverManifestPaths(root);

  for (const manifestPath of manifests) {
    await loadManifestFile(manifestPath);
  }

  // Make the verification service in @airegistry/core aware of every
  // extension's verificationRequirements without creating a direct
  // dependency on plugin-host (which would be circular).
  setVerificationManifestSource(() => listPlugins().map((p) => p.manifest));
  setResourceRequirementManifestSource(() => listPlugins().map((p) => p.manifest));
}

export function ensurePluginsLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = loadPlugins().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}
