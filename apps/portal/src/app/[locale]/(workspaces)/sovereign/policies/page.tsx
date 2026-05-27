import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getConfig } from "@airegistry/sdk";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadSovereignPoliciesView } from "@airegistry/sdk/server";

export const metadata = { title: "Sovereign · Policies" };
export const dynamic = "force-dynamic";

/**
 * Sovereign · Policies - jurisdiction-scoped view of the operator policy
 * surfaces that affect locally-anchored providers and resources.
 *
 * The substantive policy ladder (lifecycle, trust signals, sovereignty bases)
 * is deployment-wide and editable only by admins (see /admin/policies). This
 * page surfaces the **subset that matters for this jurisdiction** - which
 * sovereignty bases are actually in use locally, how many evidence rows back
 * each, and which official authorities can authorise resources here.
 *
 * Module spec: `modules/sovereign/policies/product.md`.
 */
export default async function SovereignPoliciesPage() {
  const t = await getTranslations("sovereign.policies");
  const cfg = getConfig();

  const [bases, policiesView] = await Promise.all([
    listReferenceTable("sovereigntyBasis", { orderBy: "name" }),
    loadSovereignPoliciesView(cfg.jurisdiction)
  ]);

  const usage = policiesView.basisUsage;
  const officialAuthorities = policiesView.officialAuthorities;
  const sovereigntyEvidenceCount = policiesView.sovereigntyEvidenceCount;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t.rich("subtitleText", {
            jurisdiction: cfg.jurisdiction,
            bold: (chunks) => <strong>{chunks}</strong>,
            adminLink: (chunks) => <Link href="/admin/policies" className="p-footer-link">{chunks}</Link>
          })}
        </p>
      </div>

      <section className="glass" style={{ padding: 20, borderRadius: 12, marginBottom: 18 }}>
        <h2
          style={{
            fontSize: 12,
            fontFamily: "IBM Plex Mono, monospace",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            marginBottom: 12
          }}
        >
          {t("basesHeading")}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 8
          }}
        >
          {bases.map((b) => {
            const n = usage.get(b.id) ?? 0;
            return (
              <div
                key={b.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--input-bg)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{b.name}</span>
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 12,
                      color: n > 0 ? "var(--text)" : "var(--text-3)"
                    }}
                  >
                    {n}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-3)",
                    fontFamily: "IBM Plex Mono, monospace",
                    marginTop: 2
                  }}
                >
                  {b.code}
                </div>
                {b.description ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-2)",
                      marginTop: 8,
                      marginBottom: 0,
                      lineHeight: 1.45
                    }}
                  >
                    {b.description}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--text-3)" }}>
          {t("evidenceRows", { count: sovereigntyEvidenceCount })}
        </p>
      </section>

      <section className="glass" style={{ padding: 20, borderRadius: 12 }}>
        <h2
          style={{
            fontSize: 12,
            fontFamily: "IBM Plex Mono, monospace",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            marginBottom: 12
          }}
        >
          {t("authoritiesHeading", { count: officialAuthorities.length })}
        </h2>
        {officialAuthorities.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
            {t.rich("noAuthorities", {
              jurisdiction: cfg.jurisdiction,
              adminLink: (chunks) => <Link href="/admin/ref/official-authority" className="p-footer-link">{chunks}</Link>
            })}
          </p>
        ) : (
          <ul
            style={{
              display: "grid",
              gap: 10,
              listStyle: "none",
              padding: 0,
              margin: 0
            }}
          >
            {officialAuthorities.map((a) => (
              <li
                key={a.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--input-bg)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--text-3)",
                        fontFamily: "IBM Plex Mono, monospace",
                        marginTop: 2
                      }}
                    >
                      {a.typeName} · {a.domainArea}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 12,
                      color: "var(--text-2)"
                    }}
                  >
                    {t("authorisationCount", { count: a.authorisationCount })}
                  </span>
                </div>
                {a.websiteUrl ? (
                  <Link
                    href={a.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--text-2)"
                    }}
                  >
                    {a.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
