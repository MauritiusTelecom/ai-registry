"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@airegistry/ui-kit";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

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
        setError(data.error ?? "Save failed");
        return;
      }
      setOk("Organisation saved. You can now publish resources.");
      await refresh();
      router.refresh();
    } catch {
      setError("Network error");
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
        Organisation
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0, marginBottom: 20 }}>
        Complete these details to register your provider workspace. Required before you can create or
        submit catalogue resources.
      </p>

      <div className="p-field" style={{ marginBottom: 14 }}>
        <label htmlFor="org-display">Display name</label>
        <input
          id="org-display"
          className="p-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
        />
      </div>

      <div className="p-field" style={{ marginBottom: 14 }}>
        <label htmlFor="org-slug">Organisation slug</label>
        <input
          id="org-slug"
          className="p-input"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          minLength={2}
          maxLength={80}
        />
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
          Lowercase letters, digits, and hyphens. Used in public provider URLs.
        </span>
      </div>

      <div className="p-field" style={{ marginBottom: 14 }}>
        <label htmlFor="org-email">Contact email</label>
        <input
          id="org-email"
          type="email"
          className="p-input"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          required
        />
      </div>

      <div className="p-field" style={{ marginBottom: 14 }}>
        <label htmlFor="org-type">Provider type</label>
        <select
          id="org-type"
          className="p-input p-select"
          value={providerTypeCode}
          onChange={(e) => setProviderTypeCode(e.target.value)}
        >
          {providerTypes.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="p-field" style={{ marginBottom: 14 }}>
        <label htmlFor="org-jur">Home jurisdiction</label>
        <select
          id="org-jur"
          className="p-input p-select"
          value={jurisdictionCode}
          onChange={(e) => setJurisdictionCode(e.target.value)}
        >
          {jurisdictions.map((j) => (
            <option key={j.code} value={j.code}>
              {j.name} ({j.code})
            </option>
          ))}
        </select>
      </div>

      <div className="p-field" style={{ marginBottom: 14 }}>
        <label htmlFor="org-legal">Legal name (optional)</label>
        <input
          id="org-legal"
          className="p-input"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
        />
      </div>

      <div className="p-field" style={{ marginBottom: 20 }}>
        <label htmlFor="org-desc">Public description (optional)</label>
        <textarea
          id="org-desc"
          className="p-input"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
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

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Save organisation"}
      </button>
    </form>
  );
}
