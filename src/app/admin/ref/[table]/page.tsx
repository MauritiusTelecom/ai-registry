import Link from "next/link";
import { notFound } from "next/navigation";
import { getRefTable } from "@/lib/admin/reference-tables";
import { RefTableGrid } from "@/components/admin/RefTableGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  const config = getRefTable(table);
  return { title: `Admin · ${config?.label ?? "Reference table"}` };
}

export default async function RefTablePage({
  params
}: {
  params: Promise<{ table: string }>;
}) {
  const { table } = await params;
  const config = getRefTable(table);
  if (!config) notFound();

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
          / {config.group}
        </div>
        <h1 className="p-title">{config.label}</h1>
        <p className="p-subtitle">{config.description}</p>
      </div>

      <RefTableGrid config={config} />
    </div>
  );
}
