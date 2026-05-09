"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@/lib/with-base";

const TYPES = ["model", "agent", "tool", "skill"] as const;

export type NewResourceFormVariant = "public" | "provider";

export function NewResourceForm({
  allowedTypes,
  afterCreate = "portal",
  variant = "public"
}: {
  allowedTypes: string[];
  /** `portal` → `/portal/resources/:id`; `provider` → `/provider/resources/:id/edit` */
  afterCreate?: "portal" | "provider";
  variant?: NewResourceFormVariant;
}) {
  const router = useRouter();
  const [resourceTypeCode, setType] = useState<string>(allowedTypes[0] ?? "model");
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
      const res = await fetch(withBase("/api/portal/resources"), {
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
        setError(data.error ?? "Failed");
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
      setError("Network error");
      setBusy(false);
    }
  }

  const fields = (
    <>
      {variant === "provider" ? (
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="nr-type">Resource type</label>
          <select
            id="nr-type"
            className="p-input p-select"
            value={resourceTypeCode}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPES.filter((t) => allowedTypes.includes(t)).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelClass}>Type</span>
          <select
            className={inputClass}
            style={inputStyle}
            value={resourceTypeCode}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPES.filter((t) => allowedTypes.includes(t)).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      )}
      {variant === "provider" ? (
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="nr-slug">Slug (URL segment, lowercase)</label>
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
            Letters, digits, hyphens only. Becomes part of the public path and AIR-ID.
          </span>
        </div>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelClass}>Slug (URL segment, lowercase)</span>
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
          <label htmlFor="nr-title">Title</label>
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
          <span style={labelClass}>Title</span>
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
          <label htmlFor="nr-short">Short description</label>
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
          <span style={labelClass}>Short description</span>
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
      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: variant === "provider" ? 16 : 0 }}
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy ? "Creating…" : "Create draft"}
      </button>
    </div>
  );
}
