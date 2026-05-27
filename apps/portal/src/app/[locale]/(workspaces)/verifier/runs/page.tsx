import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { loadVerifierEvalRuns } from "@airegistry/sdk/server";

export const metadata = { title: "Verifier · Eval runs" };
export const dynamic = "force-dynamic";

/**
 * Verifier · Eval runs - historical record of evaluation runs against listed
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
  const t = await getTranslations("verifier.runs");
  const recent = await loadVerifierEvalRuns({ limit: 50 });

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t("subtitleParagraph")}
        </p>
      </div>

      <section className="glass" style={{ padding: 20, borderRadius: 12 }}>
        {recent.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
            {t("emptyState")}
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
                  {r.resourceSlug ? (
                    <Link
                      href={`/registry/${r.resourceSlug}`}
                      style={{
                        color: "var(--text)",
                        textDecoration: "none",
                        fontWeight: 500
                      }}
                    >
                      {r.resourceTitle ?? r.resourceSlug}
                    </Link>
                  ) : (
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>
                      {t("providerReview")}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 11,
                      color: "var(--text-3)"
                    }}
                  >
                    {r.completedAt ?? "—"}
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
                  {r.reviewTypeName} · {r.providerName ?? "-"} · {r.reviewer ?? "-"}
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
        {t("seeAlso")}{" "}
        <Link href="/verifier/queue" className="p-footer-link">
          {t("linkQueue")}
        </Link>{" "}
        ·{" "}
        <Link href="/verifier/benchmarks" className="p-footer-link">
          {t("linkBenchmarks")}
        </Link>{" "}
        ·{" "}
        <Link href="/verifier/redteam" className="p-footer-link">
          {t("linkRedTeam")}
        </Link>
        .
      </p>
    </div>
  );
}
