import { NextResponse } from "next/server";
import { getCurrentUser, listAdminReviewsQueue } from "@airegistry/sdk/server";

function canGovern(roles: string[]) {
  return roles.includes("admin") || roles.includes("reviewer");
}

/**
 * GET /api/admin/reviews - sovereignty review queue (open / in_review).
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canGovern(user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reviews = await listAdminReviewsQueue();
  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      status: r.status.code,
      reviewType: r.reviewType.code,
      createdAt: r.createdAt.toISOString(),
      resource: r.resource
        ? {
            id: r.resource.id,
            slug: r.resource.slug,
            title: r.resource.title,
            type: r.resource.resourceType.code,
            lifecycle: r.resource.lifecycleStatus.code,
            provider: r.resource.provider
          }
        : null
    }))
  });
}
