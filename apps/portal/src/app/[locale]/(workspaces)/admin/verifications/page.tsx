import { redirect } from "next/navigation";

import { getCurrentUser } from "@airegistry/sdk/server";
import { ensurePluginsLoaded } from "@airegistry/plugin-host";
import { listPendingVerifications } from "@airegistry/core/services/verification";

import { VerificationReviewRow } from "@/components/admin/VerificationReviewRow";

export const metadata = { title: "Admin · Verifications" };
export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
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

  // Make sure extension manifests are loaded so the queue is populated.
  await ensurePluginsLoaded();
  const pending = await listPendingVerifications();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Verification queue</h1>
        <p className="p-subtitle">
          {pending.length} pending verification requirement{pending.length === 1 ? "" : "s"} across all extensions.
          Providers stay invisible on the public catalog until every applicable requirement is verified.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="glass" style={{ padding: 24, fontSize: 13, color: "var(--text-3)" }}>
          No pending verifications. Every provider with applicable requirements is verified.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {pending.map((v) => {
            const matchedDocs = v.provider.documents.filter(
              (d) =>
                !v.documentTypeHint || d.documentType.code === v.documentTypeHint
            );
            return (
              <div key={v.id} className="glass" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{v.provider.displayName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                      {v.provider.legalName ?? v.provider.slug} ·{" "}
                      {v.provider.homeJurisdiction.code}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "2px 10px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      borderRadius: 999,
                      fontSize: 11,
                      color: "#f59e0b",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      alignSelf: "flex-start"
                    }}
                  >
                    Pending
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 1fr",
                    gap: 6,
                    fontSize: 13,
                    marginBottom: 12
                  }}
                >
                  <span style={{ color: "var(--text-3)" }}>Requirement:</span>
                  <span style={{ fontWeight: 600 }}>{v.label}</span>
                  <span style={{ color: "var(--text-3)" }}>Extension:</span>
                  <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>
                    {v.extensionId}
                  </span>
                  <span style={{ color: "var(--text-3)" }}>Registration #:</span>
                  <span style={{ fontFamily: "IBM Plex Mono, monospace" }}>
                    {v.provider.registrationNumber ?? "(not entered)"}
                  </span>
                  <span style={{ color: "var(--text-3)" }}>Queued:</span>
                  <span>{v.createdAt.toISOString().slice(0, 10)}</span>
                </div>

                {matchedDocs.length > 0 ? (
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
                      Provider documents (
                      {v.documentTypeHint ? `filtered: ${v.documentTypeHint}` : "all"})
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
                      {matchedDocs.map((d) => (
                        <li key={d.id} style={{ fontSize: 12.5 }}>
                          <strong>{d.documentType.name}:</strong>{" "}
                          <a
                            href={`/api/portal/provider/documents/${d.id}/file`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {d.filename}
                          </a>
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
                    ⚠ Provider has not uploaded a matching document for this requirement yet.
                  </p>
                )}

                <VerificationReviewRow verificationId={v.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
