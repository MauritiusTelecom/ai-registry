"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (password !== confirm) {
      setError(t("passwordsNoMatch"));
      setBusy(false);
      return;
    }
    try {
      const res = await registryFetch(withBase("/api/auth/reset-password"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("resetFailed"));
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "var(--text-2)", fontSize: 14 }}>
          {t("passwordUpdated")}
        </p>
        <a href="/login" className="btn btn-primary">
          {t("signIn")}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FormField label={t("newPassword")} htmlFor="rp-pw">
        <input
          id="rp-pw"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
      </FormField>
      <FormField label={t("confirmNewPassword")} htmlFor="rp-pw2">
        <input
          id="rp-pw2"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="auth-input"
        />
      </FormField>
      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? t("updatingPassword") : t("setNewPassword")}
      </button>
    </form>
  );
}

function FormField({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text-3)"
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
