import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { listAllFaqEntries } from "@airegistry/core/services/public-cms";
import { Icon } from "@airegistry/ui-kit";

export const metadata = { title: "Admin · Site content · FAQ" };
export const dynamic = "force-dynamic";

export default async function AdminFaqListPage() {
  const t = await getTranslations("admin.siteFaq");
  const rows = await listAllFaqEntries();

  return (
    <div className="p-content">
      <div className="p-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <h1 className="p-title">{t("title")}</h1>
          <p className="p-subtitle">{t("subtitle")}</p>
        </div>
        <Link href="/admin/site/faq/new" className="btn btn-primary">
          <Icon name="plus" size={14} /> {t("addEntry")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: 28,
            borderRadius: 12,
            border: "1px dashed var(--border)",
            color: "var(--text-2)",
            fontSize: 14
          }}
        >
          {t("emptyPrefix")} <code>pnpm db:seed</code> {t("emptyMiddle")}{" "}
          <Link href="/admin/site/faq/new">{t("emptyLinkText")}</Link>.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="p-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-3)", fontSize: 12 }}>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>{t("colOrder")}</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>{t("colCode")}</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>{t("colQuestion")}</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>{t("colStatus")}</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>{t("colUpdated")}</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--text-3)", fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>
                    {r.sortOrder}
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "IBM Plex Mono, monospace", fontSize: 12.5, color: "var(--text-2)" }}>
                    {r.code}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text)" }}>{r.question}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: r.active ? "rgba(16, 185, 129, 0.10)" : "rgba(148, 163, 184, 0.10)",
                        color: r.active ? "#10b981" : "var(--text-3)",
                        border: r.active
                          ? "1px solid rgba(16, 185, 129, 0.30)"
                          : "1px solid var(--border)"
                      }}
                    >
                      {r.active ? t("statusActive") : t("statusHidden")}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-3)", fontSize: 12.5 }}>
                    {new Date(r.updatedAt).toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <Link href={`/admin/site/faq/${encodeURIComponent(r.code)}`} className="btn btn-secondary" style={{ fontSize: 12.5, padding: "4px 10px" }}>
                      {t("edit")}
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
