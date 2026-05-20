"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@airegistry/ui-kit";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

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

export type ResourceEditInitial = {
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
  listingOriginCode: string;
  listingOriginName: string;
  jurisdictionCode: string;
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

export type ProviderOption = { slug: string; displayName: string };

export function ResourceEditForm({
  initial,
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
  providers,
  listingOrigins
}: {
  initial: ResourceEditInitial;
  riskLevels: RefRow[];
  jurisdictions: RefRow[];
  sovereigntyBases: RefRow[];
  evidenceTypes: RefRow[];
  protocols: RefRow[];
  authMethods: RefRow[];
  accessModels: RefRow[];
  languages: RefRow[];
  sectors: RefRow[];
  resourceTypes: RefRow[];
  providers: ProviderOption[];
  listingOrigins: RefRow[];
}) {
  const router = useRouter();

  // ── Section 1: identity & classification ────────────────────────────────
  const [title, setTitle] = useState(initial.title);
  const [kindCode, setKindCode] = useState(initial.kindCode);
  const [providerSlug, setProviderSlug] = useState(initial.providerSlug);
  const [listingOriginCode, setListingOriginCode] = useState(initial.listingOriginCode);
  const [riskCode, setRiskCode] = useState(initial.riskCode);
  const [jurisdictionCode, setJurisdictionCode] = useState(initial.jurisdictionCode);
  const [publicVisibility, setPublicVisibility] = useState(initial.publicVisibility);

  // ── Section 2: descriptions ─────────────────────────────────────────────
  const [shortDescription, setShortDescription] = useState(initial.shortDescription);
  const [longDescription, setLongDescription] = useState(initial.longDescription ?? "");

  // ── Section 3: versioning & access URLs ─────────────────────────────────
  const [license, setLicense] = useState(initial.license ?? "");
  const [versionLabel, setVersionLabel] = useState(initial.versionLabel ?? "");
  const [versionNumber, setVersionNumber] = useState(initial.versionNumber ?? "");
  const [latencyTier, setLatencyTier] = useState(initial.latencyTier ?? "");
  const [accessUrl, setAccessUrl] = useState(initial.accessUrl ?? "");
  const [sourceCodeUrl, setSourceCodeUrl] = useState(initial.sourceCodeUrl ?? "");
  const [documentationUrl, setDocumentationUrl] = useState(initial.documentationUrl ?? "");
  const [termsUrl, setTermsUrl] = useState(initial.termsUrl ?? "");

  // ── Section 4: sovereignty ──────────────────────────────────────────────
  const [basisCodes, setBasisCodes] = useState<string[]>(initial.sovereigntyBasisCodes);
  const [evidence, setEvidence] = useState<EvidenceRow[]>(initial.evidence);

  // ── Section 5: endpoints ────────────────────────────────────────────────
  const [endpoints, setEndpoints] = useState<EndpointRow[]>(initial.endpoints);

  // ── Section 6: taxonomy tags ────────────────────────────────────────────
  const [languageCodes, setLanguageCodes] = useState<string[]>(initial.languageCodes);
  const [sectorCodes, setSectorCodes] = useState<string[]>(initial.sectorCodes);

  // ── Status / submit ─────────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

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
        sovereigntyBasisCode:
          basisCodes[0] ?? sovereigntyBases[0]?.code ?? "",
        title: "",
        description: "",
        referenceUrl: "",
        referenceIdentifier: "",
        issuingBody: "",
        publicVisibility: true
      }
    ]);
  }
  function updateEvidence(idx: number, patch: Partial<EvidenceRow>) {
    setEvidence((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeEvidence(idx: number) {
    setEvidence((rows) => rows.filter((_, i) => i !== idx));
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
      // Enforce single-primary: when a row is set primary, clear it on the others.
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

  async function submit() {
    setError(null);
    setOkMsg(null);
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        longDescription: longDescription.trim() === "" ? null : longDescription.trim(),
        kindCode,
        providerSlug,
        listingOriginCode,
        riskCode,
        jurisdictionCode,
        publicVisibility,
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

      const res = await registryFetch(withBase(`/api/admin/resources/${initial.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setOkMsg("Saved.");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 24, fontSize: 13 }}>
      {/* ── 1. Identity & classification ───────────────────────────────── */}
      <Section title="Identity & classification">
        <Row>
          <Field label="Title">
            <input
              className="auth-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Slug (immutable)">
            <input className="auth-input" value={initial.slug} disabled />
          </Field>
        </Row>
        <Row>
          <Field label="Kind / resource type">
            <select
              className="auth-input"
              value={kindCode}
              onChange={(e) => setKindCode(e.target.value)}
            >
              {resourceTypes.map((rt) => (
                <option key={rt.code} value={rt.code}>
                  {rt.name} ({rt.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Provider">
            <select
              className="auth-input"
              value={providerSlug}
              onChange={(e) => setProviderSlug(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.displayName} ({p.slug})
                </option>
              ))}
            </select>
          </Field>
        </Row>
        <Row>
          <Field label="Primary jurisdiction">
            <select
              className="auth-input"
              value={jurisdictionCode}
              onChange={(e) => setJurisdictionCode(e.target.value)}
            >
              {jurisdictions.map((j) => (
                <option key={j.code} value={j.code}>
                  {j.name} ({j.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Risk level">
            <select
              className="auth-input"
              value={riskCode}
              onChange={(e) => setRiskCode(e.target.value)}
            >
              {riskLevels.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        </Row>
        <Row>
          <Field label="Listing origin">
            <select
              className="auth-input"
              value={listingOriginCode}
              onChange={(e) => setListingOriginCode(e.target.value)}
            >
              {listingOrigins.map((lo) => (
                <option key={lo.code} value={lo.code}>
                  {lo.name} ({lo.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lifecycle status (use the sidebar to change)">
            <input
              className="auth-input"
              value={`${initial.lifecycleName} (${initial.lifecycleCode})`}
              disabled
            />
          </Field>
        </Row>
        <Field label="Public visibility">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={publicVisibility}
              onChange={(e) => setPublicVisibility(e.target.checked)}
            />
            <span style={{ color: "var(--text-2)" }}>
              Listed publicly when lifecycle reaches <code>listed</code>.
            </span>
          </label>
        </Field>
      </Section>

      {/* ── 2. Descriptions ─────────────────────────────────────────────── */}
      <Section title="Descriptions">
        <Field label="Short description (8+ chars, shown on cards)">
          <textarea
            className="auth-input"
            style={{ minHeight: 70, fontFamily: "inherit" }}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
        </Field>
        <Field label="Long description (markdown OK, shown on detail page)">
          <textarea
            className="auth-input"
            style={{ minHeight: 140, fontFamily: "inherit" }}
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
          />
        </Field>
      </Section>

      {/* ── 3. Versioning & access URLs ─────────────────────────────────── */}
      <Section title="Versioning & access">
        <Row>
          <Field label="License">
            <input
              className="auth-input"
              placeholder="Commercial, Apache-2.0, …"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
            />
          </Field>
          <Field label="Version label">
            <input
              className="auth-input"
              placeholder="200k tokens, Multi-step, …"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Version number">
            <input
              className="auth-input"
              placeholder="0.1.0"
              value={versionNumber}
              onChange={(e) => setVersionNumber(e.target.value)}
            />
          </Field>
          <Field label="Latency tier">
            <input
              className="auth-input"
              placeholder="0.8s, Async (job), …"
              value={latencyTier}
              onChange={(e) => setLatencyTier(e.target.value)}
            />
          </Field>
        </Row>
        <Field label="Access URL">
          <input
            className="auth-input"
            placeholder="https://…"
            value={accessUrl}
            onChange={(e) => setAccessUrl(e.target.value)}
          />
        </Field>
        <Field label="Source code URL">
          <input
            className="auth-input"
            placeholder="https://github.com/…"
            value={sourceCodeUrl}
            onChange={(e) => setSourceCodeUrl(e.target.value)}
          />
        </Field>
        <Field label="Documentation URL">
          <input
            className="auth-input"
            placeholder="https://…"
            value={documentationUrl}
            onChange={(e) => setDocumentationUrl(e.target.value)}
          />
        </Field>
        <Field label="Terms URL">
          <input
            className="auth-input"
            placeholder="https://…"
            value={termsUrl}
            onChange={(e) => setTermsUrl(e.target.value)}
          />
        </Field>
      </Section>

      {/* ── 4. Sovereignty ─────────────────────────────────────────────── */}
      <Section title="Sovereignty">
        <Field label="Sovereignty bases (one or more)">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {sovereigntyBases.map((b) => (
              <label
                key={b.code}
                className="tag"
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  cursor: "pointer",
                  background: basisCodes.includes(b.code)
                    ? "rgba(16,185,129,0.12)"
                    : undefined
                }}
              >
                <input
                  type="checkbox"
                  checked={basisCodes.includes(b.code)}
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
            <strong style={{ fontSize: 13 }}>Evidence ({evidence.length})</strong>
            <button
              type="button"
              className="r-card-action-link"
              onClick={addEvidence}
              disabled={evidenceTypes.length === 0 || sovereigntyBases.length === 0}
            >
              <Icon name="plus" size={12} /> Add evidence
            </button>
          </div>
          {evidence.length === 0 ? (
            <p style={{ color: "var(--text-3)", fontSize: 12, margin: 0 }}>
              No evidence rows. Sovereignty evidence is required for §11 review.
            </p>
          ) : null}
          {evidence.map((e, i) => (
            <div
              key={e.id ?? `new-${i}`}
              className="glass"
              style={{ padding: 14, display: "grid", gap: 10 }}
            >
              <Row>
                <Field label="Evidence type">
                  <select
                    className="auth-input"
                    value={e.evidenceTypeCode}
                    onChange={(ev) =>
                      updateEvidence(i, { evidenceTypeCode: ev.target.value })
                    }
                  >
                    {evidenceTypes.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sovereignty basis">
                  <select
                    className="auth-input"
                    value={e.sovereigntyBasisCode}
                    onChange={(ev) =>
                      updateEvidence(i, { sovereigntyBasisCode: ev.target.value })
                    }
                  >
                    {evidenceBasisOptions.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </Row>
              <Field label="Title">
                <input
                  className="auth-input"
                  value={e.title}
                  onChange={(ev) => updateEvidence(i, { title: ev.target.value })}
                />
              </Field>
              <Field label="Description">
                <textarea
                  className="auth-input"
                  style={{ minHeight: 70, fontFamily: "inherit" }}
                  value={e.description ?? ""}
                  onChange={(ev) =>
                    updateEvidence(i, { description: ev.target.value })
                  }
                />
              </Field>
              <Row>
                <Field label="Reference URL">
                  <input
                    className="auth-input"
                    placeholder="https://…"
                    value={e.referenceUrl ?? ""}
                    onChange={(ev) =>
                      updateEvidence(i, { referenceUrl: ev.target.value })
                    }
                  />
                </Field>
                <Field label="Reference identifier">
                  <input
                    className="auth-input"
                    placeholder="DPA 2017, MT-CLOUD-EBN, …"
                    value={e.referenceIdentifier ?? ""}
                    onChange={(ev) =>
                      updateEvidence(i, { referenceIdentifier: ev.target.value })
                    }
                  />
                </Field>
              </Row>
              <Field label="Issuing body">
                <input
                  className="auth-input"
                  placeholder="Data Protection Office, …"
                  value={e.issuingBody ?? ""}
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
                    onChange={(ev) =>
                      updateEvidence(i, { publicVisibility: ev.target.checked })
                    }
                  />
                  Public
                </label>
                <button
                  type="button"
                  className="r-card-action-link"
                  onClick={() => removeEvidence(i)}
                >
                  <Icon name="trash" size={12} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 5. Endpoints ───────────────────────────────────────────────── */}
      <Section title="Endpoints">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline"
          }}
        >
          <strong style={{ fontSize: 13 }}>Endpoints ({endpoints.length})</strong>
          <button
            type="button"
            className="r-card-action-link"
            onClick={addEndpoint}
            disabled={
              protocols.length === 0 ||
              authMethods.length === 0 ||
              accessModels.length === 0
            }
          >
            <Icon name="plus" size={12} /> Add endpoint
          </button>
        </div>
        {endpoints.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: 12, margin: 0 }}>
            No endpoints. A resource needs at least one before it can be approved.
          </p>
        ) : null}
        {endpoints.map((ep, i) => (
          <div
            key={ep.id ?? `new-${i}`}
            className="glass"
            style={{ padding: 14, display: "grid", gap: 10 }}
          >
            <Row>
              <Field label="Protocol">
                <select
                  className="auth-input"
                  value={ep.protocolCode}
                  onChange={(e) => updateEndpoint(i, { protocolCode: e.target.value })}
                >
                  {protocols.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Endpoint URL">
                <input
                  className="auth-input"
                  placeholder="https://…"
                  value={ep.endpointUrl}
                  onChange={(e) => updateEndpoint(i, { endpointUrl: e.target.value })}
                />
              </Field>
            </Row>
            <Field label="Documentation URL">
              <input
                className="auth-input"
                placeholder="https://…"
                value={ep.documentationUrl ?? ""}
                onChange={(e) =>
                  updateEndpoint(i, { documentationUrl: e.target.value })
                }
              />
            </Field>
            <Row>
              <Field label="Auth method">
                <select
                  className="auth-input"
                  value={ep.authMethodCode}
                  onChange={(e) =>
                    updateEndpoint(i, { authMethodCode: e.target.value })
                  }
                >
                  {authMethods.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Access model">
                <select
                  className="auth-input"
                  value={ep.accessModelCode}
                  onChange={(e) =>
                    updateEndpoint(i, { accessModelCode: e.target.value })
                  }
                >
                  {accessModels.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name}
                    </option>
                  ))}
                </select>
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
                    onChange={(e) => updateEndpoint(i, { primary: e.target.checked })}
                  />
                  Primary
                </label>
                <label
                  style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}
                >
                  <input
                    type="checkbox"
                    checked={ep.active}
                    onChange={(e) => updateEndpoint(i, { active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <button
                type="button"
                className="r-card-action-link"
                onClick={() => removeEndpoint(i)}
              >
                <Icon name="trash" size={12} /> Remove
              </button>
            </div>
          </div>
        ))}
      </Section>

      {/* ── 6. Taxonomy tags ───────────────────────────────────────────── */}
      <Section title="Languages & sectors">
        <Field label={`Languages (${languageCodes.length})`}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {languages.map((l) => (
              <label
                key={l.code}
                className="tag"
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  cursor: "pointer",
                  background: languageCodes.includes(l.code)
                    ? "rgba(16,185,129,0.12)"
                    : undefined
                }}
              >
                <input
                  type="checkbox"
                  checked={languageCodes.includes(l.code)}
                  onChange={() => setLanguageCodes((c) => toggleMulti(c, l.code))}
                />
                {l.name} ({l.code})
              </label>
            ))}
          </div>
        </Field>
        <Field label={`Sectors (${sectorCodes.length})`}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {sectors.map((s) => (
              <label
                key={s.code}
                className="tag"
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  cursor: "pointer",
                  background: sectorCodes.includes(s.code)
                    ? "rgba(16,185,129,0.12)"
                    : undefined
                }}
              >
                <input
                  type="checkbox"
                  checked={sectorCodes.includes(s.code)}
                  onChange={() => setSectorCodes((c) => toggleMulti(c, s.code))}
                />
                {s.name}
              </label>
            ))}
          </div>
        </Field>
      </Section>

      {/* ── Submit bar ────────────────────────────────────────────────── */}
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
        <Link className="btn btn-secondary" href="/admin/resources">
          Back to grid
        </Link>
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={busy}
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="glass"
      style={{ padding: 20, display: "grid", gap: 12 }}
    >
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-3)",
          letterSpacing: "0.08em",
          textTransform: "uppercase"
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
