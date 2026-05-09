import Link from "next/link";
import { notFound } from "next/navigation";
import { getRefTable } from "@/lib/admin/reference-tables";
import { modelFor } from "@/lib/admin/ref-prisma";
import { RefRowForm } from "@/components/admin/RefRowForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ table: string; id: string }> }) {
  const { table } = await params;
  const config = getRefTable(table);
  return { title: `Admin · Edit ${config?.label ?? "row"}` };
}

export default async function EditRefRowPage({
  params
}: {
  params: Promise<{ table: string; id: string }>;
}) {
  const { table, id } = await params;
  const config = getRefTable(table);
  if (!config) notFound();

  const row = (await modelFor(config).findUnique({ where: { id } })) as
    | (Record<string, unknown> & { id: string })
    | null;
  if (!row) notFound();

  // Project the row to plain serializable values for the client form.
  const initial: Record<string, string | number | boolean | null> = { id: row.id };
  for (const f of config.fields) {
    const v = row[f.key];
    if (v === null || v === undefined) initial[f.key] = null;
    else if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      initial[f.key] = v;
    } else {
      initial[f.key] = String(v);
    }
  }

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
            Reference tables
          </Link>{" "}
          /{" "}
          <Link
            href={`/admin/ref/${config.id}`}
            style={{ color: "var(--text-3)", textDecoration: "none" }}
          >
            {config.label}
          </Link>{" "}
          / edit
        </div>
        <h1 className="p-title">
          Edit {(row[config.fields[0].key] as string) || row.id}
        </h1>
      </div>

      <RefRowForm
        config={config}
        mode="update"
        initial={initial as { id: string } & Record<string, string | number | boolean | null>}
      />
    </div>
  );
}
