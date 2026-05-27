import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { loadVerifierBenchmarkCorpus } from "@airegistry/sdk/server";
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
  const t = await getTranslations("verifier.benchmarks");
  const cfg = getConfig();

  // Tags shared across multiple listed resources are the closest proxy for
  // "benchmarked capability". The service hides the two-step group-by +
  // tag-name-lookup behind a single call.
  const corpus = await loadVerifierBenchmarkCorpus({ minCoverage: 2, limit: 60 });

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t("subtitleParagraph", { jurisdiction: cfg.jurisdiction })}
        </p>
      </div>

      {corpus.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-3)" }}>
          {t("emptyState")}
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
        {t("footerParagraph")}{" "}
        <Link href="/verifier/runs" className="p-footer-link">
          {t("linkEvalRuns")}
        </Link>
        .
      </p>
    </div>
  );
}
