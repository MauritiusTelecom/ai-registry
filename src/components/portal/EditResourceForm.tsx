"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  resourceId: string;
  initialTitle: string;
  initialShort: string;
  initialLong: string | null;
  lifecycle: string;
  canEdit: boolean;
  canSubmit: boolean;
  /** `glass` = generic portal; `provider` = provider portal inputs */
  variant?: "glass" | "provider";
  /** Navigate here after successful submit-for-review */
  postSubmitPath?: string;
};

export function EditResourceForm({
  resourceId,
  initialTitle,
  initialShort,
  initialLong,
  lifecycle,
  canEdit,
  canSubmit,
  variant = "glass",
  postSubmitPath = "/portal/resources"
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [shortDescription, setShort] = useState(initialShort);
  const [longDescription, setLong] = useState(initialLong ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/portal/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          shortDescription: shortDescription.trim(),
          longDescription: longDescription.trim() === "" ? null : longDescription.trim()
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        setBusy(false);
        return;
      }
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  async function submitForReview() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/portal/resources/${resourceId}/submit`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Submit failed");
        setBusy(false);
        return;
      }
      router.push(postSubmitPath);
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  const inputClass = variant === "provider" ? "p-input" : "glass";
  const inputStyle = variant === "provider" ? undefined : ({ padding: 10, borderRadius: 8 } as const);

  return (
    <div style={{ display: "grid", gap: variant === "provider" ? 0 : 18 }}>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: variant === "provider" ? 16 : 0 }}>
        Lifecycle: <strong>{lifecycle.replace(/_/g, " ")}</strong>
      </p>
      {variant === "provider" ? (
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="er-title">Title</label>
          <input
            id="er-title"
            className={inputClass}
            style={inputStyle}
            value={title}
            disabled={!canEdit}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
            Title
          </span>
          <input
            className={inputClass}
            style={inputStyle}
            value={title}
            disabled={!canEdit}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      )}
      {variant === "provider" ? (
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="er-short">Short description</label>
          <textarea
            id="er-short"
            className={inputClass}
            rows={3}
            style={inputStyle}
            value={shortDescription}
            disabled={!canEdit}
            onChange={(e) => setShort(e.target.value)}
          />
        </div>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
            Short description
          </span>
          <textarea
            className={inputClass}
            rows={3}
            style={inputStyle}
            value={shortDescription}
            disabled={!canEdit}
            onChange={(e) => setShort(e.target.value)}
          />
        </label>
      )}
      {variant === "provider" ? (
        <div className="p-field" style={{ marginBottom: 14 }}>
          <label htmlFor="er-long">Long description (optional)</label>
          <textarea
            id="er-long"
            className={inputClass}
            rows={6}
            style={inputStyle}
            value={longDescription}
            disabled={!canEdit}
            onChange={(e) => setLong(e.target.value)}
          />
        </div>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
            Long description (optional)
          </span>
          <textarea
            className={inputClass}
            rows={6}
            style={inputStyle}
            value={longDescription}
            disabled={!canEdit}
            onChange={(e) => setLong(e.target.value)}
          />
        </label>
      )}
      {error ? (
        <p
          style={{ color: variant === "provider" ? "var(--danger, #c62828)" : "#f87171", fontSize: 14 }}
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {canEdit ? (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: variant === "provider" ? 8 : 0 }}
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      ) : null}
      {canSubmit ? (
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          disabled={busy}
          onClick={() => void submitForReview()}
        >
          {busy ? "Submitting…" : "Submit for review"}
        </button>
      ) : null}
      {variant === "provider" && canSubmit ? (
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8, marginBottom: 0 }}>
          Submitting opens an operator review. You can keep editing until the registry moves the record
          forward.
        </p>
      ) : null}
    </div>
  );
}
