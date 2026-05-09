"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { useReport } from "./ReportContext";

const REASONS = [
  { value: "impersonation", label: "Provider impersonation" },
  { value: "sovereignty", label: "Fails the sovereignty test" },
  { value: "metadata", label: "Inaccurate metadata" },
  { value: "abuse", label: "Resource is harmful or abusive" },
  { value: "legal", label: "Legal or licensing concern" },
  { value: "other", label: "Other" }
];

type Errors = Partial<Record<"reason" | "details" | "email" | "submit", string>>;

export function ReportModal() {
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
    if (!reason) next.reason = "Select a reason";
    if (details.trim().length < 12) next.details = "Add at least 12 characters of context";
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Valid email required";
    setErrors(next);
    if (Object.keys(next).length || !target) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/public/report", {
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
        setErrors({ submit: data.error ?? "Could not submit your report. Please retry." });
        return;
      }
      setSubmitted(true);
    } catch {
      setErrors({ submit: "Network error. Please retry." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!target}
      onClose={handleClose}
      title={submitted ? "Report received" : "Report this resource"}
      subtitle={submitted ? null : target ? `${target.title} · ${target.provider}` : ""}
    >
      {submitted ? (
        <div>
          <div className="form-success">
            <Icon name="check" size={16} />
            <span>
              Thanks. The review board will examine this report and respond within 5 working days.
            </span>
          </div>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className={`field ${errors.reason ? "error" : ""}`}>
            <label>Reason</label>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="">Select a reason…</option>
              {REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.reason && <span className="field-error">{errors.reason}</span>}
          </div>

          <div className={`field ${errors.details ? "error" : ""}`}>
            <label>Details</label>
            <textarea
              placeholder="What's wrong, and how do you know? Links to evidence are welcome."
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
            {errors.details && <span className="field-error">{errors.details}</span>}
          </div>

          <div className={`field ${errors.email ? "error" : ""}`}>
            <label>Your email</label>
            <input
              type="email"
              placeholder="you@org.example"
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
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Sending…" : "Submit report"}
              <Icon name="arrow-right" size={13} />
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
