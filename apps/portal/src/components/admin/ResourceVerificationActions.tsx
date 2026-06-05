"use client";

import { withBase } from "@airegistry/sdk";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Button } from "@/components/library";
import { registryFetch } from "@airegistry/ui-kit";

/** Verify / reject controls for one pending ResourceVerification row. */
export function ResourceVerificationActions({ rowId }: { rowId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "verify" | "reject">(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function call(action: "verify" | "reject") {
    setError(null);
    setBusy(action);
    try {
      const res = await registryFetch(
        withBase(`/api/admin/resource-verifications/${rowId}/${action}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action === "reject" ? { note: note.trim() } : {})
        }
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Action failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
      {error ? (
        <span style={{ color: "#fca5a5", fontSize: 12 }}>{error}</span>
      ) : null}
      {rejecting ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason"
            style={{
              fontSize: 12,
              padding: "5px 8px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--text)"
            }}
          />
          <Button
            size="sm"
            onClick={() => call("reject")}
            disabled={busy !== null || note.trim().length === 0}
          >
            {busy === "reject" ? "…" : "Confirm"}
          </Button>
          <Button size="sm" intent="ghost" onClick={() => setRejecting(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="sm" onClick={() => call("verify")} disabled={busy !== null}>
            {busy === "verify" ? "…" : "Verify"}
          </Button>
          <Button size="sm" intent="secondary" onClick={() => setRejecting(true)}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
