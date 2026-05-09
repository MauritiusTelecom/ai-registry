/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
