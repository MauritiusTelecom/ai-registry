import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ProviderVerifyForm } from "@/components/admin/ProviderVerifyForm";

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
  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      type: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      homeJurisdiction: { select: { code: true, name: true } },
      _count: { select: { resources: true, users: true } }
    }
  });
  if (!provider) notFound();

  const recentSignals = await prisma.trustSignal.findMany({
    where: {
      targetProviderId: provider.id,
      kind: { code: "provider_verification" }
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      kind: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      decidedBy: { select: { name: true, email: true } }
    }
  });

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
        <div className="glass" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 14, marginBottom: 12 }}>Profile</h2>
          <dl style={{ display: "grid", gap: 10, fontSize: 13 }}>
            <Row label="Status">
              {provider.status.name}{" "}
              <span style={{ color: "var(--text-3)", fontFamily: "monospace" }}>
                ({provider.status.code})
              </span>
            </Row>
            <Row label="Type">{provider.type.name}</Row>
            <Row label="Jurisdiction">{provider.homeJurisdiction.name}</Row>
            <Row label="Contact">{provider.contactEmail}</Row>
            {provider.legalName ? <Row label="Legal name">{provider.legalName}</Row> : null}
            {provider.registrationNumber ? (
              <Row label="Registration">{provider.registrationNumber}</Row>
            ) : null}
            {provider.websiteUrl ? <Row label="Website">{provider.websiteUrl}</Row> : null}
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

        <div className="glass" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 14, marginBottom: 12 }}>Set verification status</h2>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
            Current: <strong>{STATUS_NAMES[provider.status.code] ?? provider.status.code}</strong>.
            Each change writes one append-only audit row plus a TrustSignal of kind{" "}
            <code>provider_verification</code>.
          </p>
          {isSelfProvider ? (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>
              You cannot verify your own provider record (separation of duties, §11).
            </p>
          ) : (
            <ProviderVerifyForm
              providerId={provider.id}
              currentStatus={provider.status.code}
            />
          )}
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
