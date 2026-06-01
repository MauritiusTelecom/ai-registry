import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentUser } from "@airegistry/sdk/server";
import { listPendingBrnVerifications } from "@airegistry/core/services/brn-verification";

import { BrnReviewRow } from "@/components/admin/BrnReviewRow";

export const metadata = { title: "Admin · BRN verification" };
export const dynamic = "force-dynamic";

export default async function AdminBrnPendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role.code !== "admin" && !user.roles.includes("admin")) {
    return (
      <main className="p-content">
        <h1 className="p-title">Forbidden</h1>
        <p className="p-subtitle">Admin role required.</p>
      </main>
    );
  }

  const pending = await listPendingBrnVerifications();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">BRN verification queue</h1>
        <p className="p-subtitle">
          Mauritius providers awaiting manual BRN verification. {pending.length} pending.
          Until verified, providers and their resources are hidden from the public catalog.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="glass" style={{ padding: 24, fontSize: 13, color: "var(--text-3)" }}>
          No pending BRN verifications. All Mauritius providers are verified.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {pending.map((p) => (
            <div key={p.id} className="glass" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.displayName}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                    {p.legalName ?? "(no legal name)"} · {p.slug}
                  </div>
                </div>
                <Link
                  href={`/providers/${p.slug}`}
                  className="r-card-action-link"
                  style={{ fontSize: 11 }}
                >
                  Public preview →
                </Link>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 8, fontSize: 13, marginBottom: 12 }}>
                <span style={{ color: "var(--text-3)" }}>BRN provided:</span>
                <span style={{ fontFamily: "IBM Plex Mono, monospace" }}>
                  {p.registrationNumber ?? "(not entered)"}
                </span>
                <span style={{ color: "var(--text-3)" }}>Jurisdiction:</span>
                <span>{p.homeJurisdiction.name}</span>
                <span style={{ color: "var(--text-3)" }}>Created:</span>
                <span>{p.createdAt.toISOString().slice(0, 10)}</span>
                <span style={{ color: "var(--text-3)" }}>Status:</span>
                <span>{p.status.name}</span>
              </div>

              {p.documents.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-3)",
                      marginBottom: 6
                    }}
                  >
                    Uploaded documents ({p.documents.length})
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
                    {p.documents.map((d) => (
                      <li key={d.id} style={{ fontSize: 12.5 }}>
                        <strong>{d.documentType.name}:</strong>{" "}
                        <a
                          href={`/api/portal/provider/documents/${d.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.filename}
                        </a>{" "}
                        <span style={{ opacity: 0.6 }}>
                          ({formatSize(d.sizeBytes)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: 12,
                    color: "#f59e0b",
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px dashed rgba(245, 158, 11, 0.3)",
                    padding: "8px 10px",
                    borderRadius: 6,
                    margin: "0 0 12px 0"
                  }}
                >
                  ⚠ Provider has not uploaded a company-registration document yet.
                </p>
              )}

              <BrnReviewRow providerId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
