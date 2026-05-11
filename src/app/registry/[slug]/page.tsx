import Link from "next/link";
import { notFound } from "next/navigation";
import { findResourceForDetail } from "@/lib/discovery/queries";
import { toRegistryCardDetail } from "@/lib/discovery/serializers";
import { PageHero } from "@/components/public/sections/PageHero";
import { AirIdCopy } from "@/components/public/sections/AirIdCopy";

export const metadata = { title: "Resource detail" };
export const dynamic = "force-dynamic";

export default async function ResourceDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await findResourceForDetail({ slug });
  if (!row) notFound();
  if (row.lifecycleStatus.code === "removed") notFound();

  const detail = toRegistryCardDetail(row);
  const isDeprecated = detail.lifecycle.code === "deprecated";

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link
              href="/registry"
              style={{ color: "var(--text-3)", textDecoration: "none" }}
            >
              Registry
            </Link>{" "}
            · {detail.kind} · {detail.title}
          </>
        }
        title={
          <>
            {detail.title} by{" "}
            <span className="gradient-text">{detail.provider}</span>
          </>
        }
        subtitle={detail.desc}
      />

      <section className="section" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          {isDeprecated ? (
            <div
              className="glass"
              role="status"
              style={{
                padding: 18,
                marginBottom: 24,
                display: "flex",
                gap: 14,
                alignItems: "center"
              }}
            >
              <span
                className="status-dot"
                style={{ background: "#f59e0b", boxShadow: "0 0 8px #f59e0b" }}
              />
              <div style={{ flex: 1, fontSize: 14 }}>
                <strong>Deprecated</strong> — this resource is still publicly listed for
                continuity, but its provider has marked it for retirement. New integrations
                should look for a replacement.
              </div>
            </div>
          ) : null}

          {/* AIR-ID + status row */}
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              marginBottom: 24
            }}
          >
            {detail.airId ? (
              <AirIdCopy airId={detail.airId} />
            ) : (
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--code-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 12.5,
                  color: "var(--text-3)"
                }}
              >
                AIR-ID not yet issued (resource has not reached <code>listed</code>).
              </div>
            )}
            <div className={`r-status ${detail.status}`}>
              <span className="status-dot" />
              {detail.status}
            </div>
          </div>

          {/* Long description */}
          {detail.longDescription ? (
            <div
              className="glass"
              style={{ padding: 28, marginBottom: 24, fontSize: 15, lineHeight: 1.65 }}
            >
              {detail.longDescription}
            </div>
          ) : null}

          {/* Governance panel */}
          <h3 style={{ marginBottom: 12 }}>Governance</h3>
          <div className="glass" style={{ padding: 28, marginBottom: 24, display: "grid", gap: 16 }}>
            <Row label="Declaration" value={detail.governance.declarationStatus.replace(/_/g, " ")} />
            <Row label="Sovereignty review" value={detail.governance.sovereigntyReviewStatus.replace(/_/g, " ")} />
            <Row label="Provider verification" value={detail.governance.providerVerificationStatus.replace(/_/g, " ")} />
            <Row label="Last reviewed" value={detail.governance.lastReviewed ? formatDate(detail.governance.lastReviewed) : "—"} />
            <Row label="Next review due" value={detail.governance.nextReviewDue ? formatDate(detail.governance.nextReviewDue) : "—"} />
            <Row label="Lifecycle" value={detail.lifecycle.name} />
            {detail.lifecycle.listedAt ? (
              <Row label="Listed at" value={formatDate(detail.lifecycle.listedAt)} />
            ) : null}
          </div>

          {/* Sovereignty bases + evidence */}
          {detail.sovereigntyBases.length > 0 || detail.evidence.length > 0 ? (
            <>
              <h3 style={{ marginBottom: 12 }}>Sovereignty</h3>
              <div className="glass" style={{ padding: 28, marginBottom: 24 }}>
                {detail.sovereigntyBases.length > 0 ? (
                  <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {detail.sovereigntyBases.map((b) => (
                      <span key={b.code} className="tag">
                        {b.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                {detail.evidence.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
                    {detail.evidence.map((ev, i) => (
                      <li
                        key={i}
                        style={{
                          paddingTop: 14,
                          borderTop: i === 0 ? "none" : "1px dashed var(--hairline)"
                        }}
                      >
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>{ev.title}</div>
                        {ev.description ? (
                          <div style={{ fontSize: 14, color: "var(--text-2)" }}>
                            {ev.description}
                          </div>
                        ) : null}
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                            marginTop: 8,
                            fontFamily: "IBM Plex Mono, monospace",
                            fontSize: 11.5,
                            color: "var(--text-3)"
                          }}
                        >
                          <span>type: {ev.evidenceType}</span>
                          <span>basis: {ev.sovereigntyBasis}</span>
                          {ev.issuingBody ? <span>issued by: {ev.issuingBody}</span> : null}
                          {ev.referenceUrl ? (
                            <a
                              href={ev.referenceUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              style={{ color: "var(--text-2)" }}
                            >
                              reference ↗
                            </a>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 14, color: "var(--text-3)" }}>
                    No public sovereignty evidence has been attached yet.
                  </p>
                )}
              </div>
            </>
          ) : null}

          {/* Endpoints */}
          {detail.endpoints.length > 0 ? (
            <>
              <h3 style={{ marginBottom: 12 }}>Endpoints</h3>
              <div className="glass" style={{ padding: 28, marginBottom: 24 }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
                  {detail.endpoints.map((e, i) => (
                    <li
                      key={i}
                      style={{
                        paddingTop: 14,
                        borderTop: i === 0 ? "none" : "1px dashed var(--hairline)"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "baseline",
                          flexWrap: "wrap",
                          marginBottom: 6
                        }}
                      >
                        <span className="tag">{e.protocol}</span>
                        <span className="tag">auth: {e.authMethod}</span>
                        <span className="tag">access: {e.accessModel}</span>
                        {e.primary ? <span className="tag">primary</span> : null}
                        {!e.active ? (
                          <span className="tag" style={{ color: "#ef4444" }}>
                            inactive
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          fontFamily: "IBM Plex Mono, monospace",
                          fontSize: 12.5,
                          color: "var(--text-2)",
                          wordBreak: "break-all"
                        }}
                      >
                        {e.endpointUrl}
                      </div>
                      {e.documentationUrl ? (
                        <a
                          href={e.documentationUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          style={{
                            fontSize: 12,
                            color: "var(--text-3)",
                            display: "inline-block",
                            marginTop: 4
                          }}
                        >
                          documentation ↗
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          {/* Tags */}
          {detail.tags.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
              {detail.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

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
            authorisation are independent governance signals — see the{" "}
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

function Row({ label, value }: { label: string; value: string }) {
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
