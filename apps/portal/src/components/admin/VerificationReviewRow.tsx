"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registryFetch } from "@airegistry/ui-kit";

type Props = { verificationId: string };

export function VerificationReviewRow({ verificationId }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"verify" | "reject" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function verify() {
    setBusy("verify");
    setErr(null);
    try {
      const res = await registryFetch(`/api/admin/verifications/${verificationId}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined })
      });
      if (!res.ok) {
        setErr((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (note.trim().length === 0) {
      setErr("A reason is required when rejecting.");
      return;
    }
    if (!confirm("Reject this requirement? The provider will see your reason on their settings page.")) {
      return;
    }
    setBusy("reject");
    setErr(null);
    try {
      const res = await registryFetch(`/api/admin/verifications/${verificationId}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: note.trim() })
      });
      if (!res.ok) {
        setErr((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 12 }}>
      <label style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginBottom: 6 }}>
        Note (optional for verify, required for reject)
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="e.g. Matches the uploaded company-registration certificate."
        style={{
          width: "100%",
          padding: 8,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--hairline)",
          borderRadius: 6,
          color: "inherit",
          fontFamily: "inherit",
          fontSize: 13,
          resize: "vertical"
        }}
      />
      {err && <div style={{ fontSize: 12, color: "#ff8a95", marginTop: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
        <button
          onClick={reject}
          disabled={busy != null}
          className="btn"
          style={{ background: "rgba(220, 38, 38, 0.15)", borderColor: "rgba(220, 38, 38, 0.4)" }}
        >
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
        <button
          onClick={verify}
          disabled={busy != null}
          className="btn btn-primary"
          style={{ background: "rgba(22, 163, 74, 0.85)", borderColor: "rgba(22, 163, 74, 1)" }}
        >
          {busy === "verify" ? "Verifying…" : "✓ Verify"}
        </button>
      </div>
    </div>
  );
}
