"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon, registryFetch } from "@airegistry/ui-kit";
import { Modal } from "./Modal";
import { useReport } from "./ReportContext";
import { withBase } from "@airegistry/sdk";

const REASON_KEYS = [
  { value: "impersonation", labelKey: "reasonImpersonation" },
  { value: "sovereignty", labelKey: "reasonSovereignty" },
  { value: "metadata", labelKey: "reasonMetadata" },
  { value: "abuse", labelKey: "reasonAbuse" },
  { value: "legal", labelKey: "reasonLegal" },
  { value: "other", labelKey: "reasonOther" }
];

type Errors = Partial<Record<"reason" | "details" | "email" | "submit", string>>;

export function ReportModal() {
  const t = useTranslations("reportModal");
  const { target, close } = useReport();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setReason("");
    setDetails("");
    setEmail("");
    setErrors({});
    setSubmitted(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    close();
    // Defer reset so the closing animation isn't interrupted by content swap.
    window.setTimeout(reset, 250);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!reason) next.reason = t("errorSelectReason");
    if (details.trim().length < 12) next.details = t("errorDetailsMin");
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = t("errorEmailRequired");
    setErrors(next);
    if (Object.keys(next).length || !target) return;

    setSubmitting(true);
    try {
      const response = await registryFetch(withBase("/api/public/report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: target.id,
          reason,
          notes: details,
          email
        })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setErrors({ submit: data.error ?? t("errorSubmitFailed") });
        return;
      }
      setSubmitted(true);
    } catch {
      setErrors({ submit: t("errorNetwork") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!target}
      onClose={handleClose}
      title={submitted ? t("received") : t("title")}
      subtitle={submitted ? null : target ? `${target.title} · ${target.provider}` : ""}
    >
      {submitted ? (
        <div>
          <div className="form-success">
            <Icon name="check" size={16} />
            <span>
              {t("receivedBody")}
            </span>
          </div>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              {t("close")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className={`field ${errors.reason ? "error" : ""}`}>
            <label>{t("reason")}</label>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="">{t("selectReason")}</option>
              {REASON_KEYS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
            {errors.reason && <span className="field-error">{errors.reason}</span>}
          </div>

          <div className={`field ${errors.details ? "error" : ""}`}>
            <label>{t("details")}</label>
            <textarea
              placeholder={t("detailsPlaceholder")}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
            {errors.details && <span className="field-error">{errors.details}</span>}
          </div>

          <div className={`field ${errors.email ? "error" : ""}`}>
            <label>{t("yourEmail")}</label>
            <input
              type="email"
              placeholder={t("placeholderEmail")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {errors.submit && (
            <div className="field-error" style={{ marginBottom: 12 }}>{errors.submit}</div>
          )}

          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              {t("cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t("sending") : t("submitReport")}
              <Icon name="arrow-right" size={13} />
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

