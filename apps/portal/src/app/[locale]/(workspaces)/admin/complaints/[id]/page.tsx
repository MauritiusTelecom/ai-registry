import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ComplaintAdminPanel } from "@/components/admin/ComplaintAdminPanel";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadAdminComplaintDetail } from "@airegistry/sdk/server";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("admin.complaintDetail");
}

export const dynamic = "force-dynamic";

export default async function AdminComplaintDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("adminComplaintDetail");

  const { complaint, assigneeCandidates } = await loadAdminComplaintDetail(id);

  if (!complaint) notFound();

  const statusOptions = await listReferenceTable("complaintStatusType");
  const adminUsers = assigneeCandidates;

  const target = complaint.targetResource
    ? `${complaint.targetResource.title} · ${complaint.targetResource.provider.displayName}`
    : complaint.targetProvider
      ? `${t("provider")} · ${complaint.targetProvider.displayName}`
      : "—";

  return (
    <div className="p-content">
      <div className="p-page-header">
        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
          <Link href="/admin" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            {t("breadcrumbAdmin")}
          </Link>{" "}
          ·{" "}
          <Link
            href="/admin/complaints"
            style={{ color: "var(--text-3)", textDecoration: "none" }}
          >
            {t("breadcrumbComplaints")}
          </Link>{" "}
          · {complaint.id.slice(0, 8)}
        </div>
        <h1 className="p-title">{t("pageTitle")} · {complaint.complaintType.name}</h1>
        <p className="p-subtitle">
          {t("received")} {complaint.submittedAt.toISOString().slice(0, 10)} · {t("status")}{" "}
          <strong>{complaint.status.name}</strong> · {t("severity")}{" "}
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
        <div style={{ display: "grid", gap: 18 }}>
          <Card title={t("cardTarget")}>
            <KeyVal label={t("labelTarget")}>
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
            <KeyVal label={t("labelType")}>{complaint.complaintType.name}</KeyVal>
            <KeyVal label={t("labelSeverity")}>{complaint.severity.name}</KeyVal>
          </Card>

          <Card title={t("cardComplainant")}>
            <KeyVal label={t("labelName")}>
              {complaint.complainantName ?? (
                <span style={{ color: "var(--text-3)" }}>{t("notProvided")}</span>
              )}
            </KeyVal>
            <KeyVal label={t("labelEmail")}>
              {complaint.complainantEmail ? (
                <a
                  href={`mailto:${complaint.complainantEmail}`}
                  style={{ color: "var(--text)", textDecoration: "underline" }}
                >
                  {complaint.complainantEmail}
                </a>
              ) : (
                <span style={{ color: "var(--text-3)" }}>{t("anonymous")}</span>
              )}
            </KeyVal>
          </Card>

          <Card title={t("cardDescription")}>
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
            <Card title={t("cardResolutionSummary")}>
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
                  {t("resolved")} {complaint.resolvedAt.toISOString().slice(0, 10)}
                </div>
              ) : null}
            </Card>
          ) : null}

          {complaint.enforcementActions.length > 0 ? (
            <Card title={t("cardEnforcementActions")}>
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
                      <span style={{ color: "var(--text-3)" }}> {t("by")} {a.performedBy.name}</span>
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
