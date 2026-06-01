"use client";

import { withBase } from "@airegistry/sdk";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/library";
import { useTranslations } from "next-intl";
import { registryFetch } from "@airegistry/ui-kit";

export type NewResourceFormVariant = "public" | "provider";

/** Resource type entry. Pages pass the DB-active set, intersected with the
 * env `RESOURCE_TYPES` restriction so an inactive type can never appear in
 * the dropdown. */
export type ResourceTypeChoice = { code: string; name: string };

export function NewResourceForm({
  allowedTypes,
  afterCreate = "portal",
  variant = "public"
}: {
  /** Active resource types the operator allows. Empty list disables submit. */
  allowedTypes: ResourceTypeChoice[];
  /** `portal` → `/portal/resources/:id`; `provider` → `/provider/resources/:id/edit` */
  afterCreate?: "portal" | "provider";
  variant?: NewResourceFormVariant;
}) {
  const router = useRouter();
  const t = useTranslations("newResource");
  const [resourceTypeCode, setType] = useState<string>(
    allowedTypes[0]?.code ?? ""
  );
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [shortDescription, setShort] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inputClass = variant === "provider" ? "p-input" : "glass";
  const inputStyle =
    variant === "provider" ? undefined : ({ padding: 10, borderRadius: 8 } as const);
  const labelClass =
    variant === "provider"
      ? undefined
      : { fontSize: 12, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--text-3)" };

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await registryFetch(withBase("/api/portal/resources"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceTypeCode,
          slug: slug.trim().toLowerCase(),
          title: title.trim(),
          shortDescription: shortDescription.trim()
        })
      });
      const data = (await res.json()) as { error?: string; code?: string; resource?: { id: string } };
      if (!res.ok) {
        setError(data.error ?? t("failed"));
        setBusy(false);
        return;
      }
      const id = data.resource?.id;
      if (id) {
        router.push(
          afterCreate === "provider" ? `/provider/resources/${id}/edit` : `/portal/resources/${id}`
        );
      } else {
        router.push(afterCreate === "provider" ? "/provider/resources" : "/portal/resources");
      }
      router.refresh();
    } catch {
      setError(t("networkError"));
      setBusy(false);
    }
  }

  const fields = (
    <>
      {variant === "provider" ? (
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="nr-type">{t("resourceType")}</label>
          <select
            id="nr-type"
            className="p-input p-select"
            value={resourceTypeCode}
            onChange={(e) => setType(e.target.value)}
            disabled={allowedTypes.length === 0}
          >
            {allowedTypes.map((at) => (
              <option key={at.code} value={at.code}>
                {at.name}
              </option>
            ))}
          </select>
          {allowedTypes.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6, marginBottom: 0 }}>
              {t("noTypesAvailable")}
            </p>
          ) : null}
        </div>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelClass}>{t("type")}</span>
          <select
            className={inputClass}
            style={inputStyle}
            value={resourceTypeCode}
            onChange={(e) => setType(e.target.value)}
            disabled={allowedTypes.length === 0}
          >
            {allowedTypes.map((at) => (
              <option key={at.code} value={at.code}>
                {at.name}
              </option>
            ))}
          </select>
          {allowedTypes.length === 0 ? (
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              {t("noTypesShort")}
            </span>
          ) : null}
        </label>
      )}
      {variant === "provider" ? (
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="nr-slug">{t("slug")}</label>
          <input
            id="nr-slug"
            className={inputClass}
            style={inputStyle}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            autoComplete="off"
            placeholder="my-resource-name"
          />
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            {t("slugHint")}
          </span>
        </div>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelClass}>{t("slug")}</span>
          <input
            className={inputClass}
            style={inputStyle}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            autoComplete="off"
          />
        </label>
      )}
      {variant === "provider" ? (
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="nr-title">{t("titleLabel")}</label>
          <input
            id="nr-title"
            className={inputClass}
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelClass}>{t("titleLabel")}</span>
          <input
            className={inputClass}
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      )}
      {variant === "provider" ? (
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="nr-short">{t("shortDescription")}</label>
          <textarea
            id="nr-short"
            className={inputClass}
            rows={4}
            style={inputStyle}
            value={shortDescription}
            onChange={(e) => setShort(e.target.value)}
          />
        </div>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelClass}>{t("shortDescription")}</span>
          <textarea
            className={inputClass}
            rows={4}
            style={inputStyle}
            value={shortDescription}
            onChange={(e) => setShort(e.target.value)}
          />
        </label>
      )}
    </>
  );

  return (
    <div style={{ display: "grid", gap: variant === "provider" ? 0 : 18 }}>
      {fields}
      {error ? (
        <p
          style={{ color: variant === "provider" ? "var(--danger, #c62828)" : "#f87171", fontSize: 14 }}
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button intent="primary"
        style={{ marginTop: variant === "provider" ? 16 : 0 }}
        disabled={busy || allowedTypes.length === 0}
        onClick={() => void submit()}
      >
{busy ? "Creating…" : "Create draft"}
      </Button>
    </div>
  );
}