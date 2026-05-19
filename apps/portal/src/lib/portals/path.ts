// Pure-string helpers for the portal path prefixes. Lives in its own
// module (no server-only imports) so client components can use them
// without dragging server code into the browser bundle.

export const PORTAL_PATH_PREFIXES = [
  "/portal",
  "/admin",
  "/provider",
  "/verifier",
  "/sovereign"
] as const;

export function isPortalPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PORTAL_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
