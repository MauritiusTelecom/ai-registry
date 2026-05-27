import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadAdminComplaintsView } from "@airegistry/sdk/server";

export const metadata = { title: "Admin · Complaints" };
export const dynamic = "force-dynamic";

/**
 * Admin · Complaints - operator inbox for public complaints (formerly also
 * known as Flags - the moderation queue is just complaints in
 * `open` / `investigating` state, see the `needs_action` filter below).
 *
 * Surfaces every complaint regardless of status so the operator can:
 *
 *   - view the complete record incl. complainant identity & contact email,
 *   - reply by email,
 *   - update status (open → investigating → resolved | rejected),
 *   - assign the complaint to a staff user, and
 *   - record a resolution summary on the audit trail.
 *
 * Filters: `?status=mine|needs_action|open|investigating|resolved|rejected|all`
 *   - `mine` scopes to complaints assigned to the signed-in admin (open +
 *     investigating only - resolved complaints drop off the personal queue).
 *   - `needs_action` is the union of `open` + `investigating` and is the
 *     default landing for what used to be the Flags route.
 *   - default is `all`.
 */

type Row = {
  id: string;
  ts: string;
  type: string;
  severity: string;
  statusCode: string;
  statusName: string;
  target: string;
  targetSlug: string | null;
  complainant: string;
  complainantEmail: string | null;
  excerpt: string;
  assignedTo: string | null;
};

const SEVERITY_COLOUR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "var(--text-2)"
};

const STATUS_COLOUR: Record<string, string> = {
  open: "#f59e0b",
  investigating: "#3b82f6",
  resolved: "#22c55e",
  rejected: "var(--text-3)"
};

const ALLOWED_STATUS = [
  "mine",
  "needs_action",
  "open",
  "investigating",
  "resolved",
  "rejected",
  "all"
] as const;
type StatusFilter = (typeof ALLOWED_STATUS)[number];

/** Maps a filter code to its Prisma where clause.
 *  - `mine`         → complaints in open/investigating state assigned to me
 *  - `needs_action` → the legacy "Flags" queue (open + investigating)
 *  - others         → the underlying status code or "all"
 */
function whereForStatus(status: StatusFilter, currentUserId: string | null) {
  if (status === "mine") {
    return {
      AND: [
        { status: { code: { in: ["open", "investigating"] } } },
        { assignedToId: currentUserId ?? "__no_user__" }
      ]
    };
  }
  if (status === "all") return undefined;
  if (status === "needs_action") {
    return { status: { code: { in: ["open", "investigating"] } } };
  }
  return { status: { code: status } };
}

export default async function AdminComplaintsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const raw = (sp.status ?? "all").toLowerCase();
  const status: StatusFilter = (ALLOWED_STATUS as readonly string[]).includes(raw)
    ? (raw as StatusFilter)
    : "all";

  const me = await getCurrentUser();
  const myId = me?.id ?? null;

  const t = await getTranslations("admin.complaints");
  const view = await loadAdminComplaintsView({ statusFilter: status, actorUserId: myId });
  const rows = view.rows;

  const projected: Row[] = rows.map((c) => ({
    id: c.id,
    ts: c.ts,
    type: c.type,
    severity: c.severityCode,
    statusCode: c.statusCode,
    statusName: c.statusName,
    target: c.target,
    targetSlug: c.targetSlug,
    complainant: c.complainantName ?? c.complainantEmail ?? "(anonymous)",
    complainantEmail: c.complainantEmail,
    excerpt:
      c.description.length > 110 ? `${c.description.slice(0, 110)}…` : c.description,
    assignedTo: c.assignedToName
  }));

  const countsByCode = view.countsByStatusCode;
  const totalAll = Object.values(countsByCode).reduce((a, b) => a + b, 0);

  const columns: Column<Row>[] = [
    { key: "ts", label: t("colReceived"), render: (row) => row.ts, mono: true, width: "110px" },
    { key: "type", label: t("colType"), render: (row) => <span className="tag">{row.type}</span> },
    {
      key: "severity",
      label: t("colSeverity"),
      render: (row) => (
        <span
          style={{ color: SEVERITY_COLOUR[row.severity] ?? "var(--text-2)", fontWeight: 500 }}
        >
          {row.severity}
        </span>
      )
    },
    {
      key: "status",
      label: t("colStatus"),
      render: (row) => (
        <span style={{ color: STATUS_COLOUR[row.statusCode] ?? "var(--text-2)" }}>
          {row.statusName}
        </span>
      )
    },
    {
      key: "target",
      label: t("colTarget"),
      render: (row) =>
        row.targetSlug ? (
          <Link
            href={`/registry/${row.targetSlug}`}
            style={{ color: "var(--text)", textDecoration: "none" }}
          >
            {row.target}
          </Link>
        ) : (
          row.target
        )
    },
    {
      key: "complainant",
      label: t("colFrom"),
      render: (row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span>{row.complainant}</span>
          {row.complainantEmail ? (
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "var(--text-3)" }}>
              {row.complainantEmail}
            </span>
          ) : null}
        </div>
      )
    },
    {
      key: "excerpt",
      label: t("colDescription"),
      render: (row) => (
        <span style={{ color: "var(--text-2)" }}>{row.excerpt}</span>
      )
    },
    {
      key: "assigned",
      label: t("colAssigned"),
      render: (row) =>
        row.assignedTo ? (
          row.assignedTo
        ) : (
          <span style={{ color: "var(--text-3)" }}>—</span>
        )
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Link
          href={`/admin/complaints/${row.id}`}
          className="btn"
          style={{ padding: "4px 10px", fontSize: 12 }}
        >
          {t("open")}
        </Link>
      )
    }
  ];

  const needsActionCount =
    (countsByCode["open"] ?? 0) + (countsByCode["investigating"] ?? 0);

  // Personal queue count — service already computed it from the same
  // actor context so we don't pay for a second round-trip.
  const mineCount = view.myAssignedOpenCount;

  const tabs: { code: StatusFilter; label: string; count: number }[] = [
    { code: "mine", label: t("tabMine"), count: mineCount },
    { code: "needs_action", label: t("tabNeedsAction"), count: needsActionCount },
    { code: "all", label: t("tabAll"), count: totalAll },
    { code: "open", label: t("tabOpen"), count: countsByCode["open"] ?? 0 },
    {
      code: "investigating",
      label: t("tabInvestigating"),
      count: countsByCode["investigating"] ?? 0
    },
    { code: "resolved", label: t("tabResolved"), count: countsByCode["resolved"] ?? 0 },
    { code: "rejected", label: t("tabRejected"), count: countsByCode["rejected"] ?? 0 }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const isActive = t.code === status;
            return (
              <Link
                key={t.code}
                href={t.code === "all" ? "/admin/complaints" : `/admin/complaints?status=${t.code}`}
                className={`tag ${isActive ? "active" : ""}`}
                style={{
                  textDecoration: "none",
                  padding: "4px 10px",
                  border: isActive ? "1px solid var(--text)" : "1px solid var(--border)",
                  background: isActive ? "var(--panel-strong, var(--panel))" : "transparent",
                  color: isActive ? "var(--text)" : "var(--text-2)",
                  fontSize: 12
                }}
              >
                {t.label} · <strong>{t.count}</strong>
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
