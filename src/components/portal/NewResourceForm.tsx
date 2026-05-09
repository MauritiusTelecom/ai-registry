"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["model", "agent", "tool", "skill"] as const;

export function NewResourceForm({ allowedTypes }: { allowedTypes: string[] }) {
  const router = useRouter();
  const [resourceTypeCode, setType] = useState<string>(allowedTypes[0] ?? "model");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [shortDescription, setShort] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceTypeCode,
          slug: slug.trim().toLowerCase(),
          title: title.trim(),
          shortDescription: shortDescription.trim()
        })
      });
      const data = (await res.json()) as { error?: string; resource?: { id: string } };
      if (!res.ok) {
        setError(data.error ?? "Failed");
        setBusy(false);
        return;
      }
      if (data.resource?.id) router.push(`/portal/resources/${data.resource.id}`);
      else router.push("/portal/resources");
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          Type
        </span>
        <select
          className="glass"
          style={{ padding: 10, borderRadius: 8 }}
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
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          Slug (URL segment, lowercase)
        </span>
        <input
          className="glass"
          style={{ padding: 10, borderRadius: 8 }}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          autoComplete="off"
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          Title
        </span>
        <input
          className="glass"
          style={{ padding: 10, borderRadius: 8 }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          Short description
        </span>
        <textarea
          className="glass"
          rows={4}
          style={{ padding: 10, borderRadius: 8 }}
          value={shortDescription}
          onChange={(e) => setShort(e.target.value)}
        />
      </label>
      {error ? (
        <p style={{ color: "#f87171", fontSize: 14 }} role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
        {busy ? "Creating…" : "Create draft"}
      </button>
    </div>
  );
}
