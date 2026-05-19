import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { executeSearch } from "@/lib/portals/search";
import type { PortalRole } from "@/lib/portals/notifications";

/**
 * GET /api/portal/search?q=<text>
 *
 * Returns a small, role-scoped result envelope used by the portal header's
 * command-palette modal. See `executeSearch` for the actual scoping rules
 * per role.
 *
 * Authentication required — the surface assumes a session is present so
 * we never leak data to anonymous callers. The role is derived from
 * `user.roles` (admin > provider > verifier > sovereign).
 */

const MAX_QUERY_LENGTH = 120;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawQ = (url.searchParams.get("q") ?? "").trim();
  if (rawQ === "") {
    return NextResponse.json({ results: [] });
  }
  if (rawQ.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query too long (max ${MAX_QUERY_LENGTH} chars).` },
      { status: 400 }
    );
  }

  // Pick the same role precedence the bell uses so a single user with
  // multiple roles gets a consistent experience across header surfaces.
  const role: PortalRole = user.roles.includes("admin")
    ? "admin"
    : user.roles.includes("provider")
      ? "provider"
      : user.roles.includes("verifier")
        ? "verifier"
        : "sovereign";

  const results = await executeSearch(rawQ, user, role);
  return NextResponse.json({ results });
}
