import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getRefTable } from "@airegistry/sdk";
import { modelFor } from "@airegistry/sdk/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ table: string; id: string }> }) {
  const { table } = await params;
  const config = getRefTable(table);
  return { title: `Admin · ${config?.label ?? "row"}` };
}

export default async function ViewRefRowPage({
  params
}: {
  params: Promise<{ table: string; id: string }>;
}) {
  const { table, id } = await params;
  const t = await getTranslations("admin.refRow");
  const config = getRefTable(table);
  if (!config) notFound();

  const row = (await modelFor(config).findUnique({ where: { id } })) as
    | (Record<string, unknown> & { id: string })
    | null;
  if (!row) notFound();

  const boolLabels: [string, string] = [t("active"), t("inactive")];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <div
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            marginBottom: 6
          }}
        >
          <Link href="/admin/ref" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            {t("breadcrumbRefTables")}
          </Link>{" "}
          /{" "}
          <Link
            href={`/admin/ref/${config.id}`}
            style={{ color: "var(--text-3)", textDecoration: "none" }}
          >
            {config.label}
          </Link>{" "}
          {t("breadcrumbView")}
        </div>
        <h1 className="p-title">
          {(row[config.fields[0].key] as string) || row.id}
        </h1>
        <p className="p-subtitle">{config.description}</p>
        <div className="p-actions">
          <Link href={`/admin/ref/${config.id}/${id}/edit`} className="btn btn-primary">
            {t("edit")}
          </Link>
        </div>
      </div>

      <div className="glass" style={{ padding: 28, display: "grid", gap: 16, maxWidth: 720 }}>
        {config.fields.map((f) => (
          <Row key={f.key} label={f.label} value={row[f.key]} boolLabels={boolLabels} />
        ))}
        {row.createdAt ? <Row label={t("labelCreated")} value={row.createdAt} boolLabels={boolLabels} /> : null}
        {row.updatedAt ? <Row label={t("labelUpdated")} value={row.updatedAt} boolLabels={boolLabels} /> : null}
      </div>
    </div>
  );
}

function Row({ label, value, boolLabels }: { label: string; value: unknown; boolLabels: [string, string] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: 16,
        alignItems: "baseline",
        borderBottom: "1px dashed var(--hairline)",
        paddingBottom: 12
      }}
    >
      <div
        style={{
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text-3)"
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14.5, color: "var(--text)", whiteSpace: "pre-wrap" }}>
        {format(value, boolLabels)}
      </div>
    </div>
  );
}

function format(v: unknown, boolLabels: [string, string]): string {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? boolLabels[0] : boolLabels[1];
  if (v instanceof Date) return v.toISOString();
  return String(v);
}
