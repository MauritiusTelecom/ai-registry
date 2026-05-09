/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath || undefined,

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
