"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Icon, PageHero, registryFetch } from "@airegistry/ui-kit";
import { useTranslations } from "next-intl";
import { Reveal } from "../shell/Reveal";
import { withBase } from "@airegistry/sdk";
import { usePublicBranding } from "../lib/branding-context";

type Form = {
  name: string;
  org: string;
  email: string;
  topic: string;
  message: string;
};

type Errors = Partial<Record<"name" | "org" | "email" | "message" | "submit", string>>;

const EMPTY_FORM: Form = { name: "", org: "", email: "", topic: "general", message: "" };

export function ContactContent() {
  const t = useTranslations("contact");
  const {
    operatorName,
    operatorContactEmail,
    operatorOfficeName,
    operatorOfficeAddress,
    operatorContactHours
  } = usePublicBranding();
  const officeLines = operatorOfficeAddress
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const TOPICS = [
    { value: "general", label: t("topicGeneral") },
    { value: "submit", label: t("topicSubmit") },
    { value: "review", label: t("topicReview") },
    { value: "report", label: t("topicReport") },
    { value: "jurisdiction", label: t("topicJurisdiction") },
    { value: "press", label: t("topicPress") }
  ];

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const set =
    (key: keyof Form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = t("errorNameRequired");
    if (form.org.trim().length < 2) next.org = t("errorOrgRequired");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = t("errorEmailRequired");
    if (form.message.trim().length < 16) next.message = t("errorMessageMin");
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const response = await registryFetch(withBase("/api/public/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          org: form.org,
          email: form.email,
          topic: form.topic,
          message: form.message
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        ticketId?: string;
        acknowledgedAt?: string;
      };
      if (!response.ok) {
        setErrors({ submit: payload.error ?? t("failed") });
        return;
      }
      setSent(true);
    } catch {
      setErrors({ submit: t("networkError") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHero
        crumb={t("crumb", { operatorName })}
        title={
          <>
            {t.rich("title", {
              accent: (chunks) => <span className="gradient-text">{chunks}</span>
            })}
          </>
        }
        subtitle={t("heroSubtitle", { operatorName })}
      />
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="contact-grid">
          <Reveal>
            <div className="contact-info-block">
              <div className="contact-info-row">
                <div className="contact-info-icon">
                  <Icon name="mail" size={16} />
                </div>
                <div>
                  <div className="contact-info-label">{t("email")}</div>
                  <div className="contact-info-value">{operatorContactEmail}</div>
                </div>
              </div>
              <div className="contact-info-row">
                <div className="contact-info-icon">
                  <Icon name="pin" size={16} />
                </div>
                <div>
                  <div className="contact-info-label">{t("office")}</div>
                  <div className="contact-info-value">
                    {operatorOfficeName}
                    {officeLines.length > 0
                      ? officeLines.map((line) => (
                          <span key={line}>
                            <br />
                            {line}
                          </span>
                        ))
                      : null}
                  </div>
                </div>
              </div>
              <div style={{ paddingTop: 8, borderTop: "1px dashed var(--border)" }}>
                <div className="contact-info-label">{t("hours")}</div>
                <div style={{ fontSize: 13.5, color: "var(--text-2)", marginTop: 6 }}>
                  {operatorContactHours}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="contact-form-block">
              {sent ? (
                <div>
                  <div className="form-success">
                    <Icon name="check" size={16} />
                    <span>{t("sentMessage")}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: 18 }}
                    onClick={() => {
                      setSent(false);
                      setForm(EMPTY_FORM);
                      setErrors({});
                    }}
                  >
                    {t("sendAnother")}
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <div className="field-row">
                    <div className={`field ${errors.name ? "error" : ""}`}>
                      <label>{t("fullName")}</label>
                      <input value={form.name} onChange={set("name")} placeholder={t("placeholderName")} />
                      {errors.name && <span className="field-error">{errors.name}</span>}
                    </div>
                    <div className={`field ${errors.org ? "error" : ""}`}>
                      <label>{t("organisation")}</label>
                      <input value={form.org} onChange={set("org")} placeholder={t("placeholderOrg")} />
                      {errors.org && <span className="field-error">{errors.org}</span>}
                    </div>
                  </div>

                  <div className={`field ${errors.email ? "error" : ""}`}>
                    <label>{t("email")}</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder={t("placeholderEmail")}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>

                  <div className="field">
                    <label>{t("topic")}</label>
                    <select value={form.topic} onChange={set("topic")}>
                      {TOPICS.map((topic) => (
                        <option key={topic.value} value={topic.value}>
                          {topic.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={`field ${errors.message ? "error" : ""}`}>
                    <label>{t("message")}</label>
                    <textarea
                      value={form.message}
                      onChange={set("message")}
                      placeholder={t("messagePlaceholder")}
                    />
                    {errors.message && <span className="field-error">{errors.message}</span>}
                  </div>

                  {errors.submit && (
                    <div className="field-error" style={{ marginBottom: 12 }}>{errors.submit}</div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                      alignItems: "center",
                      marginTop: 8
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "IBM Plex Mono, monospace",
                        fontSize: 11,
                        color: "var(--text-3)",
                        marginRight: "auto"
                      }}
                    >
                      {t("replyTime")}
                    </span>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? t("sending") : t("send")} <Icon name="arrow-right" size={13} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
