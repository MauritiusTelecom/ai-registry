/**
 * GET /api/zero-threat
 *
 * ZeroThreat domain-ownership verification file. Exposed at the public URL
 * `/zero-threat.html` via a rewrite in `next.config.mjs`.
 *
 * Served through a route handler (not the `public/` folder) because the
 * standalone build does not ship `public/`, so static files there 404 in
 * production. This mirrors the `/.well-known/ai-registry` pattern.
 */

const BODY =
  '<html lang="en"><head><meta charset="UTF-8"><title>Txt Record Title</title></head>' +
  "<body>zeroThreat=MTAyMjM=TVRBeU1qTT0=TVRBeU1qTT</body></html>";

export const dynamic = "force-static";

export async function GET() {
  return new Response(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}
