import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Monorepo root is two levels up: apps/portal/ -> apps/ -> <root>
const monorepoRoot = path.resolve(__dirname, "../..");

// Load the monorepo-root .env first so getConfig() (which throws if any
// required deployment var is missing) finds DATABASE_URL, REGISTRY_NAME, etc.
// `override: false` means Next's own .env loader (which still runs against
// apps/portal/.env if present) can still win for per-app overrides.
loadDotenv({ path: path.join(monorepoRoot, ".env"), override: false });

/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath || undefined,

  // Emit a self-contained server bundle at `.next/standalone/` so the deploy
  // pipeline can rsync only the runtime (not the full node_modules tree).
  // See deploy/DEPLOY.md for how this is consumed.
  output: "standalone",

  // Monorepo: tell Next the trace root is the workspace root so that
  // workspace packages and the Prisma generated client (under packages/core)
  // are included in the standalone bundle.
  outputFileTracingRoot: monorepoRoot,

  // Transpile workspace packages on the fly — they ship as TS source, not as
  // built JS, during the migration phase.
  transpilePackages: [
    "@airegistry/core",
    "@airegistry/extension-hello",
    "@airegistry/plugin-host",
    "@airegistry/public",
    "@airegistry/sdk",
    "@airegistry/ui-kit"
  ],

  // AIR-SPEC §13 names `/.well-known/ai-registry` as the capability document
  // path. Next.js's App Router excludes dot-prefixed folders, so the route
  // handler lives at /api/well-known/ai-registry and is exposed at the
  // standard URL via a rewrite.
  async rewrites() {
    return [
      {
        source: "/.well-known/ai-registry",
        destination: "/api/well-known/ai-registry"
      }
    ];
  }
};

export default nextConfig;
