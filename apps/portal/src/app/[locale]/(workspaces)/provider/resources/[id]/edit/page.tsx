import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { ProviderResourceEditForm } from "@/components/portal/ProviderResourceEditForm";
import { listReferenceTable } from "@airegistry/sdk/server";
import {
  loadProviderResourceForEdit,
  getDraftState,
  loadVerificationStatusForResource
} from "@airegistry/sdk/server";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("provider.resourcesEdit");
}

export const dynamic = "force-dynamic";

// Shape the form's `initial` expects for the editable evidence/endpoint rows.
type DraftPayload = {
  title?: unknown;
  shortDescription?: unknown;
  longDescription?: unknown;
  license?: unknown;
  versionLabel?: unknown;
  versionNumber?: unknown;
  latencyTier?: unknown;
  accessUrl?: unknown;
  sourceCodeUrl?: unknown;
  documentationUrl?: unknown;
  termsUrl?: unknown;
  sovereigntyBasisCodes?: unknown;
  languageCodes?: unknown;
  sectorCodes?: unknown;
  evidence?: unknown;
  endpoints?: unknown;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;
const codeList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

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

  const resource = await loadProviderResourceForEdit(id, providerId);
  if (!resource) notFound();

  const lifecycleCode = resource.lifecycleStatus.code;
  const isListed = lifecycleCode === "listed";

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

  // For a listed resource, edits go through an approval-gated draft. If an
  // in-progress draft exists, hydrate the form from its proposed payload so the
  // provider resumes their edit (incl. after a rejection).
  let draftStatus: string | null = null;
  let canEdit = lifecycleCode === "draft" || lifecycleCode === "needs_update";

  if (isListed) {
    const state = await getDraftState(id, user);
    draftStatus = state.draftStatus;
    canEdit = draftStatus !== "submitted"; // locked while awaiting approval
    const p = state.draft?.proposedPayload as DraftPayload | null | undefined;
    if (p && typeof p === "object") {
      if (typeof p.title === "string") initial.title = p.title;
      if (typeof p.shortDescription === "string")
        initial.shortDescription = p.shortDescription;
      initial.longDescription = strOrNull(p.longDescription);
      initial.license = strOrNull(p.license);
      initial.versionLabel = strOrNull(p.versionLabel);
      initial.versionNumber = strOrNull(p.versionNumber);
      initial.latencyTier = strOrNull(p.latencyTier);
      initial.accessUrl = strOrNull(p.accessUrl);
      initial.sourceCodeUrl = strOrNull(p.sourceCodeUrl);
      initial.documentationUrl = strOrNull(p.documentationUrl);
      initial.termsUrl = strOrNull(p.termsUrl);
      initial.sovereigntyBasisCodes = codeList(p.sovereigntyBasisCodes);
      initial.languageCodes = codeList(p.languageCodes);
      initial.sectorCodes = codeList(p.sectorCodes);
      if (Array.isArray(p.evidence)) {
        initial.evidence = (p.evidence as Record<string, unknown>[]).map((e) => {
          const staged = (e.stagedFile ?? null) as {
            storageKey: string;
            filename: string;
            contentType: string;
            sizeBytes: number;
          } | null;
          return {
            id: undefined as unknown as string,
            evidenceTypeCode: str(e.evidenceTypeCode),
            sovereigntyBasisCode: str(e.sovereigntyBasisCode),
            title: str(e.title),
            description: strOrNull(e.description),
            referenceUrl: strOrNull(e.referenceUrl),
            referenceIdentifier: strOrNull(e.referenceIdentifier),
            issuingBody: strOrNull(e.issuingBody),
            publicVisibility: e.publicVisibility !== false,
            // Show the staged file's name so the provider sees it persisted.
            fileFilename: staged?.filename ?? null,
            fileSizeBytes: staged?.sizeBytes ?? null,
            fileContentType: staged?.contentType ?? null,
            stagedFile: staged
          };
        });
      }
      if (Array.isArray(p.endpoints)) {
        initial.endpoints = (p.endpoints as Record<string, unknown>[]).map((ep) => ({
          id: undefined as unknown as string,
          protocolCode: str(ep.protocolCode),
          endpointUrl: str(ep.endpointUrl),
          documentationUrl: strOrNull(ep.documentationUrl),
          authMethodCode: str(ep.authMethodCode),
          accessModelCode: str(ep.accessModelCode),
          primary: ep.primary === true,
          active: ep.active !== false
        }));
      }
    }
  }

  // Resource-level requirements contributed by extensions (e.g. a country
  // requiring a DPIA per resource). Informational for the provider; an admin
  // verifies them, and the resource stays hidden publicly until all pass.
  const reqStatus = await loadVerificationStatusForResource(id);
  const requirementsCard =
    reqStatus.applicable.length > 0 ? (
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 18,
          background: "var(--panel)"
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
          Resource requirements
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {reqStatus.applicable.map((r) => {
            const color =
              r.status === "verified"
                ? "#34d399"
                : r.status === "rejected"
                  ? "#fca5a5"
                  : "#f59e0b";
            return (
              <div
                key={`${r.extensionId}:${r.requirementCode}`}
                style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
              >
                <span style={{ color: "var(--text-2)" }}>
                  {r.label}
                  {r.documentTypeHint ? (
                    <span style={{ color: "var(--text-3)", fontSize: 11.5 }}>
                      {" "}
                      · provide: {r.documentTypeHint}
                    </span>
                  ) : null}
                  {r.status === "rejected" && r.rejectionNote ? (
                    <div style={{ color: "#fca5a5", fontSize: 11.5 }}>{r.rejectionNote}</div>
                  ) : null}
                </span>
                <span style={{ color, fontSize: 12, textTransform: "uppercase" }}>
                  {r.status}
                </span>
              </div>
            );
          })}
        </div>
        {!reqStatus.isFullyVerified ? (
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>
            Until every requirement is verified, this resource stays hidden from the public
            catalogue. Attach the supporting document as evidence below.
          </div>
        ) : null}
      </div>
    ) : null;

  const banner = isListed ? (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 12,
        border:
          draftStatus === "submitted"
            ? "1px solid rgba(245,158,11,0.45)"
            : draftStatus === "rejected"
              ? "1px solid rgba(239,68,68,0.4)"
              : "1px solid rgba(59,130,246,0.4)",
        background:
          draftStatus === "submitted"
            ? "rgba(245,158,11,0.08)"
            : draftStatus === "rejected"
              ? "rgba(239,68,68,0.08)"
              : "rgba(59,130,246,0.08)",
        marginBottom: 18,
        fontSize: 13,
        color: "var(--text-2)",
        lineHeight: 1.5
      }}
    >
      {draftStatus === "submitted"
        ? "This update has been submitted and is awaiting approval. The live listing is unchanged until it is approved."
        : draftStatus === "rejected"
          ? "Your previous update was not approved. Edit and resubmit it for another review — the live listing is unchanged."
          : "This resource is live. Your changes create a pending update that goes for approval; the current version stays public until an admin approves it."}
    </div>
  ) : null;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
          <Link href="/provider/resources" style={{ color: "var(--text-3)" }}>
            {t("backToResources")}
          </Link>
        </div>
        <h1 className="p-title">{resource.title}</h1>
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
      {requirementsCard}
      {banner}
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
        canSubmit={canEdit}
        draftMode={isListed}
        postSubmitPath={isListed ? "/provider/resources" : "/provider/submissions"}
      />
    </div>
  );
}
