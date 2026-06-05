import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getCurrentUser, listPendingResourceVerifications } from "@airegistry/sdk/server";
import { PageHero } from "@airegistry/ui-kit";
import { ResourceVerificationActions } from "@/components/admin/ResourceVerificationActions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Resource verifications · Admin" };
}

export default async function AdminResourceVerificationsPage() {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!user.roles.includes("admin")) notFound();

  const pending = await listPendingResourceVerifications();

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link href="/admin" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              Admin
            </Link>{" "}
            · Resource verifications
          </>
        }
        title="Resource verifications"
        subtitle="Extension-defined requirements for individual resources awaiting verification. A resource stays hidden from the public catalogue until all its applicable requirements are verified."
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 1000, margin: "0 auto", padding: 28 }}>
          {pending.length === 0 ? (
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>
              No pending resource requirements. When a provider submits a resource that an
              extension requires extra proof for, it appears here.
            </p>
          ) : (
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-3)", fontSize: 12 }}>
                  <th style={{ padding: "8px 10px" }}>Resource</th>
                  <th style={{ padding: "8px 10px" }}>Requirement</th>
                  <th style={{ padding: "8px 10px" }}>Extension</th>
                  <th style={{ padding: "8px 10px" }} />
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px" }}>
                      <div style={{ fontWeight: 500 }}>{r.resource.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                        {r.resource.provider.displayName} ·{" "}
                        <span className="tag">{r.resource.resourceType.code}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px", color: "var(--text-2)" }}>
                      {r.label}
                      {r.documentTypeHint ? (
                        <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                          doc: {r.documentTypeHint}
                        </div>
                      ) : null}
                      {r.rejectionNote ? (
                        <div style={{ fontSize: 11.5, color: "#fca5a5" }}>
                          rejected: {r.rejectionNote}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <code style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                        {r.extensionId}
                      </code>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <ResourceVerificationActions rowId={r.id} />
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
