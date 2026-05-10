import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { getConfig } from "@/lib/config";
import { ProviderOrganisationForm } from "@/components/portals/ProviderOrganisationForm";
import { ProviderNotificationsForm } from "@/components/portals/ProviderNotificationsForm";

export const metadata = { title: "Provider · Settings" };
export const dynamic = "force-dynamic";

export default async function ProviderSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const providerId = await ensureUserProviderLinked(user.id);
  const cfg = getConfig();

  const [provider, providerTypes, jurisdictions] = await Promise.all([
    prisma.provider.findUnique({
      where: { id: providerId },
      include: { type: { select: { code: true } }, homeJurisdiction: { select: { code: true } } },
      // Selecting via include omits scalars unless we list them — Prisma's
      // include-with-default returns every scalar by default, so the new
      // notification fields surface automatically. Kept the include shape so
      // the form below picks them up without a second query.
    }),
    prisma.providerTypeRef.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { code: true, name: true }
    }),
    prisma.jurisdiction.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { code: true, name: true }
    })
  ]);

  if (!provider) {
    return (
      <div className="p-content">
        <p>Provider record missing.</p>
      </div>
    );
  }

  const initial = {
    displayName: provider.displayName,
    slug: provider.slug,
    contactEmail: provider.contactEmail,
    providerTypeCode: provider.type.code,
    jurisdictionCode: provider.homeJurisdiction.code,
    legalName: provider.legalName ?? "",
    description: provider.description ?? ""
  };

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Settings</h1>
        <p className="p-subtitle">
          Organisation identity and notifications. Complete organisation details to unlock resource
          authoring.
        </p>
      </div>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr", marginTop: 8 }}>
        <ProviderOrganisationForm
          initial={initial}
          providerTypes={providerTypes}
          jurisdictions={jurisdictions}
          defaultJurisdictionCode={cfg.jurisdiction}
        />

        <div style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Notifications</h2>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 0, marginBottom: 14 }}>
            Where the registry pages your team during incidents and renewals. All three fields are
            optional.
          </p>
          <ProviderNotificationsForm
            initial={{
              incidentChannel: provider.incidentChannel,
              oncallEmail: provider.oncallEmail,
              webhookUrl: provider.webhookUrl
            }}
          />
        </div>
      </div>
    </div>
  );
}
