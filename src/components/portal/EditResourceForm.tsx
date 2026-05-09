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
};

export function EditResourceForm({
  resourceId,
  initialTitle,
  initialShort,
  initialLong,
  lifecycle,
  canEdit,
  canSubmit
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
      router.push("/portal/resources");
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <p style={{ fontSize: 13, color: "var(--text-2)" }}>
        Lifecycle: <strong>{lifecycle}</strong>
      </p>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          Title
        </span>
        <input
          className="glass"
          style={{ padding: 10, borderRadius: 8 }}
          value={title}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          Short description
        </span>
        <textarea
          className="glass"
          rows={3}
          style={{ padding: 10, borderRadius: 8 }}
          value={shortDescription}
          disabled={!canEdit}
          onChange={(e) => setShort(e.target.value)}
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          Long description (optional)
        </span>
        <textarea
          className="glass"
          rows={6}
          style={{ padding: 10, borderRadius: 8 }}
          value={longDescription}
          disabled={!canEdit}
          onChange={(e) => setLong(e.target.value)}
        />
      </label>
      {error ? (
        <p style={{ color: "#f87171", fontSize: 14 }} role="alert">
          {error}
        </p>
      ) : null}
      {canEdit ? (
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      ) : null}
      {canSubmit ? (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void submitForReview()}>
          {busy ? "Submitting…" : "Submit for review"}
        </button>
      ) : null}
    </div>
  );
}
