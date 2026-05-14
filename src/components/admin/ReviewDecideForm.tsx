"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SOVEREIGNTY_CHECKLIST_ITEMS, type ChecklistAnswerCode } from "@/lib/governance/sovereignty-checklist";
import { withBase } from "@/lib/with-base";

type Props = {
  reviewId: string;
  resourceTitle: string;
};

export function ReviewDecideForm({ reviewId, resourceTitle }: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approve" | "reject" | "request_changes">("request_changes");
  const [summary, setSummary] = useState("");
  const [checklist, setChecklist] = useState<Record<string, ChecklistAnswerCode>>(() => {
    const init: Record<string, ChecklistAnswerCode> = {};
    for (const item of SOVEREIGNTY_CHECKLIST_ITEMS) init[item.itemCode] = "yes";
    return init;
  });
  // Email toggle. Default ON so existing behavior is preserved; admins can
  // untick to record the decision without notifying the provider.
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const body: {
        decision: string;
        decisionSummary: string;
        checklist?: Record<string, ChecklistAnswerCode>;
        notifyByEmail: boolean;
      } = {
        decision,
        decisionSummary: summary.trim(),
        notifyByEmail
      };
      if (decision === "approve") body.checklist = checklist;

      const res = await fetch(withBase(`/api/admin/reviews/${reviewId}/decide`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        setBusy(false);
        return;
      }
      router.push("/admin/reviews");
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <p style={{ fontSize: 14, color: "var(--text-2)" }}>
        Resource: <strong>{resourceTitle}</strong>
      </p>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          Decision
        </span>
        <select
          className="glass"
          style={{ padding: 10, borderRadius: 8 }}
          value={decision}
          onChange={(e) => setDecision(e.target.value as typeof decision)}
        >
          <option value="approve">Approve (list publicly)</option>
          <option value="reject">Reject → needs update</option>
          <option value="request_changes">Request changes → needs update</option>
        </select>
      </label>

      {decision === "approve" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>§11 checklist</div>
          {SOVEREIGNTY_CHECKLIST_ITEMS.map((item) => (
            <label key={item.itemCode} style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>{item.question}</span>
              <select
                className="glass"
                style={{ padding: 8, borderRadius: 8, maxWidth: 200 }}
                value={checklist[item.itemCode]}
                onChange={(e) =>
                  setChecklist((c) => ({
                    ...c,
                    [item.itemCode]: e.target.value as ChecklistAnswerCode
                  }))
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="n_a">N/A</option>
              </select>
            </label>
          ))}
        </div>
      ) : null}

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          Summary (required)
        </span>
        <textarea
          className="glass"
          rows={4}
          style={{ padding: 12, borderRadius: 8 }}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Decision rationale for the audit trail"
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
        <p style={{ color: "#f87171", fontSize: 14 }} role="alert">
          {error}
        </p>
      ) : null}

      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
        {busy ? "Saving…" : "Submit decision"}
      </button>
    </div>
  );
}
