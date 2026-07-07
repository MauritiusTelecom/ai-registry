"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Icon, Modal, Button } from "@/components/library";
import { registryFetch } from "@airegistry/ui-kit";
import { withBase } from "@airegistry/sdk";
import { useTranslations } from "next-intl";

const iconBtnStyle = {
  padding: "4px 6px",
  minWidth: 28,
  justifyContent: "center",
  color: "var(--text)"
} as const;

/**
 * "Request withdrawal" action for a listed provider resource. Opens a modal
 * for a reason, POSTs to the provider withdrawal-request endpoint, and (on
 * success) refreshes the grid. The operator is notified and performs the
 * actual take-down - see /api/portal/resources/:id/withdrawal-request.
 */
export function WithdrawalRequestAction({
  resourceId,
  resourceTitle
}: {
  resourceId: string;
  resourceTitle: string;
}) {
  const t = useTranslations("providerResources");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await registryFetch(
        withBase(`/api/portal/resources/${resourceId}/withdrawal-request`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() })
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("withdrawalFailed"));
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setReason("");
    setError(null);
    setDone(false);
  }

  return (
    <>
      <button
        type="button"
        className="r-card-action-link"
        onClick={() => setOpen(true)}
        title={t("requestWithdrawal")}
        aria-label={t("requestWithdrawal")}
        style={iconBtnStyle}
      >
        <Icon name="log-out" size={14} />
      </button>

      <Modal open={open} onClose={close} title={t("withdrawalTitle")} maxWidth={520}>
        <div style={{ padding: 24, display: "grid", gap: 14 }}>
          {done ? (
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
              {t("withdrawalSuccess")}
            </p>
          ) : (
            <>
              <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
                {t.rich("withdrawalBody", {
                  title: resourceTitle,
                  strong: (c) => <strong>{c}</strong>
                })}
              </p>
              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text-2)" }}>
                {t("withdrawalReasonLabel")}
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder={t("withdrawalReasonPlaceholder")}
                  disabled={busy}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontFamily: "inherit",
                    fontSize: 14
                  }}
                />
              </label>
              {error ? (
                <div className="field-error" role="alert">
                  {error}
                </div>
              ) : null}
            </>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button intent="ghost" onClick={close} disabled={busy}>
              {done ? t("withdrawalClose") : t("withdrawalCancel")}
            </Button>
            {done ? null : (
              <Button onClick={submit} disabled={busy || reason.trim().length < 4}>
                {busy ? t("withdrawalSubmitting") : t("withdrawalSubmit")}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
