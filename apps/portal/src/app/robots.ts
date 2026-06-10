import type { MetadataRoute } from "next";
import { getConfiguredOrigin } from "@/lib/public-origin";

/**
 * /robots.txt — allow crawling of the public marketing/registry pages, keep
 * crawlers out of the role workspaces, auth flows, and API. The wildcard
 * "slash-star-slash-path" forms cover the locale-prefixed variants (e.g.
 * /fr/admin) since the router uses `localePrefix: "as-needed"`.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getConfiguredOrigin();
  const privatePrefixes = [
    "admin",
    "portal",
    "provider",
    "sovereign",
    "verifier",
    "login",
    "register",
    "auth"
  ];
  const disallow = [
    "/api/",
    ...privatePrefixes.flatMap((p) => [`/${p}`, `/*/${p}`])
  ];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin
  };
}
