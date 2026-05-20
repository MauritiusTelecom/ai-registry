"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

type RefRow = { code: string; name: string };

export type ProviderEditInitial = {
  id: string;
  slug: string;
  displayName: string;
  legalName: string | null;
  registrationNumber: string | null;
  typeCode: string;
  typeName: string;
  jurisdictionCode: string;
  jurisdictionName: string;
  statusCode: string;
  statusName: string;
  contactEmail: string;
  legalContactEmail: string | null;
  websiteUrl: string | null;
  documentationUrl: string | null;
  description: string | null;
  incidentChannel: string | null;
  oncallEmail: string | null;
  webhookUrl: string | null;
};

/**
 * Admin · Provider edit form. Mirrors the ResourceEditForm conventions:
 * `<Section>` glass cards, two-column `<Row>` grids of `<Field>` inputs, sticky
 * footer with Back/Save buttons. Submits a single PATCH against
 * `/api/admin/providers/:id` — the API enforces required fields, email and URL
 * shapes, and writes the audit-log diff.
 *
 * Status (verified / suspended / official_provider / unverified) and the
 * publish/admin-suspended visibility toggles live in sibling panels on the
 * detail page, not in this form. Slug, status, and submission source are
 * immutable here.
 */
export function ProviderEditForm({
  initial,
  providerTypes,
  jurisdictions
}: {
  initial: ProviderEditInitial;
  providerTypes: RefRow[];
  jurisdictions: RefRow[];
}) {
  const router = useRouter();

  // ── Section 1: identity ─────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [legalName, setLegalName] = useState(initial.legalName ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(
    initial.registrationNumber ?? ""
  );

  // ── Section 2: classification ───────────────────────────────────────────
  const [typeCode, setTypeCode] = useState(initial.typeCode);
  const [jurisdictionCode, setJurisdictionCode] = useState(initial.jurisdictionCode);

  // ── Section 3: contact & links ──────────────────────────────────────────
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [legalContactEmail, setLegalContactEmail] = useState(
    initial.legalContactEmail ?? ""
  );
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl ?? "");
  const [documentationUrl, setDocumentationUrl] = useState(
    initial.documentationUrl ?? ""
  );

  // ── Section 4: incident response ────────────────────────────────────────
  const [incidentChannel, setIncidentChannel] = useState(
    initial.incidentChannel ?? ""
  );
  const [oncallEmail, setOncallEmail] = useState(initial.oncallEmail ?? "");
  const [webhookUrl, setWebhookUrl] = useState(initial.webhookUrl ?? "");

  // ── Section 5: description ──────────────────────────────────────────────
  const [description, setDescription] = useState(initial.description ?? "");

  // ── Status / submit ─────────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function nullableTrim(v: string): string | null {
    const t = v.trim();
    return t === "" ? null : t;
  }

  async function submit() {
    setError(null);
    setOkMsg(null);
    setBusy(true);
    try {
      const payload = {
        displayName: displayName.trim(),
        typeCode,
        jurisdictionCode,
        contactEmail: contactEmail.trim(),
        legalName: nullableTrim(legalName),
        registrationNumber: nullableTrim(registrationNumber),
        legalContactEmail: nullableTrim(legalContactEmail),
        websiteUrl: nullableTrim(websiteUrl),
        documentationUrl: nullableTrim(documentationUrl),
        description: nullableTrim(description),
        incidentChannel: nullableTrim(incidentChannel),
        oncallEmail: nullableTrim(oncallEmail),
        webhookUrl: nullableTrim(webhookUrl)
      };

      const res = await registryFetch(withBase(`/api/admin/providers/${initial.id}`), {
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
      {/* ── 1. Identity ─────────────────────────────────────────────────── */}
      <Section title="Identity">
        <Row>
          <Field label="Display name">
            <input
              className="auth-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          <Field label="Slug (immutable)">
            <input className="auth-input" value={initial.slug} disabled />
          </Field>
        </Row>
        <Row>
          <Field label="Legal name">
            <input
              className="auth-input"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Corporate legal entity name"
            />
          </Field>
          <Field label="Registration number">
            <input
              className="auth-input"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. C123456"
            />
          </Field>
        </Row>
      </Section>

      {/* ── 2. Classification ─────────────────────────────────────────── */}
      <Section title="Classification">
        <Row>
          <Field label="Provider type">
            <select
              className="auth-input"
              value={typeCode}
              onChange={(e) => setTypeCode(e.target.value)}
            >
              {providerTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Home jurisdiction">
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
        </Row>
        <Row>
          <Field label="Verification status (read-only · use the panel on the right)">
            <input
              className="auth-input"
              value={`${initial.statusName} (${initial.statusCode})`}
              disabled
            />
          </Field>
          <div />
        </Row>
      </Section>

      {/* ── 3. Contact & links ─────────────────────────────────────────── */}
      <Section title="Contact & links">
        <Row>
          <Field label="Primary contact email">
            <input
              className="auth-input"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Field>
          <Field label="Legal/compliance contact email">
            <input
              className="auth-input"
              type="email"
              value={legalContactEmail}
              onChange={(e) => setLegalContactEmail(e.target.value)}
              placeholder="legal@example.com"
            />
          </Field>
        </Row>
        <Row>
          <Field label="Website URL">
            <input
              className="auth-input"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </Field>
          <Field label="Documentation URL">
            <input
              className="auth-input"
              type="url"
              value={documentationUrl}
              onChange={(e) => setDocumentationUrl(e.target.value)}
              placeholder="https://docs.example.com"
            />
          </Field>
        </Row>
      </Section>

      {/* ── 4. Incident response ───────────────────────────────────────── */}
      <Section title="Incident response">
        <Row>
          <Field label="Incident channel">
            <input
              className="auth-input"
              value={incidentChannel}
              onChange={(e) => setIncidentChannel(e.target.value)}
              placeholder="Slack/Teams/Matrix handle for alerts"
            />
          </Field>
          <Field label="On-call email">
            <input
              className="auth-input"
              type="email"
              value={oncallEmail}
              onChange={(e) => setOncallEmail(e.target.value)}
              placeholder="oncall@example.com"
            />
          </Field>
        </Row>
        <Row>
          <Field label="Webhook URL">
            <input
              className="auth-input"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.example.com/incidents"
            />
          </Field>
          <div />
        </Row>
      </Section>

      {/* ── 5. Description ─────────────────────────────────────────────── */}
      <Section title="Description">
        <Field label="Provider description">
          <textarea
            className="auth-input"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Free-text summary of this provider"
            style={{ resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>
      </Section>

      {error ? (
        <div style={{ color: "#d33", fontSize: 12 }} role="alert">
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
        <Link className="btn btn-secondary" href="/admin/providers">
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
