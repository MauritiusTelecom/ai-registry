import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@airegistry/sdk";

export const metadata = { title: "Verifier · Benchmarks" };
export const dynamic = "force-dynamic";

/**
 * Verifier · Benchmarks - the sovereign benchmark corpus reviewers use to
 * verify listed resources. The MVP schema does not yet model `Benchmark` as
 * a first-class entity; the current proxy is "tags marked as canonical
 * capabilities" - i.e. tags that appear on > N resources, surfacing the
 * implicit corpus the catalogue tests against.
 *
 * Module spec: `modules/verifier/benchmarks/product.md`.
 */
export default async function VerifierBenchmarksPage() {
  const cfg = getConfig();

  // Tags shared across multiple listed resources are the closest proxy for
  // "benchmarked capability". Hide unique-tag noise.
  const tagUsage = await prisma.resourceTag.groupBy({
    by: ["tagId"],
    where: {
      resource: {
        publicVisibility: true,
        lifecycleStatus: { code: { in: ["listed", "needs_update"] } }
      }
    },
    _count: { _all: true }
  });

  const tags = await prisma.tag.findMany({
    where: { id: { in: tagUsage.map((g) => g.tagId) } },
    select: { id: true, name: true }
  });
  const nameById = new Map(tags.map((t) => [t.id, t.name]));

  const corpus = tagUsage
    .map((g) => ({
      tagId: g.tagId,
      tag: nameById.get(g.tagId) ?? "-",
      coverage: g._count._all
    }))
    .filter((row) => row.coverage >= 2)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 60);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Benchmarks</h1>
        <p className="p-subtitle">
          Implicit benchmark corpus for <strong>{cfg.jurisdiction}</strong> - capability tags
          shared by 2+ listed resources. A first-class <code>Benchmark</code> model lands once the
          spec adds harness metadata and reference inputs.
        </p>
      </div>

      {corpus.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-3)" }}>
          No shared capability tags yet. Tag listed resources with capability codes (e.g.{" "}
          <code>summarization</code>, <code>language-detection</code>) so the implicit corpus
          forms.
        </p>
      ) : (
        <section className="glass" style={{ padding: 20, borderRadius: 12 }}>
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 8,
              listStyle: "none",
              padding: 0,
              margin: 0
            }}
          >
            {corpus.map((c) => (
              <li
                key={c.tagId}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--input-bg)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline"
                }}
              >
                <Link
                  href={`/api/discover?capability=${encodeURIComponent(c.tag)}`}
                  style={{ color: "var(--text)", textDecoration: "none", fontWeight: 500 }}
                >
                  {c.tag}
                </Link>
                <span
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 12,
                    color: "var(--text-2)"
                  }}
                >
                  ×{c.coverage}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 18 }}>
        Capability discovery: <code>GET /api/discover?capability=&lt;tag&gt;</code> returns every
        listed resource tagged with the given capability. See{" "}
        <Link href="/verifier/runs" className="p-footer-link">
          Eval runs
        </Link>{" "}
        for current declarations.
      </p>
    </div>
  );
}
