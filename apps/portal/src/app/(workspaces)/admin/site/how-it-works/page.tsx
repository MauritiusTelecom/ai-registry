import Link from "next/link";
import { listAllHowItWorksSteps } from "@airegistry/core/services/public-cms";
import { Icon } from "@airegistry/ui-kit";

export const metadata = { title: "Admin · Site content · How it works" };
export const dynamic = "force-dynamic";

export default async function AdminHowItWorksListPage() {
  const rows = await listAllHowItWorksSteps();

  return (
    <div className="p-content">
      <div className="p-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <h1 className="p-title">How it works · steps</h1>
          <p className="p-subtitle">
            The numbered steps shown in the public &ldquo;How it works&rdquo;
            section. Mark one step as <code>highlight</code> for the pink/purple
            &ldquo;Off-registry&rdquo; callout.
          </p>
        </div>
        <Link href="/admin/site/how-it-works/new" className="btn btn-primary">
          <Icon name="plus" size={14} /> Add step
        </Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 28, borderRadius: 12, border: "1px dashed var(--border)", color: "var(--text-2)", fontSize: 14 }}>
          No steps yet. Run <code>pnpm db:seed</code> for the defaults, or{" "}
          <Link href="/admin/site/how-it-works/new">add the first step</Link>.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="p-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-3)", fontSize: 12 }}>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>#</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Code</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Title</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Highlight</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Status</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--text-3)", fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>{r.stepNumber}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "IBM Plex Mono, monospace", fontSize: 12.5, color: "var(--text-2)" }}>{r.code}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text)" }}>{r.title}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{r.highlight ? "Yes" : "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 11.5, padding: "3px 8px", borderRadius: 999, background: r.active ? "rgba(16, 185, 129, 0.10)" : "rgba(148, 163, 184, 0.10)", color: r.active ? "#10b981" : "var(--text-3)", border: r.active ? "1px solid rgba(16, 185, 129, 0.30)" : "1px solid var(--border)" }}>
                      {r.active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <Link href={`/admin/site/how-it-works/${encodeURIComponent(r.code)}`} className="btn btn-secondary" style={{ fontSize: 12.5, padding: "4px 10px" }}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
