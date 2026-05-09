import Link from "next/link";

/**
 * Stub panel rendered on the per-portal sub-routes whose full
 * implementation is scheduled for Phase 4 / 5. Surfaces the route's spec
 * link so a contributor can pick it up without hunting through the spec
 * tree.
 */
export function StubPanel({
  area,
  specHref
}: {
  area: string;
  specHref: string;
}) {
  return (
    <div className="p-stub">
      <div className="p-stub-eyebrow">Stub</div>
      <div className="p-stub-title">
        {area} — full implementation scheduled
      </div>
      <p className="p-stub-body">
        The portal scaffold, role gating, and navigation are live. The route
        body itself is wired to its module spec but the interactive controls
        (CRUD, lifecycle transitions, review approval flows, real-time
        widgets) ship in a later phase.
      </p>
      <Link href={specHref} className="p-stub-link">
        Module contract → {specHref}
      </Link>
    </div>
  );
}
