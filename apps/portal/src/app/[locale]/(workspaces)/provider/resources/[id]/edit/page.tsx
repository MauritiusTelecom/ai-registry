import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { ProviderResourceEditForm } from "@/components/portal/ProviderResourceEditForm";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadProviderResourceForEdit } from "@airegistry/sdk/server";

export const metadata = { title: "Provider · Edit resource" };
export const dynamic = "force-dynamic";

export default async function ProviderResourceEditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("provider.resourceEdit");
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const providerId = await ensureUserProviderLinked(user.id);

  // loadProviderResourceForEdit centralises the deep include shape this form
  // needs (resourceType, provider, jurisdiction, lifecycle, risk, bases,
  // languages, sectors, evidence, endpoints). Returns null when the id
  // doesn't belong to the actor's provider.
  const resource = await loadProviderResourceForEdit(id, providerId);
  if (!resource) notFound();

  const lifecycleCode = resource.lifecycleStatus.code;
  const canEdit = lifecycleCode === "draft" || lifecycleCode === "needs_update";
  const canSubmit = canEdit;

  const [
    sovereigntyBases,
    evidenceTypes,
    protocols,
    authMethods,
    accessModels,
    languages,
    sectors
  ] = await Promise.all([
    listReferenceTable("sovereigntyBasis", { orderBy: "name" }),
    listReferenceTable("evidenceType"),
    listReferenceTable("protocol"),
    listReferenceTable("authMethodType"),
    listReferenceTable("accessModelType"),
    listReferenceTable("language", { orderBy: "name" }),
    listReferenceTable("sector", { orderBy: "name" })
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
    jurisdictionCode: resource.primaryJurisdiction.code,
    jurisdictionName: resource.primaryJurisdiction.name,
    lifecycleCode,
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
      publicVisibility: e.publicVisibility,
      fileFilename: e.fileFilename ?? null,
      fileSizeBytes: e.fileSizeBytes ?? null,
      fileContentType: e.fileContentType ?? null
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
          <Link href="/provider/resources" style={{ color: "var(--text-3)" }}>
            {t("backToResources")}
          </Link>
        </div>
        <h1 className="p-title">{initial.title}</h1>
        <p className="p-subtitle">
          <span className="tag">{initial.kindCode}</span>{" "}
          <span style={{ marginLeft: 6 }}>
            {t("lifecycle")} <strong>{initial.lifecycleName}</strong>
          </span>
          {initial.airId ? (
            <>
              <br />
              <code style={{ fontSize: 11.5 }}>{initial.airId}</code>
            </>
          ) : null}
        </p>
      </div>
      <ProviderResourceEditForm
        initial={initial}
        sovereigntyBases={sovereigntyBases}
        evidenceTypes={evidenceTypes}
        protocols={protocols}
        authMethods={authMethods}
        accessModels={accessModels}
        languages={languages}
        sectors={sectors}
        canEdit={canEdit}
        canSubmit={canSubmit}
        postSubmitPath="/provider/submissions"
      />
    </div>
  );
}
