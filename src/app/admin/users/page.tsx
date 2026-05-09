import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/portals/DataTable";
import { StatusPill } from "@/components/portals/StatusPill";

export const metadata = { title: "Admin · Users & roles" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  provider: string | null;
  createdAt: string;
};

const STATUS_DISPLAY: Record<string, string> = {
  active: "active",
  invited: "experimental",
  suspended: "isolated",
  deactivated: "isolated"
};

export default async function AdminUsersPage() {
  const rows = await prisma.user.findMany({
    include: {
      role: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      provider: { select: { displayName: true } }
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
    take: 200
  });

  const projected: Row[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role.name,
    status: STATUS_DISPLAY[u.status.code] ?? "active",
    emailVerified: u.emailVerified,
    provider: u.provider?.displayName ?? null,
    createdAt: u.createdAt.toISOString().slice(0, 10)
  }));

  const columns: Column<Row>[] = [
    {
      key: "name",
      label: "Operator",
      render: (row) => (
        <div>
          <div style={{ color: "var(--text)" }}>{row.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{row.email}</div>
        </div>
      )
    },
    { key: "role", label: "Role", render: (row) => <span className="tag">{row.role}</span> },
    { key: "provider", label: "Provider", render: (row) => row.provider ?? "—" },
    {
      key: "verified",
      label: "Email",
      render: (row) =>
        row.emailVerified ? (
          <span className="tag" style={{ color: "#10b981" }}>verified</span>
        ) : (
          <span className="tag">pending</span>
        )
    },
    { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
    { key: "createdAt", label: "Joined", render: (row) => row.createdAt, mono: true }
  ];

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Users &amp; roles</h1>
        <p className="p-subtitle">
          Operators across all four portals. SSO is bound to the deployment's identity provider.
        </p>
      </div>
      <DataTable rows={projected} columns={columns} emptyState="No users yet." keyOf={(r) => r.id} />
    </div>
  );
}
