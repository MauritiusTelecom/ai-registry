import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { CONTACT_TOPIC_LABELS } from "@airegistry/sdk";
import { loadAdminContactsView } from "@airegistry/sdk/server";

function labelFor(topic: string): string {
  return (CONTACT_TOPIC_LABELS as Record<string, string>)[topic] ?? topic;
}

export const metadata = { title: "Admin · Contact messages" };
export const dynamic = "force-dynamic";

/**
 * Admin · Contact messages - operator inbox for the public /contact form.
 *
 * Pre-verification rows live here too (the operator may want to see them);
 * the `verified` filter exposes the distinction. Each row links to the
 * detail page where the operator can view the full message and reply by
 * email.
 *
 * Filters: `?verified=all|yes|no` (default: all).
 */

type Row = {
  id: string;
  ts: string;
  sender: string;
  email: string;
  organisation: string;
  topic: string;
  topicLabel: string;
  excerpt: string;
  verified: boolean;
  linked: string | null;
};

type VerifiedFilter = "all" | "yes" | "no";

export default async function AdminContactsPage({
  searchParams
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const sp = await searchParams;
  const raw = (sp.verified ?? "all").toLowerCase();
  const verifiedFilter: VerifiedFilter =
    raw === "yes" || raw === "no" ? raw : "all";

  const t = await getTranslations("admin.contacts");
  const view = await loadAdminContactsView(verifiedFilter);
  const rows = view.rows;

  const projected: Row[] = rows.map((c) => ({
    id: c.id,
    ts: c.ts,
    sender: c.senderName,
    email: c.email,
    organisation: c.organisationName ?? "",
    topic: c.topicCode,
    topicLabel: labelFor(c.topicCode),
    excerpt: c.message.length > 110 ? `${c.message.slice(0, 110)}…` : c.message,
    verified: c.emailVerified,
    linked:
      c.linkedUserName && c.linkedUserEmail
        ? `${c.linkedUserName} (${c.linkedUserEmail})`
        : null
  }));

  const allCount = view.totalCount;
  const verifiedCount = view.verifiedCount;
  const unverifiedCount = view.unverifiedCount;

  const columns: Column<Row>[] = [
    { key: "ts", label: t("colReceived"), render: (row) => row.ts, mono: true, width: "110px" },
    {
      key: "from",
      label: t("colFrom"),
      render: (row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span>{row.sender}</span>
          <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "var(--text-3)" }}>
            {row.email}
          </span>
        </div>
      )
    },
    { key: "org", label: t("colOrganisation"), render: (row) => row.organisation },
    { key: "topic", label: t("colTopic"), render: (row) => <span className="tag">{row.topicLabel}</span> },
    {
      key: "excerpt",
      label: t("colMessage"),
      render: (row) => <span style={{ color: "var(--text-2)" }}>{row.excerpt}</span>
    },
    {
      key: "verified",
      label: t("colEmail"),
      render: (row) =>
        row.verified ? (
          <span style={{ color: "#22c55e", fontSize: 12 }}>{t("verified")}</span>
        ) : (
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>{t("unverified")}</span>
        )
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Link
          href={`/admin/contacts/${row.id}`}
          className="btn"
          style={{ padding: "4px 10px", fontSize: 12 }}
        >
          {t("open")}
        </Link>
      )
    }
  ];

  const tabs: { code: VerifiedFilter; label: string; count: number }[] = [
    { code: "all", label: t("tabAll"), count: allCount },
    { code: "yes", label: t("tabVerified"), count: verifiedCount },
    { code: "no", label: t("tabUnverified"), count: unverifiedCount }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {tabs.map((tab) => {
            const isActive = tab.code === verifiedFilter;
            return (
              <Link
                key={tab.code}
                href={tab.code === "all" ? "/admin/contacts" : `/admin/contacts?verified=${tab.code}`}
                className="tag"
                style={{
                  textDecoration: "none",
                  padding: "4px 10px",
                  border: isActive ? "1px solid var(--text)" : "1px solid var(--border)",
                  background: isActive ? "var(--panel-strong, var(--panel))" : "transparent",
                  color: isActive ? "var(--text)" : "var(--text-2)",
                  fontSize: 12
                }}
              >
                {tab.label} · <strong>{tab.count}</strong>
              </Link>
            );
          })}
        </div>
      </div>
      <DataTable
        rows={projected}
        columns={columns}
        emptyState={t("emptyState")}
        keyOf={(r) => r.id}
      />
    </div>
  );
}
