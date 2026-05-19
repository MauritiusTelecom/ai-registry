import Link from "next/link";
import { notFound } from "next/navigation";
import { getRefTable } from "@airegistry/sdk";
import { RefRowForm } from "@/components/admin/RefRowForm";

export async function generateMetadata({ params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  const config = getRefTable(table);
  return { title: `Admin · New ${config?.label ?? "row"}` };
}

export default async function NewRefRowPage({
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
          /{" "}
          <Link
            href={`/admin/ref/${config.id}`}
            style={{ color: "var(--text-3)", textDecoration: "none" }}
          >
            {config.label}
          </Link>{" "}
          / new
        </div>
        <h1 className="p-title">New {singular(config.label)}</h1>
        <p className="p-subtitle">{config.description}</p>
      </div>

      <RefRowForm config={config} mode="create" />
    </div>
  );
}

function singular(label: string): string {
  // Naive de-pluralisation for the page title - "User roles" → "user role".
  if (label.endsWith("ies")) return label.slice(0, -3).toLowerCase() + "y";
  if (label.endsWith("ses")) return label.slice(0, -2).toLowerCase();
  if (label.endsWith("s")) return label.slice(0, -1).toLowerCase();
  return label.toLowerCase();
}
