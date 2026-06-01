"use client";

import { withBase } from "@airegistry/sdk";

import { useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { Icon, Button, Field, Input, Select, TextArea } from "@/components/library";
import { useTranslations } from "next-intl";
import { registryFetch } from "@airegistry/ui-kit";
import { EvidenceFileAttachment } from "@/components/portal/EvidenceFileAttachment";

type RefRow = { code: string; name: string };

type EvidenceRow = {
  id?: string;
  evidenceTypeCode: string;
  sovereigntyBasisCode: string;
  title: string;
  description: string | null;
  referenceUrl: string | null;
  referenceIdentifier: string | null;
  issuingBody: string | null;
  publicVisibility: boolean;
  fileFilename?: string | null;
  fileSizeBytes?: number | null;
  fileContentType?: string | null;
};

type EndpointRow = {
  id?: string;
  protocolCode: string;
  endpointUrl: string;
  documentationUrl: string | null;
  authMethodCode: string;
  accessModelCode: string;
  primary: boolean;
  active: boolean;
};

export type ProviderResourceEditInitial = {
  id: string;
  airId: string | null;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string | null;
  kindCode: string;
  kindName: string;
  providerSlug: string;
  providerName: string;
  jurisdictionCode: string;
  jurisdictionName: string;
  lifecycleCode: string;
  lifecycleName: string;
  riskCode: string;
  publicVisibility: boolean;
  license: string | null;
  versionLabel: string | null;
  versionNumber: string | null;
  latencyTier: string | null;
  accessUrl: string | null;
  sourceCodeUrl: string | null;
  documentationUrl: string | null;
  termsUrl: string | null;
  sovereigntyBasisCodes: string[];
  languageCodes: string[];
  sectorCodes: string[];
  evidence: EvidenceRow[];
  endpoints: EndpointRow[];
};

export function ProviderResourceEditForm({
  initial,
  sovereigntyBases,
  evidenceTypes,
  protocols,
  authMethods,
  accessModels,
  languages,
  sectors,
  canEdit,
  canSubmit,
  postSubmitPath = "/provider/submissions"
}: {
  initial: ProviderResourceEditInitial;
  sovereigntyBases: RefRow[];
  evidenceTypes: RefRow[];
  protocols: RefRow[];
  authMethods: RefRow[];
  accessModels: RefRow[];
  languages: RefRow[];
  sectors: RefRow[];
  canEdit: boolean;
  canSubmit: boolean;
  postSubmitPath?: string;
}) {
  const router = useRouter();
  const t = useTranslations("providerResourceEdit");

  // ── Editable scalars ────────────────────────────────────────────────────
  const [title, setTitle] = useState(initial.title);
  const [shortDescription, setShortDescription] = useState(initial.shortDescription);
  const [longDescription, setLongDescription] = useState(initial.longDescription ?? "");
  const [license, setLicense] = useState(initial.license ?? "");
  const [versionLabel, setVersionLabel] = useState(initial.versionLabel ?? "");
  const [versionNumber, setVersionNumber] = useState(initial.versionNumber ?? "");
  const [latencyTier, setLatencyTier] = useState(initial.latencyTier ?? "");
  const [accessUrl, setAccessUrl] = useState(initial.accessUrl ?? "");
  const [sourceCodeUrl, setSourceCodeUrl] = useState(initial.sourceCodeUrl ?? "");
  const [documentationUrl, setDocumentationUrl] = useState(initial.documentationUrl ?? "");
  const [termsUrl, setTermsUrl] = useState(initial.termsUrl ?? "");

  // ── Sovereignty ─────────────────────────────────────────────────────────
  const [basisCodes, setBasisCodes] = useState<string[]>(initial.sovereigntyBasisCodes);
  const [evidence, setEvidence] = useState<EvidenceRow[]>(initial.evidence);
  // Files queued on unsaved evidence rows; index-aligned with `evidence`.
  // Re-keyed on save once the new evidence ids land in the PATCH response.
  const [pendingEvidenceFiles, setPendingEvidenceFiles] = useState<(File | null)[]>(
    () => initial.evidence.map(() => null)
  );

  // ── Endpoints ───────────────────────────────────────────────────────────
  const [endpoints, setEndpoints] = useState<EndpointRow[]>(initial.endpoints);

  // ── Taxonomy ────────────────────────────────────────────────────────────
  const [languageCodes, setLanguageCodes] = useState<string[]>(initial.languageCodes);
  const [sectorCodes, setSectorCodes] = useState<string[]>(initial.sectorCodes);

  // Discriminated busy state so "Save" and "Submit for review" never flip
  // labels at the same time — only the active button shows its busy text.
  // The other button is disabled until the in-flight action settles.
  const [pending, setPending] = useState<"save" | "submit" | null>(null);
  const busy = pending !== null;
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  // Notify-operators toggle for the submit-for-review action. Default ON.
  const [notifyOperators, setNotifyOperators] = useState(true);

  const evidenceBasisOptions = useMemo(
    () =>
      sovereigntyBases.filter((b) => basisCodes.length === 0 || basisCodes.includes(b.code)),
    [sovereigntyBases, basisCodes]
  );

  function addEvidence() {
    setEvidence((rows) => [
      ...rows,
      {
        evidenceTypeCode: evidenceTypes[0]?.code ?? "",
        sovereigntyBasisCode: basisCodes[0] ?? sovereigntyBases[0]?.code ?? "",
        title: "",
        description: "",
        referenceUrl: "",
        referenceIdentifier: "",
        issuingBody: "",
        publicVisibility: true
      }
    ]);
    setPendingEvidenceFiles((arr) => [...arr, null]);
  }
  function updateEvidence(idx: number, patch: Partial<EvidenceRow>) {
    setEvidence((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeEvidence(idx: number) {
    setEvidence((rows) => rows.filter((_, i) => i !== idx));
    setPendingEvidenceFiles((arr) => arr.filter((_, i) => i !== idx));
  }
  function setPendingFile(idx: number, file: File | null) {
    setPendingEvidenceFiles((arr) => arr.map((f, i) => (i === idx ? file : f)));
  }

  function addEndpoint() {
    setEndpoints((rows) => [
      ...rows,
      {
        protocolCode: protocols[0]?.code ?? "rest",
        endpointUrl: "",
        documentationUrl: "",
        authMethodCode: authMethods[0]?.code ?? "api_key",
        accessModelCode: accessModels[0]?.code ?? "registered",
        primary: rows.length === 0,
        active: true
      }
    ]);
  }
  function updateEndpoint(idx: number, patch: Partial<EndpointRow>) {
    setEndpoints((rows) => {
      const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      if (patch.primary === true) {
        return next.map((r, i) => (i === idx ? r : { ...r, primary: false }));
      }
      return next;
    });
  }
  function removeEndpoint(idx: number) {
    setEndpoints((rows) => rows.filter((_, i) => i !== idx));
  }

  function toggleMulti(list: string[], code: string): string[] {
    return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
  }

  async function save() {
    setError(null);
    setOkMsg(null);
    setPending("save");
    try {
      const payload = {
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        longDescription: longDescription.trim() === "" ? null : longDescription.trim(),
        license: license.trim() === "" ? null : license.trim(),
        versionLabel: versionLabel.trim() === "" ? null : versionLabel.trim(),
        versionNumber: versionNumber.trim() === "" ? null : versionNumber.trim(),
        latencyTier: latencyTier.trim() === "" ? null : latencyTier.trim(),
        accessUrl: accessUrl.trim() === "" ? null : accessUrl.trim(),
        sourceCodeUrl: sourceCodeUrl.trim() === "" ? null : sourceCodeUrl.trim(),
        documentationUrl:
          documentationUrl.trim() === "" ? null : documentationUrl.trim(),
        termsUrl: termsUrl.trim() === "" ? null : termsUrl.trim(),
        sovereigntyBasisCodes: basisCodes,
        languageCodes,
        sectorCodes,
        evidence: evidence.map((e) => ({
          evidenceTypeCode: e.evidenceTypeCode,
          sovereigntyBasisCode: e.sovereigntyBasisCode,
          title: e.title.trim(),
          description: (e.description ?? "").trim() === "" ? null : e.description,
          referenceUrl: (e.referenceUrl ?? "").trim() === "" ? null : e.referenceUrl,
          referenceIdentifier:
            (e.referenceIdentifier ?? "").trim() === "" ? null : e.referenceIdentifier,
          issuingBody: (e.issuingBody ?? "").trim() === "" ? null : e.issuingBody,
          publicVisibility: e.publicVisibility
        })),
        endpoints: endpoints.map((ep) => ({
          protocolCode: ep.protocolCode,
          endpointUrl: ep.endpointUrl.trim(),
          documentationUrl:
            (ep.documentationUrl ?? "").trim() === "" ? null : ep.documentationUrl,
          authMethodCode: ep.authMethodCode,
          accessModelCode: ep.accessModelCode,
          primary: ep.primary,
          active: ep.active
        }))
      };

      const res = await registryFetch(withBase(`/api/portal/resources/${initial.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as {
        error?: string;
        evidenceIds?: string[] | null;
      };
      if (!res.ok) {
        setError(data.error ?? t("saveFailed"));
        return;
      }

      // Upload any staged evidence files now that we have the new ids.
      const evidenceIds = data.evidenceIds;
      const pending = pendingEvidenceFiles;
      if (evidenceIds && evidenceIds.length === pending.length) {
        const failures: string[] = [];
        for (let i = 0; i < pending.length; i++) {
          const file = pending[i];
          const evId = evidenceIds[i];
          if (!file || !evId) continue;
          try {
            const form = new FormData();
            form.append("file", file);
            const upRes = await registryFetch(
              withBase(`/api/portal/resources/${initial.id}/evidence/${evId}/file`),
              { method: "POST", body: form }
            );
            if (!upRes.ok) {
              const detail = (await upRes.json().catch(() => ({}))).error ?? `HTTP ${upRes.status}`;
              failures.push(`${file.name}: ${detail}`);
            }
          } catch {
            failures.push(`${file.name}: network error`);
          }
        }
        if (failures.length > 0) {
          setError(t("fileUploadPartialFail", { details: failures.join("\n") }));
        } else {
          setOkMsg(
            pending.some((f) => f) ? t("savedAndUploaded") : t("saved")
          );
        }
        setPendingEvidenceFiles(pending.map(() => null));
      } else {
        setOkMsg(t("saved"));
      }
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(null);
    }
  }

  async function submitForReview() {
    setError(null);
    setOkMsg(null);
    setPending("submit");
    try {
      const res = await registryFetch(
        withBase(`/api/portal/resources/${initial.id}/submit`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifyByEmail: notifyOperators })
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("submitFailed"));
        return;
      }
      router.push(postSubmitPath);
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(null);
    }
  }

  const readOnlyNotice = !canEdit ? (
    <div
      style={{
        padding: "10px 14px",
        background: "rgba(245, 158, 11, 0.08)",
        border: "1px solid rgba(245, 158, 11, 0.4)",
        borderRadius: 8,
        fontSize: 13,
        color: "var(--text-2)"
      }}
    >
      {t("readOnlyNotice", { lifecycle: initial.lifecycleName })}
    </div>
  ) : null;

  return (
    <div style={{ display: "grid", gap: 24, fontSize: 13 }}>
      {readOnlyNotice}

      {/* ── 1. Identity (read-only context) ────────────────────────────── */}
      <Section title={t("sectionIdentity")}>
        <Row>
<Field label={t("fieldTitle")}>
            <Input
                            value={title}
              disabled={!canEdit}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
<Field label={t("fieldSlugImmutable")}>
            <Input value={initial.slug} disabled />
          </Field>
        </Row>
        <Row>
          <Field label={t("fieldKindImmutable")}>
            <Input
                            value={`${initial.kindName} (${initial.kindCode})`}
              disabled
            />
          </Field>
          <Field label={t("fieldProviderImmutable")}>
            <Input
                            value={`${initial.providerName} (${initial.providerSlug})`}
              disabled
            />
          </Field>
        </Row>
        <Row>
<Field label={t("fieldPrimaryJurisdictionAdmin")}>
            <Input
                            value={`${initial.jurisdictionName} (${initial.jurisdictionCode})`}
              disabled
            />
          </Field>
          <Field label={t("fieldRiskLevelAdmin")}>
            <Input value={initial.riskCode} disabled />
          </Field>
        </Row>
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
          {t("identityNote")}
        </p>
      </Section>

      {/* ── 2. Descriptions ─────────────────────────────────────────────── */}
<Section title="Descriptions">
        <Field label={t("fieldShortDescCards")}>
          <TextArea
                          style={{ minHeight: 70, fontFamily: "inherit" }}
            value={shortDescription}
            disabled={!canEdit}
            onChange={(e) => setShortDescription(e.target.value)}
          />
        </Field>
<Field label={t("fieldLongDescMarkdown")}>
          <TextArea
                          style={{ minHeight: 140, fontFamily: "inherit" }}
            value={longDescription}
            disabled={!canEdit}
            onChange={(e) => setLongDescription(e.target.value)}
          />
        </Field>
      </Section>

      {/* ── 3. Versioning & access URLs ─────────────────────────────────── */}
      <Section title={t("sectionVersioning")}>
        <Row>
<Field label={t("fieldLicense")}>
            <Input
                            placeholder="Commercial, Apache-2.0, ..."
              value={license}
              disabled={!canEdit}
              onChange={(e) => setLicense(e.target.value)}
            />
          </Field>
<Field label={t("fieldVersionLabel")}>
            <Input
                            placeholder="200k tokens, Multi-step, ..."
              value={versionLabel}
              disabled={!canEdit}
              onChange={(e) => setVersionLabel(e.target.value)}
            />
          </Field>
        </Row>
        <Row>
<Field label={t("fieldVersionNumber")}>
            <Input
                            placeholder="0.1.0"
              value={versionNumber}
              disabled={!canEdit}
              onChange={(e) => setVersionNumber(e.target.value)}
            />
          </Field>
<Field label={t("fieldLatencyTier")}>
            <Input
                            placeholder="0.8s, Async (job), ..."
              value={latencyTier}
              disabled={!canEdit}
              onChange={(e) => setLatencyTier(e.target.value)}
            />
          </Field>
        </Row>
<Field label={t("fieldAccessUrl")}>
          <Input
                          placeholder="https://..."
            value={accessUrl}
            disabled={!canEdit}
            onChange={(e) => setAccessUrl(e.target.value)}
          />
        </Field>
<Field label={t("fieldSourceCodeUrl")}>
          <Input
                          placeholder="https://github.com/..."
            value={sourceCodeUrl}
            disabled={!canEdit}
            onChange={(e) => setSourceCodeUrl(e.target.value)}
          />
        </Field>
<Field label={t("fieldDocumentationUrl")}>
          <Input
                          placeholder="https://..."
            value={documentationUrl}
            disabled={!canEdit}
            onChange={(e) => setDocumentationUrl(e.target.value)}
          />
        </Field>
<Field label={t("fieldTermsUrl")}>
          <Input
                          placeholder="https://..."
            value={termsUrl}
            disabled={!canEdit}
            onChange={(e) => setTermsUrl(e.target.value)}
          />
        </Field>
      </Section>

      {/* ── 4. Sovereignty ─────────────────────────────────────────────── */}
      <Section title={t("sectionSovereignty")}>
        <Field label={t("fieldSovereigntyBases")}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {sovereigntyBases.map((b) => (
              <label
                key={b.code}
                className="tag"
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  cursor: canEdit ? "pointer" : "not-allowed",
                  background: basisCodes.includes(b.code)
                    ? "rgba(16,185,129,0.12)"
                    : undefined
                }}
              >
                <input
                  type="checkbox"
                  checked={basisCodes.includes(b.code)}
                  disabled={!canEdit}
                  onChange={() => setBasisCodes((l) => toggleMulti(l, b.code))}
                />
                {b.name}
              </label>
            ))}
          </div>
        </Field>

        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline"
            }}
          >
            <strong style={{ fontSize: 13 }}>{t("evidenceCount", { count: evidence.length })}</strong>
            <button
              type="button"
              className="r-card-action-link"
              onClick={addEvidence}
              disabled={!canEdit || evidenceTypes.length === 0 || sovereigntyBases.length === 0}
            >
              <Icon name="plus" size={12} /> {t("addEvidence")}
            </button>
          </div>
          {evidence.length === 0 ? (
            <p style={{ color: "var(--text-3)", fontSize: 12, margin: 0 }}>
              {t("noEvidenceRows")}
            </p>
          ) : null}
          {evidence.map((e, i) => (
            <div
              key={e.id ?? `new-${i}`}
              className="glass"
              style={{ padding: 14, display: "grid", gap: 10 }}
            >
              <Row>
<Field label={t("fieldEvidenceType")}>
                  <Select
                                  value={e.evidenceTypeCode}
                    disabled={!canEdit}
                    onChange={(ev) =>
                      updateEvidence(i, { evidenceTypeCode: ev.target.value })
                    }
                  >
                    {evidenceTypes.map((et) => (
                      <option key={et.code} value={et.code}>
                        {et.name}
                      </option>
                    ))}
                  </Select>
                </Field>
<Field label={t("fieldSovereigntyBasis")}>
                  <Select
                                  value={e.sovereigntyBasisCode}
                    disabled={!canEdit}
                    onChange={(ev) =>
                      updateEvidence(i, { sovereigntyBasisCode: ev.target.value })
                    }
                  >
                    {evidenceBasisOptions.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </Row>
<Field label={t("fieldEvidenceTitle")}>
                <Input
                                value={e.title}
                  disabled={!canEdit}
                  onChange={(ev) => updateEvidence(i, { title: ev.target.value })}
                />
              </Field>
<Field label={t("fieldDescription")}>
                <TextArea
                                style={{ minHeight: 70, fontFamily: "inherit" }}
                  value={e.description ?? ""}
                  disabled={!canEdit}
                  onChange={(ev) =>
                    updateEvidence(i, { description: ev.target.value })
                  }
                />
              </Field>
              <Row>
<Field label={t("fieldReferenceUrl")}>
                  <Input
                                  placeholder="https://..."
                    value={e.referenceUrl ?? ""}
                    disabled={!canEdit}
                    onChange={(ev) =>
                      updateEvidence(i, { referenceUrl: ev.target.value })
                    }
                  />
                </Field>
<Field label={t("fieldReferenceId")}>
                  <Input
                                  placeholder="DPA 2017, ..."
                    value={e.referenceIdentifier ?? ""}
                    disabled={!canEdit}
                    onChange={(ev) =>
                      updateEvidence(i, { referenceIdentifier: ev.target.value })
                    }
                  />
                </Field>
              </Row>
<Field label={t("fieldIssuingBody")}>
                <Input
                                placeholder="Data Protection Office, ..."
                  value={e.issuingBody ?? ""}
                  disabled={!canEdit}
                  onChange={(ev) =>
                    updateEvidence(i, { issuingBody: ev.target.value })
                  }
                />
              </Field>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <label
                  style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}
                >
                  <input
                    type="checkbox"
                    checked={e.publicVisibility}
                    disabled={!canEdit}
                    onChange={(ev) =>
                      updateEvidence(i, { publicVisibility: ev.target.checked })
                    }
                  />
                  {t("public")}
                </label>
                <button
                  type="button"
                  className="r-card-action-link"
                  onClick={() => removeEvidence(i)}
                  disabled={!canEdit}
                >
                  <Icon name="trash" size={12} /> {t("remove")}
                </button>
              </div>
              <EvidenceFileAttachment
                resourceId={initial.id}
                evidenceId={e.id}
                initial={{
                  filename: e.fileFilename ?? null,
                  sizeBytes: e.fileSizeBytes ?? null,
                  contentType: e.fileContentType ?? null
                }}
                disabled={!canEdit}
                pendingFile={pendingEvidenceFiles[i] ?? null}
                onPendingChange={(file) => setPendingFile(i, file)}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── 5. Endpoints ───────────────────────────────────────────────── */}
      <Section title={t("sectionEndpoints")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline"
          }}
        >
          <strong style={{ fontSize: 13 }}>{t("endpointsCount", { count: endpoints.length })}</strong>
          <button
            type="button"
            className="r-card-action-link"
            onClick={addEndpoint}
            disabled={!canEdit || protocols.length === 0 || authMethods.length === 0 || accessModels.length === 0}
          >
            <Icon name="plus" size={12} /> {t("addEndpoint")}
          </button>
        </div>
        {endpoints.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 12, margin: 0 }}>
            {t("noEndpoints")}
          </p>
        ) : null}
        {endpoints.map((ep, i) => (
          <div
            key={ep.id ?? `new-${i}`}
            className="glass"
            style={{ padding: 14, display: "grid", gap: 10 }}
          >
            <Row>
<Field label={t("fieldProtocol")}>
                <Select
                                value={ep.protocolCode}
                  disabled={!canEdit}
                  onChange={(e) => updateEndpoint(i, { protocolCode: e.target.value })}
                >
                  {protocols.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
<Field label={t("fieldEndpointUrl")}>
                <Input
                                placeholder="https://..."
                  value={ep.endpointUrl}
                  disabled={!canEdit}
                  onChange={(e) => updateEndpoint(i, { endpointUrl: e.target.value })}
                />
              </Field>
            </Row>
<Field label={t("fieldEndpointDocUrl")}>
              <Input
                              placeholder="https://..."
                value={ep.documentationUrl ?? ""}
                disabled={!canEdit}
                onChange={(e) =>
                  updateEndpoint(i, { documentationUrl: e.target.value })
                }
              />
            </Field>
            <Row>
<Field label={t("fieldAuthMethod")}>
                <Select
                                value={ep.authMethodCode}
                  disabled={!canEdit}
                  onChange={(e) =>
                    updateEndpoint(i, { authMethodCode: e.target.value })
                  }
                >
                  {authMethods.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
<Field label={t("fieldAccessModel")}>
                <Select
                                value={ep.accessModelCode}
                  disabled={!canEdit}
                  onChange={(e) =>
                    updateEndpoint(i, { accessModelCode: e.target.value })
                  }
                >
                  {accessModels.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </Row>
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", gap: 16 }}>
                <label
                  style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}
                >
                  <input
                    type="checkbox"
                    checked={ep.primary}
                    disabled={!canEdit}
                    onChange={(e) => updateEndpoint(i, { primary: e.target.checked })}
                  />
                  {t("primary")}
                </label>
                <label
                  style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}
                >
                  <input
                    type="checkbox"
                    checked={ep.active}
                    disabled={!canEdit}
                    onChange={(e) => updateEndpoint(i, { active: e.target.checked })}
                  />
                  {t("active")}
                </label>
              </div>
              <button
                type="button"
                className="r-card-action-link"
                onClick={() => removeEndpoint(i)}
                disabled={!canEdit}
              >
                <Icon name="trash" size={12} /> {t("remove")}
              </button>
            </div>
          </div>
        ))}
      </Section>

      {/* ── 6. Taxonomy tags ───────────────────────────────────────────── */}
      <Section title={t("sectionLanguages")}>
        <Field label={`${t("fieldLanguages")} (${languageCodes.length})`}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {languages.map((l) => (
              <label
                key={l.code}
                className="tag"
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  cursor: canEdit ? "pointer" : "not-allowed",
                  background: languageCodes.includes(l.code)
                    ? "rgba(16,185,129,0.12)"
                    : undefined
                }}
              >
                <input
                  type="checkbox"
                  checked={languageCodes.includes(l.code)}
                  disabled={!canEdit}
                  onChange={() => setLanguageCodes((c) => toggleMulti(c, l.code))}
                />
                {l.name} ({l.code})
              </label>
            ))}
          </div>
        </Field>
        <Field label={`${t("fieldSectors")} (${sectorCodes.length})`}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {sectors.map((s) => (
              <label
                key={s.code}
                className="tag"
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  cursor: canEdit ? "pointer" : "not-allowed",
                  background: sectorCodes.includes(s.code)
                    ? "rgba(16,185,129,0.12)"
                    : undefined
                }}
              >
                <input
                  type="checkbox"
                  checked={sectorCodes.includes(s.code)}
                  disabled={!canEdit}
                  onChange={() => setSectorCodes((c) => toggleMulti(c, s.code))}
                />
                {s.name}
              </label>
            ))}
          </div>
        </Field>
      </Section>

      {/* ── Submit bar ─────────────────────────────────────────────────── */}
      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : null}
      {okMsg ? (
        <div style={{ color: "#10b981", fontSize: 12 }} role="status">
          {okMsg}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          position: "sticky",
          bottom: 0,
          padding: "10px 0",
          background: "var(--bg)"
        }}
      >
<Button href="/provider/resources" intent="secondary">
          {t("backToResources")}
        </Button>
        {canEdit ? (
          <Button intent="secondary" onClick={save} disabled={busy}>
            {pending === "save" ? t("saving") : t("saveChanges")}
          </Button>
        ) : null}
        {canSubmit ? (
          <Button intent="primary" onClick={submitForReview} disabled={busy}>
            {pending === "submit" ? t("submitting") : t("submitForReview")}
          </Button>
        ) : null}
      </div>
      {canSubmit ? (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: notifyOperators ? "var(--text-2)" : "var(--text-3)",
            cursor: "pointer"
          }}
        >
          <input
            type="checkbox"
            checked={notifyOperators}
            onChange={(e) => setNotifyOperators(e.target.checked)}
            style={{ accentColor: "var(--primary)" }}
          />
          <span>{t("notifyOperators")}</span>
        </label>
      ) : null}
      {canSubmit ? (
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
          {t("submitHint")}
        </p>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass" style={{ padding: 20, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 14, letterSpacing: "0.04em" }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
      {children}
    </div>
  );
}

// Local Field helper removed — file now uses library `<Field>` via the
// import at the top, which renders the standard `.p-field` aesthetic
// matching the rest of the admin code.