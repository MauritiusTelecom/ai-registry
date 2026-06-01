import { localeRedirect } from "@/i18n/locale-redirect";

/**
 * Admin · Flags - retired surface.
 *
 * Flags was a read-only view onto complaints in `open` / `investigating`
 * state - the same data the Complaints page now exposes via its
 * `needs_action` filter, but with more actions (reply, status update,
 * assignment, delete). Rather than keep two pages over the same rows, this
 * route now redirects to the Complaints page with the `needs_action`
 * filter pre-applied.
 *
 * The redirect is permanent (308) so any external bookmarks / audit-log
 * deep links / docs that still point at `/admin/flags` keep working and
 * get migrated client-side.
 */
export const dynamic = "force-dynamic";

export default async function AdminFlagsRedirect() {
  return await localeRedirect("/admin/complaints?status=needs_action");
}
