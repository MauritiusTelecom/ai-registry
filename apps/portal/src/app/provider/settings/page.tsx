import Link from "next/link";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { getConfig } from "@airegistry/sdk";
import { ProviderOrganisationForm } from "@/components/portals/ProviderOrganisationForm";
// import { ProviderNotificationsForm } from "@/components/portals/ProviderNotificationsForm";

export const metadata = { title: "Provider · Settings" };
export const dynamic = "force-dynamic";

export default async function ProviderSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // /provider/settings is the self-serve surface for a provider user to edit
  // their own organisation. Admins land here via the role-aliased gate
  // (admin can act in any portal), but they aren't linked to a Provider row,
  // so route them to /admin/providers instead of crashing inside
  // ensureUserProviderLinked.
  if (user.role.code !== "provider") {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Settings</h1>
          <p className="p-subtitle">
            This page is the provider&rsquo;s self-serve view of their own
            organisation.
          </p>
        </div>
        <div
          className="glass"
          style={{
            padding: 24,
            maxWidth: 720,
            fontSize: 14,
            lineHeight: 1.6
          }}
        >
          You&rsquo;re signed in as <strong>{user.role.code}</strong>, not as a
          provider. To manage providers as an operator, switch to the admin
          surface.
          <div style={{ marginTop: 16 }}>
            <Link href="/admin/providers" className="btn btn-primary">
              Open admin · Providers →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const providerId = await ensureUserProviderLinked(user.id);
  const cfg = getConfig();

  const [provider, providerTypes, jurisdictions] = await Promise.all([
    prisma.provider.findUnique({
      where: { id: providerId },
      include: { type: { select: { code: true } }, homeJurisdiction: { select: { code: true } } },
      // Selecting via include omits scalars unless we list them - Prisma's
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
          Organisation identity. Complete organisation details to unlock resource authoring.
        </p>
      </div>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr", marginTop: 8 }}>
        <ProviderOrganisationForm
          initial={initial}
          providerTypes={providerTypes}
          jurisdictions={jurisdictions}
          defaultJurisdictionCode={cfg.jurisdiction}
        />

        {/*
          Notifications section temporarily hidden — incident channel,
          on-call email, and webhook URL are not yet wired into the
          registry's paging flows. Re-enable once those backend integrations
          land.

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
        */}
      </div>
    </div>
  );
}
