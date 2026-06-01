import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { findProviderForDetail } from "@airegistry/sdk";
import {
  deriveDisplayStatus,
  deriveGlyph,
  deriveProviderDisplayStatus,
  publicProviderKind
} from "@airegistry/sdk";
import { PageHero } from "@airegistry/ui-kit";
import { loadProviderDocuments } from "@airegistry/core/services/sovereignty-documents";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("public.provider");
}
export const dynamic = "force-dynamic";

export default async function ProviderDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [provider, t] = await Promise.all([
    findProviderForDetail({ slug }),
    getTranslations("providerDetail")
  ]);
  if (!provider) notFound();

  const status = deriveProviderDisplayStatus(provider.status.code);
  const kind = publicProviderKind(provider.type.code);
  const glyph = deriveGlyph(provider.displayName || provider.slug);
  const since = provider.createdAt.toISOString().slice(0, 7);

  const publicDocuments = await loadProviderDocuments({
    providerId: provider.id,
    includePrivate: false
  });

  const listings = provider.resources;

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link
              href="/providers"
              style={{ color: "var(--text-3)", textDecoration: "none" }}
            >
              {t("providersLink")}
            </Link>{" "}
            · {kind} · {provider.displayName}
          </>
        }
        title={
          <>
            {provider.displayName}{" "}
            <span style={{ color: "var(--text-3)", fontWeight: 400 }}>
              {provider.homeJurisdiction.code}
            </span>
          </>
        }
        subtitle={provider.description ?? undefined}
      />

      <section className="section" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          {/* Glyph + status row */}
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              marginBottom: 24
            }}
          >
            <div className="r-icon" aria-hidden="true">
              {glyph}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--text-3)"
                }}
              >
                {kind} · {t("listedSince")} {since}
              </div>
              {provider.legalName && provider.legalName !== provider.displayName ? (
                <div style={{ fontSize: 14, color: "var(--text-2)", marginTop: 4 }}>
                  {t("tradingAs")} <strong>{provider.displayName}</strong> · {t("legalName")}{" "}
                  {provider.legalName}
                </div>
              ) : null}
            </div>
            <div className={`r-status ${status}`}>
              <span className="status-dot" />
              {status}
            </div>
          </div>

          {/* Profile panel */}
          <h3 style={{ marginBottom: 12 }}>{t("profile")}</h3>
          <div className="glass" style={{ padding: 28, marginBottom: 24, display: "grid", gap: 16 }}>
            <Row label={t("type")} value={`${provider.type.name} (${kind})`} />
            <Row
              label={t("homeJurisdiction")}
              value={`${provider.homeJurisdiction.code}${
                provider.homeJurisdiction.name
                  ? ` · ${provider.homeJurisdiction.name}`
                  : ""
              }`}
            />
            <Row label={t("operatorStatus")} value={provider.status.name} />
            <Row label={t("listedSince")} value={since} />
            <Row label={t("publicListings")} value={String(listings.length)} />
          </div>

          {/* Contact panel */}
          {(provider.websiteUrl || provider.documentationUrl || provider.contactEmail) ? (
            <>
              <h3 style={{ marginBottom: 12 }}>{t("reachProvider")}</h3>
              <div className="glass" style={{ padding: 28, marginBottom: 24, display: "grid", gap: 16 }}>
                {provider.websiteUrl ? (
                  <Row
                    label={t("website")}
                    value={
                      <a
                        href={provider.websiteUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{ color: "var(--text-2)" }}
                      >
                        {provider.websiteUrl} ↗
                      </a>
                    }
                  />
                ) : null}
                {provider.documentationUrl ? (
                  <Row
                    label={t("documentation")}
                    value={
                      <a
                        href={provider.documentationUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{ color: "var(--text-2)" }}
                      >
                        {provider.documentationUrl} ↗
                      </a>
                    }
                  />
                ) : null}
                {provider.contactEmail ? (
                  <Row
                    label={t("publicContact")}
                    value={
                      <a
                        href={`mailto:${provider.contactEmail}`}
                        style={{ color: "var(--text-2)" }}
                      >
                        {provider.contactEmail}
                      </a>
                    }
                  />
                ) : null}
              </div>
            </>
          ) : null}

          {/* Listings */}
          <h3 style={{ marginBottom: 12 }}>{t("publicListingsCount", { count: listings.length })}</h3>
          {listings.length === 0 ? (
            <div
              className="glass"
              style={{
                padding: 28,
                marginBottom: 24,
                color: "var(--text-3)",
                fontSize: 14
              }}
            >
              {t("noPublicResources")}
            </div>
          ) : (
            <div className="glass" style={{ padding: 28, marginBottom: 24 }}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
                {listings.map((r, i) => {
                  const rStatus = deriveDisplayStatus(r);
                  return (
                    <li
                      key={r.id}
                      style={{
                        paddingTop: 14,
                        borderTop: i === 0 ? "none" : "1px dashed var(--hairline)",
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 16,
                        alignItems: "center"
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Link
                          href={`/registry/${r.slug}`}
                          style={{
                            color: "var(--text)",
                            textDecoration: "none",
                            fontWeight: 500
                          }}
                        >
                          {r.title}
                        </Link>
                        <div
                          style={{
                            fontFamily: "IBM Plex Mono, monospace",
                            fontSize: 11.5,
                            color: "var(--text-3)",
                            marginTop: 4,
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap"
                          }}
                        >
                          <span>{r.resourceType.name}</span>
                          <span>{t("lifecycleLabel")}: {r.lifecycleStatus.code}</span>
                        </div>
                      </div>
                      <div className={`r-status ${rStatus}`}>
                        <span className="status-dot" />
                        {rStatus}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Verification documents */}
          {publicDocuments.length > 0 && (
            <div
              className="glass"
              style={{ padding: 28, marginBottom: 24 }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginTop: 0,
                  marginBottom: 12
                }}
              >
                {t("verificationDocuments")}
              </h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {publicDocuments.map((d) => (
                  <li
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                      padding: "8px 10px",
                      background: "rgba(0,0,0,0.18)",
                      borderRadius: 6
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{d.documentType.name}</span>
                    <span style={{ opacity: 0.6 }}>·</span>
                    <span>{d.title}</span>
                    <a
                      href={`/api/portal/provider/documents/${d.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        marginLeft: "auto",
                        padding: "4px 8px",
                        background: "rgba(90, 209, 255, 0.15)",
                        borderRadius: 4,
                        fontSize: 12,
                        color: "var(--text)"
                      }}
                    >
                      📎 {d.filename}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer disclaimer */}
          <div
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 12,
              color: "var(--text-3)",
              borderTop: "1px solid var(--hairline)",
              paddingTop: 18
            }}
          >
            {t.rich("footerDisclaimer", {
              link: (chunks) => (
                <Link href="/governance" style={{ color: "var(--text-2)" }}>
                  {chunks}
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: 16,
        alignItems: "baseline",
        borderBottom: "1px dashed var(--hairline)",
        paddingBottom: 12
      }}
    >
      <div
        style={{
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text-3)"
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, color: "var(--text)" }}>{value}</div>
    </div>
  );
}
