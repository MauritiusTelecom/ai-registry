import { NextResponse } from "next/server";
import { listPublicProviders } from "@airegistry/sdk";

const KIND_TABS = new Set(["sovereign", "model", "hosting", "integrator"]);

/**
 * GET /api/providers
 *
 * Public providers listing for `/providers`. Query: `q`, `kind` (tab),
 * `status` (display badge), `limit` (1–100, default 20), `cursor` (provider id).
 * Response: `PublicProvidersListResponse` - rows, total, counts, page, generatedAt.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const limitRaw = parseInt(params.get("limit") ?? "20", 10);
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));
  const kindRaw = params.get("kind");
  const kind =
    kindRaw && KIND_TABS.has(kindRaw) ? kindRaw : null;

  const data = await listPublicProviders(
    {
      q: params.get("q"),
      kind,
      status: params.get("status")?.trim() || null
    },
    { limit, cursor: params.get("cursor") }
  );

  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
      "X-RateLimit-Limit": "60",
      "X-RateLimit-Remaining": "60"
    }
  });
}
