import Link from "next/link";
import { refTablesByGroup } from "@airegistry/sdk";

export const metadata = { title: "Admin · Reference tables" };

/**
 * Index of every reference table, grouped by area. The sidebar already
 * deep-links to each table; this page is the single landing if a contributor
 * hits `/admin/ref` directly.
 */
export default function RefTablesIndexPage() {
  const groups = refTablesByGroup();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Reference tables</h1>
        <p className="p-subtitle">
          Controlled vocabularies that drive every dropdown, status badge, and lifecycle
          transition in the registry. Edit with care - most rows are referenced by live
          data and cannot be deleted while in use.
        </p>
      </div>

      <div style={{ display: "grid", gap: 28 }}>
        {groups.map((g) => (
          <div key={g.group}>
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--text-3)",
                marginBottom: 10
              }}
            >
              {g.label}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12
              }}
            >
              {g.tables.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/ref/${t.id}`}
                  style={{
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "16px 18px",
                    textDecoration: "none",
                    color: "inherit"
                  }}
                >
                  <div style={{ fontSize: 14.5, fontWeight: 500, marginBottom: 4, color: "var(--text)" }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                    {t.description}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
