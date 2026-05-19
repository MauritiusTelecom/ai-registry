import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ComplaintAdminPanel } from "@/components/admin/ComplaintAdminPanel";
import { listReferenceTable } from "@airegistry/sdk/server";

export const metadata = { title: "Admin · Complaint" };
export const dynamic = "force-dynamic";

/**
 * Admin · Complaint detail. Renders the full record (incl. complainant PII)
 * and a panel of operator actions: reply by email, update status, assign,
 * and record a resolution summary. All writes flow through
 * `/api/admin/complaints/:id/...` so the audit log captures who did what.
 */
export default async function AdminComplaintDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      complaintType: { select: { code: true, name: true } },
      severity: { select: { code: true, name: true } },
      status: { select: { id: true, code: true, name: true } },
      targetResource: {
        select: { slug: true, title: true, provider: { select: { displayName: true } } }
      },
      targetProvider: { select: { slug: true, displayName: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      enforcementActions: {
        include: {
          actionType: { select: { name: true } },
          performedBy: { select: { name: true } }
        },
        orderBy: { performedAt: "desc" }
      }
    }
  });

  if (!complaint) notFound();

  const [statusOptions, adminUsers] = await Promise.all([
    listReferenceTable("complaintStatusType"),
    prisma.user.findMany({
      where: {
        OR: [
          { role: { code: { in: ["admin", "reviewer"] } } },
          { roleAssignments: { some: { role: { code: { in: ["admin", "reviewer"] } } } } }
        ]
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    })
  ]);

  const target = complaint.targetResource
    ? `${complaint.targetResource.title} · ${complaint.targetResource.provider.displayName}`
    : complaint.targetProvider
      ? `Provider · ${complaint.targetProvider.displayName}`
      : "—";

  return (
    <div className="p-content">
      <div className="p-page-header">
        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
          <Link href="/admin" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Admin
          </Link>{" "}
          ·{" "}
          <Link
            href="/admin/complaints"
            style={{ color: "var(--text-3)", textDecoration: "none" }}
          >
            Complaints
          </Link>{" "}
          · {complaint.id.slice(0, 8)}
        </div>
        <h1 className="p-title">Complaint · {complaint.complaintType.name}</h1>
        <p className="p-subtitle">
          Received {complaint.submittedAt.toISOString().slice(0, 10)} · status{" "}
          <strong>{complaint.status.name}</strong> · severity{" "}
          <strong>{complaint.severity.name}</strong>
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          alignItems: "start"
        }}
      >
        {/* Left column - the record */}
        <div style={{ display: "grid", gap: 18 }}>
          <Card title="Target">
            <KeyVal label="Target">
              {complaint.targetResource ? (
                <Link
                  href={`/registry/${complaint.targetResource.slug}`}
                  style={{ color: "var(--text)", textDecoration: "none" }}
                >
                  {target}
                </Link>
              ) : (
                target
              )}
            </KeyVal>
            <KeyVal label="Type">{complaint.complaintType.name}</KeyVal>
            <KeyVal label="Severity">{complaint.severity.name}</KeyVal>
          </Card>

          <Card title="Complainant">
            <KeyVal label="Name">
              {complaint.complainantName ?? (
                <span style={{ color: "var(--text-3)" }}>(not provided)</span>
              )}
            </KeyVal>
            <KeyVal label="Email">
              {complaint.complainantEmail ? (
                <a
                  href={`mailto:${complaint.complainantEmail}`}
                  style={{ color: "var(--text)", textDecoration: "underline" }}
                >
                  {complaint.complainantEmail}
                </a>
              ) : (
                <span style={{ color: "var(--text-3)" }}>(anonymous)</span>
              )}
            </KeyVal>
          </Card>

          <Card title="Description">
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                fontSize: 14,
                color: "var(--text)"
              }}
            >
              {complaint.description}
            </div>
          </Card>

          {complaint.resolutionSummary ? (
            <Card title="Resolution summary">
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                  fontSize: 14,
                  color: "var(--text)"
                }}
              >
                {complaint.resolutionSummary}
              </div>
              {complaint.resolvedAt ? (
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>
                  Resolved {complaint.resolvedAt.toISOString().slice(0, 10)}
                </div>
              ) : null}
            </Card>
          ) : null}

          {complaint.enforcementActions.length > 0 ? (
            <Card title="Enforcement actions">
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {complaint.enforcementActions.map((a) => (
                  <li
                    key={a.id}
                    style={{
                      paddingBottom: 8,
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13
                    }}
                  >
                    <strong>{a.actionType.name}</strong> ·{" "}
                    <span style={{ color: "var(--text-2)" }}>
                      {a.performedAt.toISOString().slice(0, 10)}
                    </span>
                    {a.performedBy ? (
                      <span style={{ color: "var(--text-3)" }}> by {a.performedBy.name}</span>
                    ) : null}
                    <div style={{ marginTop: 4, color: "var(--text-2)" }}>{a.reason}</div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        {/* Right column - actions */}
        <ComplaintAdminPanel
          complaintId={complaint.id}
          currentStatusCode={complaint.status.code}
          currentStatusId={complaint.status.id}
          statusOptions={statusOptions}
          assignedToId={complaint.assignedTo?.id ?? null}
          adminUsers={adminUsers}
          complainantEmail={complaint.complainantEmail}
          resolutionSummary={complaint.resolutionSummary}
        />
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 20px"
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-3)",
          marginBottom: 12
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function KeyVal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, fontSize: 13.5 }}>
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ color: "var(--text)" }}>{children}</span>
    </div>
  );
}
