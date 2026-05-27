"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SOVEREIGNTY_CHECKLIST_ITEMS, type ChecklistAnswerCode, withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";
import { Button } from "@/components/library";
import { useTranslations } from "next-intl";

type Props = {
  reviewId: string;
  resourceTitle: string;
};

export function ReviewDecideForm({ reviewId, resourceTitle }: Props) {
  const t = useTranslations("adminReviewDecide");
  const router = useRouter();
  const [decision, setDecision] = useState<"approve" | "reject" | "request_changes">("request_changes");
  const [summary, setSummary] = useState("");
  const [checklist, setChecklist] = useState<Record<string, ChecklistAnswerCode>>(() => {
    const init: Record<string, ChecklistAnswerCode> = {};
    for (const item of SOVEREIGNTY_CHECKLIST_ITEMS) init[item.itemCode] = "yes";
    return init;
  });
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

      const res = await registryFetch(withBase(`/api/admin/reviews/${reviewId}/decide`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("requestFailed"));
        setBusy(false);
        return;
      }
      router.push("/admin/reviews");
      router.refresh();
    } catch {
      setError(t("networkError"));
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <p style={{ fontSize: 14, color: "var(--text-2)" }}>
        {t("resourceLabel")} <strong>{resourceTitle}</strong>
      </p>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          {t("decisionLabel")}
        </span>
        <select
          className="glass"
          style={{ padding: 10, borderRadius: 8 }}
          value={decision}
          onChange={(e) => setDecision(e.target.value as typeof decision)}
        >
          <option value="approve">{t("optionApprove")}</option>
          <option value="reject">{t("optionReject")}</option>
          <option value="request_changes">{t("optionRequestChanges")}</option>
        </select>
      </label>

      {decision === "approve" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t("checklistTitle")}</div>
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
                <option value="yes">{t("checklistYes")}</option>
                <option value="no">{t("checklistNo")}</option>
                <option value="n_a">{t("checklistNA")}</option>
              </select>
            </label>
          ))}
        </div>
      ) : null}

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
          {t("summaryLabel")}
        </span>
        <textarea
          className="glass"
          rows={4}
          style={{ padding: 12, borderRadius: 8 }}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={t("summaryPlaceholder")}
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
        <span>{t("emailProviderDecision")}</span>
      </label>

      {error ? (
        <p style={{ color: "#f87171", fontSize: 14 }} role="alert">
          {error}
        </p>
      ) : null}

<Button intent="primary" disabled={busy} onClick={() => void submit()}>
        {busy ? "Saving…" : "Submit decision"}
      </Button>
    </div>
  );
}