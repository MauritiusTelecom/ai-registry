import Link from "next/link";
import { notFound } from "next/navigation";
import { findProviderForDetail } from "@airegistry/sdk";
import {
  deriveDisplayStatus,
  deriveGlyph,
  deriveProviderDisplayStatus,
  publicProviderKind
} from "@airegistry/sdk";
import { PageHero } from "@airegistry/ui-kit";

export const metadata = { title: "Provider · Mauritius AI Registry" };
export const dynamic = "force-dynamic";

export default async function ProviderDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const provider = await findProviderForDetail({ slug });
  if (!provider) notFound();

  const status = deriveProviderDisplayStatus(provider.status.code);
  const kind = publicProviderKind(provider.type.code);
  const glyph = deriveGlyph(provider.displayName || provider.slug);
  const since = provider.createdAt.toISOString().slice(0, 7);

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
              Providers
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
                {kind} · listed {since}
              </div>
              {provider.legalName && provider.legalName !== provider.displayName ? (
                <div style={{ fontSize: 14, color: "var(--text-2)", marginTop: 4 }}>
                  Trading as <strong>{provider.displayName}</strong> · legal name{" "}
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
          <h3 style={{ marginBottom: 12 }}>Profile</h3>
          <div className="glass" style={{ padding: 28, marginBottom: 24, display: "grid", gap: 16 }}>
            <Row label="Type" value={`${provider.type.name} (${kind})`} />
            <Row
              label="Home jurisdiction"
              value={`${provider.homeJurisdiction.code}${
                provider.homeJurisdiction.name
                  ? ` · ${provider.homeJurisdiction.name}`
                  : ""
              }`}
            />
            <Row label="Operator status" value={provider.status.name} />
            <Row label="Listed since" value={since} />
            <Row label="Public listings" value={String(listings.length)} />
          </div>

          {/* Contact panel */}
          {(provider.websiteUrl || provider.documentationUrl || provider.contactEmail) ? (
            <>
              <h3 style={{ marginBottom: 12 }}>Reach the provider</h3>
              <div className="glass" style={{ padding: 28, marginBottom: 24, display: "grid", gap: 16 }}>
                {provider.websiteUrl ? (
                  <Row
                    label="Website"
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
                    label="Documentation"
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
                    label="Public contact"
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
          <h3 style={{ marginBottom: 12 }}>Public listings ({listings.length})</h3>
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
              This provider has no public resources in the registry yet.
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
                          <span>lifecycle: {r.lifecycleStatus.code}</span>
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
            Listing is not endorsement. The registry points; the provider operates; the
            hosting environment secures. Sovereignty review and official-resource
            authorisation are independent governance signals - see the{" "}
            <Link href="/governance" style={{ color: "var(--text-2)" }}>
              governance charter
            </Link>
            .
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
          fontFamily: "IBM Plex Mono, monospace"