"use client";

import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Button,
  Field,
  Input,
  Select,
  TextArea
} from "@/components/library";

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
 * Admin · Provider edit form. The 5-section / 2-column layout is bespoke
 * enough that fitting it through `<EntityForm>` would require library
 * extensions (section markers + colSpan on field defs) that aren't yet
 * justified by other consumers. Here the form keeps its `<Section>` +
 * `<Row>` layout helpers and uses the library's `<Field>`/`<Input>`/
 * `<Select>`/`<TextArea>` primitives for every input.
 *
 * Aesthetic change vs. previous: labels move from `.auth-input`'s
 * mono-uppercase style to the library's standard `.p-field` style. That
 * matches `ProviderOrganisationForm` and is the right look for an admin
 * surface.
 *
 * Submits a single PATCH against `/api/admin/providers/:id` — the API
 * enforces required fields, email and URL shapes, and writes the audit
 * diff. Status / publish / admin-suspended visibility live in sibling
 * panels on the detail page; slug + status are immutable here.
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

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [legalName, setLegalName] = useState(initial.legalName ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(
    initial.registrationNumber ?? ""
  );
  const [typeCode, setTypeCode] = useState(initial.typeCode);
  const [jurisdictionCode, setJurisdictionCode] = useState(
    initial.jurisdictionCode
  );
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [legalContactEmail, setLegalContactEmail] = useState(
    initial.legalContactEmail ?? ""
  );
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl ?? "");
  const [documentationUrl, setDocumentationUrl] = useState(
    initial.documentationUrl ?? ""
  );
  const [incidentChannel, setIncidentChannel] = useState(
    initial.incidentChannel ?? ""
  );
  const [oncallEmail, setOncallEmail] = useState(initial.oncallEmail ?? "");
  const [webhookUrl, setWebhookUrl] = useState(initial.webhookUrl ?? "");
  const [description, setDescription] = useState(initial.description ?? "");

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
      <Section title="Identity">
        <Row>
          <Field id="pe-displayName" label="Display name" required>
            <Input
              id="pe-displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          <Field id="pe-slug" label="Slug" immutable>
            <Input id="pe-slug" value={initial.slug} disabled />
          </Field>
        </Row>
        <Row>
          <Field id="pe-legalName" label="Legal name">
            <Input
              id="pe-legalName"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Corporate legal entity name"
            />
          </Field>
          <Field id="pe-regNo" label="Registration number">
            <Input
              id="pe-regNo"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. C123456"
            />
          </Field>
        </Row>
      </Section>

      <Section title="Classification">
        <Row>
          <Field id="pe-type" label="Provider type" required>
            <Select
              id="pe-type"
              value={typeCode}
              onChange={(e) => setTypeCode(e.target.value)}
            >
              {providerTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} ({t.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field id="pe-jur" label="Home jurisdiction" required>
            <Select
              id="pe-jur"
              value={jurisdictionCode}
              onChange={(e) => setJurisdictionCode(e.target.value)}
            >
              {jurisdictions.map((j) => (
                <option key={j.code} value={j.code}>
                  {j.name} ({j.code})
                </option>
              ))}
            </Select>
          </Field>
        </Row>
        <Row>
          <Field
            id="pe-status"
            label="Verification status"
            hint="Read-only · use the panel on the right"
            immutable
          >
            <Input
              id="pe-status"
              value={`${initial.statusName} (${initial.statusCode})`}
              disabled
            />
          </Field>
          <div />
        </Row>
      </Section>

      <Section title="Contact & links">
        <Row>
          <Field id="pe-contact" label="Primary contact email" required>
            <Input
              id="pe-contact"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Field>
          <Field id="pe-legalContact" label="Legal/compliance contact email">
            <Input
              id="pe-legalContact"
              type="email"
              value={legalContactEmail}
              onChange={(e) => setLegalContactEmail(e.target.value)}
              placeholder="legal@example.com"
            />
          </Field>
        </Row>
        <Row>
          <Field id="pe-website" label="Website URL">
            <Input
              id="pe-website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </Field>
          <Field id="pe-docs" label="Documentation URL">
            <Input
              id="pe-docs"
              type="url"
              value={documentationUrl}
              onChange={(e) => setDocumentationUrl(e.target.value)}
              placeholder="https://docs.example.com"
            />
          </Field>
        </Row>
      </Section>

      <Section title="Incident response">
        <Row>
          <Field id="pe-incCh" label="Incident channel">
            <Input
              id="pe-incCh"
              value={incidentChannel}
              onChange={(e) => setIncidentChannel(e.target.value)}
              placeholder="Slack/Teams/Matrix handle for alerts"
            />
          </Field>
          <Field id="pe-oncall" label="On-call email">
            <Input
              id="pe-oncall"
              type="email"
              value={oncallEmail}
              onChange={(e) => setOncallEmail(e.target.value)}
              placeholder="oncall@example.com"
            />
          </Field>
        </Row>
        <Row>
          <Field id="pe-webhook" label="Webhook URL">
            <Input
              id="pe-webhook"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.example.com/incidents"
            />
          </Field>
          <div />
        </Row>
      </Section>

      <Section title="Description">
        <Field id="pe-desc" label="Provider description">
          <TextArea
            id="pe-desc"
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
        <Button href="/admin/providers" intent="secondary">
          Back to grid
        </Button>
        <Button intent="primary" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass" style={{ padding: 20, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 14, letterSpacing: "0.04em" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
      {children}
    </div>
  );
}