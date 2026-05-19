import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ProviderVerifyForm } from "@/components/admin/ProviderVerifyForm";
import { ProviderVisibilityPanel } from "@/components/admin/ProviderVisibilityPanel";
import { ProviderEditForm } from "@/components/admin/ProviderEditForm";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadAdminProviderDetail } from "@airegistry/sdk/server";

export const metadata = { title: "Admin · Provider" };
export const dynamic = "force-dynamic";

const STATUS_NAMES: Record<string, string> = {
  unverified: "Unverified",
  verified: "Verified",
  official_provider: "Official provider",
  suspended: "Suspended"
};

export default async function AdminProviderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("admin")) notFound();

  const { id } = await params;
  const { provider, recentTrustSignals: recentSignals } = await loadAdminProviderDetail(id);
  if (!provider) notFound();

  const [providerTypes, jurisdictions] = await Promise.all([
    listReferenceTable("providerTypeRef", { orderBy: "name" }),
    listReferenceTable("jurisdiction", { orderBy: "name" })
  ]);

  const editInitial = {
    id: provider.id,
    slug: provider.slug,
    displayName: provider.displayName,
    legalName: provider.legalName,
    registrationNumber: provider.registrationNumber,
    typeCode: provider.type.code,
    typeName: provider.type.name,
    jurisdictionCode: provider.homeJurisdiction.code,
    jurisdictionName: provider.homeJurisdiction.name,
    statusCode: provider.status.code,
    statusName: provider.status.name,
    contactEmail: provider.contactEmail,
    legalContactEmail: provider.legalContactEmail,
    websiteUrl: provider.websiteUrl,
    documentationUrl: provider.documentationUrl,
    description: provider.description,
    incidentChannel: provider.incidentChannel,
    oncallEmail: provider.oncallEmail,
    webhookUrl: provider.webhookUrl
  };
  const isSelfProvider = user.provider?.id === provider.id;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <p style={{ fontSize: 12, color: "var(--text-3)" }}>
          <Link href="/admin/providers" style={{ color: "var(--text-3)" }}>
            ← All providers
          </Link>
        </p>
        <h1 className="p-title">{provider.displayName}</h1>
        <p className="p-subtitle">
          {provider.type.name} · {provider.homeJurisdiction.code} ·{" "}
          <span style={{ fontFamily: "IBM Plex Mono, monospace" }}>{provider.slug}</span>
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 24,
          alignItems: "start"
        }}
      >
        <div style={{ display: "grid", gap: 24 }}>
          <ProviderEditForm
            initial={editInitial}
            providerTypes={providerTypes}
            jurisdictions={jurisdictions}
          />

          <div className="glass" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, marginTop: 0, marginBottom: 12 }}>At a glance</h2>
            <dl style={{ display: "grid", gap: 10, fontSize: 13 }}>
              <Row label="Resources">{provider._count.resources}</Row>
              <Row label="Members">{provider._count.users}</Row>
              <Row label="Joined">{provider.createdAt.toISOString().slice(0, 10)}</Row>
            </dl>

            <h2 style={{ fontSize: 14, marginTop: 28, marginBottom: 12 }}>
              Recent verification signals
            </h2>
            {recentSignals.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                No verification signals recorded yet.
              </p>
            ) : (
              <ul style={{ display: "grid", gap: 10, fontSize: 13 }}>
                {recentSignals.map((s) => (
                  <li
                    key={s.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--border)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>
                        {s.kind.name} · {s.status.name}
                      </strong>
                      <span style={{ color: "var(--text-3)" }}>
                        {s.decidedAt?.toISOString().slice(0, 10) ??
                          s.createdAt.toISOString().slice(0, 10)}
                      </span>
                    </div>
                    {s.decisionSummary ? (
                      <div style={{ marginTop: 4, color: "var(--text-2)" }}>
                        {s.decisionSummary}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 4, color: "var(--text-3)", fontSize: 12 }}>
                      {s.decidedBy?.name ?? s.decidedBy?.email ?? "system"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div className="glass" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, marginTop: 0, marginBottom: 8 }}>
              Set verification status
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 0, marginBottom: 18 }}>
              Current:{" "}
              <strong>{STATUS_NAMES[provider.status.code] ?? provider.status.code}</strong>.
              Each change writes one append-only audit row plus a TrustSignal of kind{" "}
              <code>provider_verification</code>.
            </p>
            {isSelfProvider ? (
              <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
                You cannot verify your own provider record (separation of duties, §11).
              </p>
            ) : (
              <ProviderVerifyForm
                providerId={provider.id}
                currentStatus={provider.status.code}
              />
            )}
          </div>

          <div className="glass" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, marginTop: 0, marginBottom: 8 }}>Visibility</h2>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 0, marginBottom: 18 }}>
              Controls whether this provider appears on the public registry. Audit log
              still records every change.
            </p>
            <ProviderVisibilityPanel
              providerId={provider.id}
              initialPublished={provider.published}
              initialAdminSuspended={provider.adminSuspended}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
      <dt style={{ color: "var(--text-3)" }}>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
