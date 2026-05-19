import { prisma } from "@/lib/prisma";
import { getConfig } from "@airegistry/sdk";
import { BrandingForm } from "@/components/admin/BrandingForm";

export const metadata = { title: "Admin · Branding" };
export const dynamic = "force-dynamic";

const SINGLETON_ID = "default";
const DEFAULT_COPYRIGHT_LINE = "© 2026 Mauritius AI Registry · airegistry.mu";
const DEFAULT_BUILD_LINE = "BUILD 2026.05.07-r3 · TZ:GMT+4";

export default async function AdminBrandingPage() {
  const cfg = getConfig();
  const row = await prisma.siteBranding.findUnique({
    where: { id: SINGLETON_ID }
  });

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Branding</h1>
        <p className="p-subtitle">
          Override the registry name, logo, footer copyright and build line
          surfaced across the public portal. Leave a field empty to fall back
          to the deployment default.
        </p>
      </div>

      <BrandingForm
        initial={{
          registryName: row?.registryName ?? "",
          logoUrl: row?.logoUrl ?? null,
          copyrightLine: row?.copyrightLine ?? "",
          buildLine: row?.buildLine ?? "",
          heroEyebrowText: row?.heroEyebrowText ?? "",
          heroEyebrowIconUrl: row?.heroEyebrowIconUrl ?? null
        }}
        defaults={{
          registryName: cfg.registryName,
          copyrightLine: DEFAULT_COPYRIGHT_LINE,
          buildLine: DEFAULT_BUILD_LINE,
          heroEyebrowText: cfg.portalDomain
        }}
      />
    </div>
  );
}
