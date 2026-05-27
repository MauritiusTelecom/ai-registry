import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import createNextIntlPlugin from "next-intl/plugin";

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

const isProd = process.env.NODE_ENV === "production";

// Production: no unsafe-eval. Development: React/Next (especially Turbopack)
// need unsafe-eval for devtools and source maps; HMR needs ws:/wss: connect-src.
function buildContentSecurityPolicy() {
  const scriptSrc = isProd
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";
  const connectSrc = isProd
    ? "'self'"
    : "'self' ws: wss: http://localhost:* http://127.0.0.1:*";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ");
}

const contentSecurityPolicy = buildContentSecurityPolicy();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=()"
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : [])
];

function primaryLanguageTag(code) {
  return (code ?? "en").trim().toLowerCase().split("-")[0];
}

const nextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath || undefined,

  env: {
    NEXT_PUBLIC_DEFAULT_LANGUAGE: primaryLanguageTag(process.env.DEFAULT_LANGUAGE)
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

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

  // `src/components/library` (repo root) is compiled as part of this app via
  // tsconfig path aliases. Module resolution for those files starts at the
  // monorepo root, where pnpm does not link workspace packages; `@airegistry/*`
  // only exists under `apps/portal/node_modules`. Prefer that folder first.
  webpack(config) {
    const portalNodeModules = path.join(__dirname, "node_modules");
    const existing = config.resolve.modules ?? ["node_modules"];
    if (!existing.includes(portalNodeModules)) {
      config.resolve.modules = [portalNodeModules, ...existing];
    }
    return config;
  },

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

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
