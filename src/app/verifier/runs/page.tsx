import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Verifier · Eval runs" };
export const dynamic = "force-dynamic";

/**
 * Verifier · Eval runs — historical record of evaluation runs against listed
 * resources. The MVP schema does not carry an `EvalRun` model; runs are
 * external (the verifier plugs in its own harness) and the registry only
 * stores the **declaration** (free-form text) on each Review row's
 * decision summary.
 *
 * This page surfaces the most recent reviews carrying a decision summary
 * (which by convention encodes eval outcomes) so the verifier can audit the
 * trail of declared runs while a first-class `EvalRun` model is being
 * specified.
 *
 * Module spec: `modules/verifier/runs/product.md`.
 */
export default async function VerifierRunsPage() {
  const recent = await prisma.review.findMany({
    where: {
      status: { code: { in: ["decided", "withdrawn"] } },
      decisionSummary: { not: null }
    },
    include: {
      reviewType: { select: { name: true } },
      resource: {
        select: {
          slug: true,
          title: true,
          provider: { select: { displayName: true } }
        }
      },
      reviewer: { select: { name: true, email: true } }
    },
    orderBy: { completedAt: "desc" },
    take: 50
  });

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Eval runs</h1>
        <p className="p-subtitle">
          Latest 50 review-decision summaries, which today carry the verifier&apos;s eval
          declaration. A first-class <code>EvalRun</code> model lands when the spec adds harness
          metadata, run inputs, and replayable artefacts (see{" "}
          <code>modules/verifier/runs/product.md</code>).
        </p>
      </div>

      <section className="glass" style={{ padding: 20, borderRadius: 12 }}>
        {recent.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
            No decided reviews carry an eval declaration yet.
          </p>
        ) : (
          <ul
            style={{
              display: "grid",
              gap: 12,
              listStyle: "none",
              padding: 0,
              margin: 0
            }}
          >
            {recent.map((r) => (
              <li
                key={r.id}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--input-bg)"
                }}
              >
                <header
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 6
                  }}
                >
                  {r.resource ? (
                    <Link
                      href={`/registry/${r.resource.slug}`}
                      style={{
                        color: "var(--text)",
                        textDecoration: "none",
                        fontWeight: 500
                      }}
                    >
                      {r.resource.title}
                    </Link>
                  ) : (
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>
                      (provider review)
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 11,
                      color: "var(--text-3)"
                    }}
                  >
                    {r.completedAt
                      ? r.completedAt.toISOString().slice(0, 10)
                      : r.createdAt.toISOString().slice(0, 10)}
                  </span>
                </header>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-3)",
                    fontFamily: "IBM Plex Mono, monospace",
                    marginBottom: 8
                  }}
                >
                  {r.reviewType.name} · {r.resource?.provider.displayName ?? "—"} ·{" "}
                  {r.reviewer?.name ?? r.reviewer?.email ?? "—"}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--text-2)",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {r.decisionSummary}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 18 }}>
        See also:{" "}
        <Link href="/verifier/queue" className="p-footer-link">
          Queue
        </Link>{" "}
        ·{" "}
        <Link href="/verifier/benchmarks" className="p-footer-link">
          Benchmarks
        </Link>{" "}
        ·{" "}
        <Link href="/verifier/redteam" className="p-footer-link">
          Red team
        </Link>
        .
      </p>
    </div>
  );
}
