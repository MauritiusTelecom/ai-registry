"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "verified", label: "Verified" },
  { value: "official_provider", label: "Official provider" },
  { value: "unverified", label: "Unverified (revert)" },
  { value: "suspended", label: "Suspended" }
];

export function ProviderVerifyForm({
  providerId,
  currentStatus
}: {
  providerId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(
    currentStatus === "unverified" ? "verified" : currentStatus
  );
  const [summary, setSummary] = useState("");
  const [publicNote, setPublicNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          summary: summary.trim(),
          publicNote: publicNote.trim() || null,
          internalNote: internalNote.trim() || null
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        setBusy(false);
        return;
      }
      router.refresh();
      setSummary("");
      setPublicNote("");
      setInternalNote("");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14, fontSize: 13 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em" }}>
          NEW STATUS
        </span>
        <select
          className="glass"
          style={{ padding: 8, borderRadius: 8 }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em" }}>
          DECISION SUMMARY
        </span>
        <textarea
          className="glass"
          style={{ padding: 10, borderRadius: 8, minHeight: 70, fontFamily: "inherit" }}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What changed and why? Recorded on the audit log."
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em" }}>
          PUBLIC NOTE (optional)
        </span>
        <input
          className="glass"
          style={{ padding: 8, borderRadius: 8 }}
          value={publicNote}
          onChange={(e) => setPublicNote(e.target.value)}
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em" }}>
          INTERNAL NOTE (optional)
        </span>
        <input
          className="glass"
          style={{ padding: 8, borderRadius: 8 }}
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
        />
      </label>
      {error ? (
        <p style={{ color: "#d33", fontSize: 12 }}>{error}</p>
      ) : null}
      <button
        type="button"
        className="btn-primary"
        disabled={busy || summary.trim().length < 4}
        onClick={submit}
        style={{ alignSelf: "start" }}
      >
        {busy ? "Saving…" : "Record decision"}
      </button>
    </div>
  );
}
