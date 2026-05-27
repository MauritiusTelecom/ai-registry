"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";
import { useTranslations } from "next-intl";

export type PromoBannerFormInitial = {
  enabled: boolean;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

const labelStyle: React.CSSProperties = {
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: 10.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--text-3)"
};

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--panel)",
  color: "var(--text)",
  fontSize: 14
};

export function PromoBannerForm({ initial }: { initial: PromoBannerFormInitial }) {
  const t = useTranslations("adminSitePromo");
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [heading, setHeading] = useState(initial.heading);
  const [body, setBody] = useState(initial.body);
  const [ctaLabel, setCtaLabel] = useState(initial.ctaLabel);
  const [ctaHref, setCtaHref] = useState(initial.ctaHref);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await registryFetch(withBase("/api/admin/site/promo"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled,
          heading: heading.trim() || null,
          body: body.trim() || null,
          ctaLabel: ctaLabel.trim() || null,
          ctaHref: ctaHref.trim() || null
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setMessage({ kind: "ok", text: t("saved") });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 720, display: "grid", gap: 18 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text)" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span style={{ fontWeight: 500 }}>{t("showBanner")}</span>
      </label>
      <span style={{ fontSize: 12, color: "var(--text-3)", marginTop: -10 }}>
        {t("showBannerHelpText")}
      </span>

      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="promo-heading" style={labelStyle}>{t("heading")}</label>
        <input
          id="promo-heading"
          type="text"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder={t("headingPlaceholder")}
          style={inputStyle}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="promo-body" style={labelStyle}>{t("body")}</label>
        <textarea
          id="promo-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder={t("bodyPlaceholder")}
          style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="promo-cta-label" style={labelStyle}>{t("ctaLabel")}</label>
          <input
            id="promo-cta-label"
            type="text"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder={t("ctaLabelPlaceholder")}
            style={inputStyle}
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="promo-cta-href" style={labelStyle}>{t("ctaUrl")}</label>
          <input
            id="promo-cta-href"
            type="text"
            value={ctaHref}
            onChange={(e) => setCtaHref(e.target.value)}
            placeholder="/contact"
            style={inputStyle}
          />
        </div>
      </div>
      <span style={{ fontSize: 12, color: "var(--text-3)", marginTop: -6 }}>
        {t("ctaHelpText")}
      </span>

      {message ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background:
              message.kind === "ok"
                ? "rgba(16, 185, 129, 0.10)"
                : "rgba(239, 68, 68, 0.10)",
            border:
              message.kind === "ok"
                ? "1px solid rgba(16, 185, 129, 0.30)"
                : "1px solid rgba(239, 68, 68, 0.30)",
            color: message.kind === "ok" ? "#10b981" : "#ef4444",
            fontSize: 13
          }}
        >
          {message.text}
        </div>
      ) : null}

      <div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? t("saving") : t("savePromoBanner")}
        </button>
      </div>
    </form>
  );
}
