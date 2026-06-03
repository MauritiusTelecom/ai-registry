"use client";

import { withBase } from "@airegistry/sdk";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Button, Field, TextArea } from "@/components/library";
import { registryFetch } from "@airegistry/ui-kit";

type Delta = { field: string; was: string | null; now: string | null };

type Props = {
  resourceId: string;
  versionId: string;
  diff: Delta[];
};

const FIELD_LABEL: Record<string, string> = {
  title: "Title",
  shortDescription: "Short description",
  longDescription: "Long description",
  accessUrl: "Access URL",
  sourceCodeUrl: "Source code URL",
  documentationUrl: "Documentation URL",
  termsUrl: "Terms URL",
  license: "License",
  versionLabel: "Version label",
  providerVersionNumber: "Version number",
  latencyTier: "Latency tier",
  riskLevelId: "Risk level"
};

export function AdminResourceEditDecision({ resourceId, versionId, diff }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    setError(null);
    setBusy(action);
    try {
      const res = await registryFetch(
        withBase(`/api/admin/resources/${resourceId}/versions/${versionId}/decide`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, note: note.trim() || undefined })
        }
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Decision failed.");
        return;
      }
      router.push("/admin/resource-edits");
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <table style={{ width: "100%", fontSize: 13.5, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-3)", fontSize: 12 }}>
            <th style={{ padding: "8px 10px", width: "20%" }}>Field</th>
            <th style={{ padding: "8px 10px" }}>Live</th>
            <th style={{ padding: "8px 10px" }}>Proposed</th>
          </tr>
        </thead>
        <tbody>
          {diff.map((d) => (
            <tr key={d.field} style={{ borderTop: "1px solid var(--border)", verticalAlign: "top" }}>
              <td style={{ padding: "10px", color: "var(--text-2)", fontWeight: 500 }}>
                {FIELD_LABEL[d.field] ?? d.field}
              </td>
              <td
                style={{
                  padding: "10px",
                  color: "var(--text-3)",
                  textDecoration: "line-through",
                  whiteSpace: "pre-wrap"
                }}
              >
                {d.was ?? "—"}
              </td>
              <td style={{ padding: "10px", color: "#34d399", whiteSpace: "pre-wrap" }}>
                {d.now ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Field label="Decision note (optional)">
        <TextArea
          value={note}
          rows={3}
          placeholder="Reason for the decision — shared with the provider."
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {error ? (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.08)",
            color: "#fca5a5",
            fontSize: 13
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10 }}>
        <Button onClick={() => decide("approve")} disabled={busy !== null}>
          {busy === "approve" ? "Approving…" : "Approve & publish"}
        </Button>
        <Button intent="secondary" onClick={() => decide("reject")} disabled={busy !== null}>
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </Button>
      </div>
    </div>
  );
}
