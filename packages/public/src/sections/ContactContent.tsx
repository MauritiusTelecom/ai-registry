"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Icon, PageHero, registryFetch } from "@airegistry/ui-kit";
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

const TOPICS = [
  { value: "general", label: "General enquiry" },
  { value: "submit", label: "Submit a resource" },
  { value: "review", label: "Request a review" },
  { value: "report", label: "Report an issue" },
  { value: "jurisdiction", label: "Standing up a registry" },
  { value: "press", label: "Press / media" }
];

type Errors = Partial<Record<"name" | "org" | "email" | "message" | "submit", string>>;

const EMPTY_FORM: Form = { name: "", org: "", email: "", topic: "general", message: "" };

export function ContactContent() {
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
    if (form.name.trim().length < 2) next.name = "Name required";
    if (form.org.trim().length < 2) next.org = "Organisation required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Valid email required";
    if (form.message.trim().length < 16) next.message = "Tell us a bit more (≥16 chars)";
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
        setErrors({ submit: payload.error ?? "Could not send your message. Please retry." });
        return;
      }
      setSent(true);
    } catch {
      setErrors({ submit: "Network error. Please retry." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHero
        crumb={`Contact · Talk to ${operatorName}`}
        title={
          <>
            Get in <span className="gradient-text">touch</span>.
          </>
        }
        subtitle={`Submit a resource, request review, report an issue, or talk to the ${operatorName} team about standing up a registry in your jurisdiction.`}
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
                  <div className="contact-info-label">Email</div>
                  <div className="contact-info-value">{operatorContactEmail}</div>
                </div>
              </div>
              <div className="contact-info-row">
                <div className="contact-info-icon">
                  <Icon name="pin" size={16} />
                </div>
                <div>
                  <div className="contact-info-label">Office</div>
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
                <div className="contact-info-label">Hours</div>
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
                    <span>
                      Message received. We respond within 2 working days. Check your inbox for a
                      confirmation email and click the link there to verify your address - then, if
                      you register with the same email, your verified messages appear in your portal.
                    </span>
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
                    Send another
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <div className="field-row">
                    <div className={`field ${errors.name ? "error" : ""}`}>
                      <label>Full name</label>
                      <input value={form.name} onChange={set("name")} placeholder="Jane Doe" />
                      {errors.name && <span className="field-error">{errors.name}</span>}
                    </div>
                    <div className={`field ${errors.org ? "error" : ""}`}>
                      <label>Organisation</label>
                      <input value={form.org} onChange={set("org")} placeholder="Ministry of …" />
                      {errors.org && <span className="field-error">{errors.org}</span>}
                    </div>
                  </div>

                  <div className={`field ${errors.email ? "error" : ""}`}>
                    <label>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="you@org.mu"
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>

                  <div className="field">
                    <label>Topic</label>
                    <select value={form.topic} onChange={set("topic")}>
                      {TOPICS.map((topic) => (
                        <option key={topic.value} value={topic.value}>
                          {topic.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={`field ${errors.message ? "error" : ""}`}>
                    <label>Message</label>
                    <textarea
                      value={form.message}
                      onChange={set("message")}
                      placeholder="Tell us what you need…"
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
                      We reply within 2 working days.
                    </span>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? "Sending…" : "Send message"} <Icon name="arrow-right" size={13} />
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

