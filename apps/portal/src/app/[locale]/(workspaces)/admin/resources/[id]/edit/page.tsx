import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ResourceEditForm } from "@/components/admin/ResourceEditForm";
import { ResourceLifecyclePanel } from "@/components/admin/ResourceLifecyclePanel";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadAdminResourceForEdit } from "@airegistry/sdk/server";

export const metadata = { title: "Admin · Edit resource" };
export const dynamic = "force-dynamic";

/**
 * Admin · Resource edit page - full-form surface for everything the seed
 * captures (descriptions, versioning, URLs, sovereignty basis + evidence,
 * endpoints, language/sector tags). The grid keeps the minimal "Add new"
 * modal and inline lifecycle actions; everything else lives here.
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.1.
 */
export default async function AdminResourceEditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("admin.resourceEdit");
  const actor = await getCurrentUser();
  if (!actor || !actor.roles.includes("admin")) notFound();

  const { id } = await params;

  const { resource, providers } = await loadAdminResourceForEdit(id);
  if (!resource) notFound();

  const [
    riskLevels,
    jurisdictions,
    sovereigntyBases,
    evidenceTypes,
    protocols,
    authMethods,
    accessModels,
    languages,
    sectors,
    resourceTypes,
    listingOrigins
  ] = await Promise.all([
    listReferenceTable("riskLevel"),
    listReferenceTable("jurisdiction", { orderBy: "name" }),
    listReferenceTable("sovereigntyBasis", { orderBy: "name" }),
    listReferenceTable("evidenceType"),
    listReferenceTable("protocol"),
    listReferenceTable("authMethodType"),
    listReferenceTable("accessModelType"),
    listReferenceTable("language", { orderBy: "name" }),
    listReferenceTable("sector", { orderBy: "name" }),
    listReferenceTable("resourceType"),
    listReferenceTable("listingOrigin")
  ]);

  const initial = {
    id: resource.id,
    airId: resource.airId,
    slug: resource.slug,
    title: resource.title,
    shortDescription: resource.shortDescription,
    longDescription: resource.longDescription,
    kindCode: resource.resourceType.code,
    kindName: resource.resourceType.name,
    providerSlug: resource.provider.slug,
    providerName: resource.provider.displayName,
    listingOriginCode: resource.listingOrigin.code,
    listingOriginName: resource.listingOrigin.name,
    jurisdictionCode: resource.primaryJurisdiction.code,
    lifecycleCode: resource.lifecycleStatus.code,
    lifecycleName: resource.lifecycleStatus.name,
    riskCode: resource.riskLevel.code,
    publicVisibility: resource.publicVisibility,
    license: resource.license,
    versionLabel: resource.versionLabel,
    versionNumber: resource.versionNumber,
    latencyTier: resource.latencyTier,
    accessUrl: resource.accessUrl,
    sourceCodeUrl: resource.sourceCodeUrl,
    documentationUrl: resource.documentationUrl,
    termsUrl: resource.termsUrl,
    sovereigntyBasisCodes: resource.resourceBases.map((b) => b.sovereigntyBasis.code),
    languageCodes: resource.resourceLanguages.map((l) => l.language.code),
    sectorCodes: resource.resourceSectors.map((s) => s.sector.code),
    evidence: resource.evidence.map((e) => ({
      id: e.id,
      evidenceTypeCode: e.evidenceType.code,
      sovereigntyBasisCode: e.sovereigntyBasis.code,
      title: e.title,
      description: e.description,
      referenceUrl: e.referenceUrl,
      referenceIdentifier: e.referenceIdentifier,
      issuingBody: e.issuingBody,
      publicVisibility: e.publicVisibility
    })),
    endpoints: resource.endpoints.map((ep) => ({
      id: ep.id,
      protocolCode: ep.protocol.code,
      endpointUrl: ep.endpointUrl,
      documentationUrl: ep.documentationUrl,
      authMethodCode: ep.authMethod.code,
      accessModelCode: ep.accessModel.code,
      primary: ep.primary,
      active: ep.active
    }))
  };

  return (
    <div className="p-content">
      <div className="p-page-header">
        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
          <Link href="/admin/resources" style={{ color: "var(--text-3)" }}>
            {t("backToResources")}
          </Link>
        </div>
        <h1 className="p-title">{initial.title}</h1>
        <p className="p-subtitle">
          <span className="tag">{initial.kindCode}</span>{" "}
          <span style={{ marginLeft: 6 }}>
            {t("providerLabel")} <strong>{initial.providerName}</strong>
          </span>{" "}
          <span style={{ marginLeft: 6 }}>
            {t("lifecycleLabel")} <strong>{initial.lifecycleName}</strong>
          </span>
          {initial.airId ? (
            <>
              <br />
              <code style={{ fontSize: 11.5 }}>{initial.airId}</code>
            </>
          ) : null}
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
        <ResourceEditForm
          initial={initial}
          riskLevels={riskLevels}
          jurisdictions={jurisdictions}
          sovereigntyBases={sovereigntyBases}
          evidenceTypes={evidenceTypes}
          protocols={protocols}
          authMethods={authMethods}
          accessModels={accessModels}
          languages={languages}
          sectors={sectors}
          resourceTypes={resourceTypes}
          providers={providers}
          listingOrigins={listingOrigins}
        />

        <div style={{ display: "grid", gap: 16 }}>
          <div className="glass" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 14, marginTop: 0, marginBottom: 8 }}>
              {t("lifecycleAndStatus")}
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                marginTop: 0,
                marginBottom: 14
              }}
            >
              {t.rich("lifecycleExplanation", {
                code: (chunks) => <code>{chunks}</code>
              })}
            </p>
            <ResourceLifecyclePanel
              resourceId={initial.id}
              currentLifecycleCode={initial.lifecycleCode}
              currentLifecycleName={initial.lifecycleName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
