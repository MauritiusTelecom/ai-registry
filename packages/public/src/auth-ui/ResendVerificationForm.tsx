"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

export function ResendVerificationForm({ initialEmail = "" }: { initialEmail?: string } = {}) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDevVerifyUrl(null);
    try {
      const res = await registryFetch(withBase("/api/auth/resend-verification"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = (await res.json()) as { ok?: boolean; verifyUrl?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? t("couldNotSendVerification"));
        return;
      }
      if (data.verifyUrl) setDevVerifyUrl(data.verifyUrl);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ color: "var(--text-2)", lineHeight: 1.5 }}>
          {t.rich("verificationSentConfirm", {
            email,
            strong: (chunks) => <strong>{chunks}</strong>
          })}
        </p>
        {devVerifyUrl ? (
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
            {t("devVerifyLink")} {devVerifyUrl}
          </div>
        ) : null}
        <div style={{ textAlign: "center" }}>
          <Link href="/login" className="btn btn-primary">
            {t("backToSignIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="resend-email"
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
          id="resend-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </div>
      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={busy}
        style={{ marginTop: 6 }}
      >
        {busy ? t("sendingResend") : t("sendVerificationEmail")}
      </button>
    </form>
  );
}
