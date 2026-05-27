/** When true, auth routes may echo verification / reset URLs in JSON (local QA only). */
export function exposeDevAuthLinks(): boolean {
  return (
    process.env.ALLOW_DEV_AUTH_LINKS === "true" || process.env.ALLOW_DEV_AUTH_LINKS === "1"
  );
}
