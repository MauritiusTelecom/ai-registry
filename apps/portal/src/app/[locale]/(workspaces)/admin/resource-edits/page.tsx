import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getCurrentUser, listPendingResourceEdits } from "@airegistry/sdk/server";
import { PageHero } from "@airegistry/ui-kit";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Resource edits · Admin" };
}

function when(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 16).replace("T", " ");
}

export default async function AdminResourceEditsPage() {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!user.roles.includes("admin") && !user.roles.includes("reviewer")) notFound();

  const pending = await listPendingResourceEdits();

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link href="/admin" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              Admin
            </Link>{" "}
            · Resource edits
          </>
        }
        title="Resource edits"
        subtitle="Provider edits to live resources awaiting approval. The live listing stays public until you approve the update."
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 980, margin: "0 auto", padding: 28 }}>
          {pending.length === 0 ? (
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>
              No pending edits. When a provider submits a change to a live resource, it
              appears here for approval.
            </p>
          ) : (
            <table className="data-table" style={{ width: "100%", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-3)", fontSize: 12 }}>
                  <th style={{ padding: "8px 10px" }}>Resource</th>
                  <th style={{ padding: "8px 10px" }}>Provider</th>
                  <th style={{ padding: "8px 10px" }}>Type</th>
                  <th style={{ padding: "8px 10px" }}>Submitted</th>
                  <th style={{ padding: "8px 10px" }} />
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px" }}>
                      <div style={{ fontWeight: 500 }}>{r.title}</div>
                      {r.airId ? (
                        <code style={{ fontSize: 11, color: "var(--text-3)" }}>{r.airId}</code>
                      ) : null}
                    </td>
                    <td style={{ padding: "10px", color: "var(--text-2)" }}>
                      {r.provider.displayName}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span className="tag">{r.resourceType.code}</span>
                    </td>
                    <td style={{ padding: "10px", color: "var(--text-3)", fontSize: 12.5 }}>
                      {when(r.draftVersion?.submittedAt ?? null)}
                      {r.draftVersion?.createdBy?.name ? (
                        <div>by {r.draftVersion.createdBy.name}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <Link
                        href={`/admin/resource-edits/${r.id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: 13 }}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
