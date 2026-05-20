"use client";

import { withBase } from "@airegistry/sdk";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/library";
import { registryFetch } from "@airegistry/ui-kit";

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
  // Email toggle. Default ON so existing behavior is preserved; admins
  // can untick to record the decision without notifying the provider's
  // contact list.
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await registryFetch(withBase(`/api/admin/providers/${providerId}/verify`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          summary: summary.trim(),
          publicNote: publicNote.trim() || null,
          internalNote: internalNote.trim() || null,
          notifyByEmail
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

  const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    color: "var(--text-3)",
    letterSpacing: "0.08em",
    textTransform: "uppercase"
  };
  const controlBase: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 8,
    background: "var(--input-bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontFamily: "inherit",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box"
  };

  return (
    <div style={{ display: "grid", gap: 16, fontSize: 13 }}>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={fieldLabel}>New status</span>
        <select
          style={controlBase}
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
      <label style={{ display: "grid", gap: 8 }}>
        <span style={fieldLabel}>Decision summary</span>
        <textarea
          style={{ ...controlBase, minHeight: 90, resize: "vertical" }}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What changed and why? Recorded on the audit log."
        />
      </label>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={fieldLabel}>Public note (optional)</span>
        <input
          style={controlBase}
          value={publicNote}
          onChange={(e) => setPublicNote(e.target.value)}
          placeholder="Visible on the provider's public trust panel."
        />
      </label>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={fieldLabel}>Internal note (optional)</span>
        <input
          style={controlBase}
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
          placeholder="Admins only - never shown publicly."
        />
      </label>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: notifyByEmail ? "var(--text-2)" : "var(--text-3)",
          cursor: "pointer"
        }}
      >
        <input
          type="checkbox"
          checked={notifyByEmail}
          onChange={(e) => setNotifyByEmail(e.target.checked)}
          style={{ accentColor: "var(--primary)" }}
        />
        <span>Email the provider's contacts about this decision</span>
      </label>
      {error ? (
        <p style={{ color: "#d33", fontSize: 12, margin: 0 }}>{error}</p>
      ) : null}
      <Button intent="primary"
        disabled={busy || summary.trim().length < 4}
        onClick={submit}
        style={{ justifySelf: "start" }}
      >
        {busy ? "Saving…" : "Record decision"}
      </Button>
    </div>
  );
}