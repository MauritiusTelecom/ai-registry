import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { loadVerifierRedteamFindings } from "@airegistry/sdk/server";
import { DataTable, type Column } from "@/components/portals/DataTable";

export const metadata = { title: "Verifier · Red team" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  type: string;
  severity: string;
  status: string;
  target: string;
  targetSlug: string | null;
  description: string;
  receivedAt: string;
};

const SEVERITY_COLOUR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "var(--text-2)"
};

/**
 * Verifier · Red team - adversarial findings against listed resources.
 *
 * The MVP schema does not yet model red-team campaigns as their own entity.
 * The closest existing signal is **public complaints filed against listed
 * resources with `type=safety`** - these are the user-driven adversarial
 * findings the verifier acts on. This page surfaces those rows, prioritised
 * by severity, until a dedicated `RedTeamCampaign` / `Finding` model lands.
 *
 * Module spec: `modules/verifier/redteam/product.md`.
 */
export default async function VerifierRedteamPage() {
  const t = await getTranslations("verifier.redteam");
  const raw = await loadVerifierRedteamFindings();

  const projected: Row[] = raw.map((c) => ({
    id: c.id,
    type: c.type,
    severity: c.severityCode,
    status: c.statusName,
    target: c.target,
    targetSlug: c.targetSlug,
    description: c.description,
    receivedAt: c.receivedAt
  }));

  const open = projected.filter((r) => r.status.toLowerCase() === "open").length;
  const high = projected.filter((r) => r.severity === "high").length;

  const columns: Column<Row>[] = [
    {
      key: "type",
      label: t("colClass"),
      render: (row) => <span className="tag">{row.type}</span>
    },
    {
      key: "severity",
      label: t("colSeverity"),
      render: (row) => (
        <span style={{ color: SEVERITY_COLOUR[row.severity] ?? "var(--text-2)", fontWeight: 500 }}>
          {row.severity}
        </span>
      )
    },
    { key: "status", label: t("colStatus"), render: (row) => row.status },
    {
      key: "target",
      label: t("colResource"),
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
      key: "summary",
      label: t("colFinding"),
      render: (row) => (
        <span style={{ color: "var(--text-2)" }}>
          {row.description.length > 120
            ? `${row.description.slice(0, 120)}…`
            : row.description}
        </span>
      )
    },
    { key: "received", label: t("colReceived"), render: (row) => row.receivedAt, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t("subtitleCount", { count: projected.length, open, high })}
        </p>
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
