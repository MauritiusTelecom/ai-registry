"use client";

import { withBase } from "@airegistry/sdk";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Select, TextArea } from "@/components/library";
import { useTranslations } from "next-intl";
import { registryFetch, useAuth } from "@airegistry/ui-kit";

export type OrgFormOption = { code: string; name: string };

type Initial = {
  displayName: string;
  slug: string;
  contactEmail: string;
  providerTypeCode: string;
  jurisdictionCode: string;
  legalName: string;
  description: string;
};

export function ProviderOrganisationForm({
  initial,
  providerTypes,
  jurisdictions,
  defaultJurisdictionCode
}: {
  initial: Initial;
  providerTypes: OrgFormOption[];
  jurisdictions: OrgFormOption[];
  defaultJurisdictionCode: string;
}) {
  const router = useRouter();
  const { refresh } = useAuth();
  const t = useTranslations("providerOrgForm");
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [slug, setSlug] = useState(initial.slug);
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [providerTypeCode, setProviderTypeCode] = useState(
    initial.providerTypeCode || "integrator"
  );
  const [jurisdictionCode, setJurisdictionCode] = useState(
    initial.jurisdictionCode || defaultJurisdictionCode
  );
  const [legalName, setLegalName] = useState(initial.legalName);
  const [description, setDescription] = useState(initial.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const res = await registryFetch(withBase("/api/portal/provider/organisation"), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          displayName,
          slug,
          contactEmail,
          providerTypeCode,
          jurisdictionCode,
          legalName: legalName.trim() || null,
          description: description.trim() || null
        })
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(data.error ?? t("saveFailed"));
        return;
      }
      setOk(t("saveSuccess"));
      await refresh();
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="p-card"
      style={{ padding: "22px 24px", maxWidth: 560, borderRadius: 12 }}
    >
      <h2 className="p-card-title" style={{ marginBottom: 16 }}>
        {t("title")}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0, marginBottom: 20 }}>
        {t("description")}
      </p>

<div style={{ display: "grid", gap: 14, marginBottom: 20 }}>
        <Field id="org-display" label="Display name" required>
          <Input
            id="org-display"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
          />
        </Field>

        <Field
          id="org-slug"
          label="Organisation slug"
          required
hint="Lowercase letters, digits, and hyphens. Used in public provider URLs."
        >
          <Input
            id="org-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            minLength={2}
            maxLength={80}
          />
        </Field>

        <Field id="org-email" label="Contact email" required>
          <Input
            id="org-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </Field>

        <Field id="org-type" label="Provider type" required>
          <Select
            id="org-type"
            value={providerTypeCode}
            onChange={(e) => setProviderTypeCode(e.target.value)}
          >
            {providerTypes.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="org-jur" label="Home jurisdiction" required>
          <Select
            id="org-jur"
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

        <Field id="org-legal" label="Legal name (optional)">
          <Input
            id="org-legal"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
          />
        </Field>

        <Field id="org-desc" label="Public description (optional)">
          <TextArea
            id="org-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </div>

      {error ? (
        <p role="alert" style={{ color: "var(--danger, #c62828)", fontSize: 14, marginBottom: 12 }}>
          {error}
        </p>
      ) : null}
      {ok ? (
        <p role="status" style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 12 }}>
          {ok}
        </p>
      ) : null}

<Button type="submit" intent="primary" disabled={saving}>
        {saving ? "Saving…" : "Save organisation"}
      </Button>
    </form>
  );
}