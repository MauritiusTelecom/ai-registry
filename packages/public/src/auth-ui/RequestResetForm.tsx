"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

export function RequestResetForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await registryFetch(withBase("/api/auth/request-reset"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = (await res.json()) as { resetUrl?: string };
      if (data.resetUrl) setDevUrl(data.resetUrl);
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "var(--text-2)", fontSize: 14 }}>
          {t("resetSent")}
        </p>
        {devUrl ? (
          <div
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 12,
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 12,
              color: "var(--text-2)",
              wordBreak: "break-all"
            }}
          >
            {t("devLabel")} {devUrl}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="rr-email"
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-3)"
          }}
        >
          {t("email")}
        </label>
        <input
          id="rr-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? t("sendingResend") : t("sendResetLink")}
      </button>
    </form>
  );
}
