/**
 * Route shim. The page body lives in `@airegistry/public/pages/DocsPage` so the public site
 * can be customised or replaced without forking apps/portal.
 * Route segment config + the default export are re-exported here so
 * Next.js's static analysis sees them at the route file location.
 */
export { default, metadata } from "@airegistry/public/pages/DocsPage";
