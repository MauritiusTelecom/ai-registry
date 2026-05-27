"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

/**
 * `redirect` carries the URL the user should land on if they were deep-linked
 * to /login (via `?next=…`). When the page didn't supply one, we let the
 * server pick - the login API returns `redirectTo` based on the user's role,
 * so a provider lands on `/provider`, an admin on `/admin`, etc. (`null`
 * means "no explicit deep-link; defer to the server").
 */
export function LoginForm({ redirect }: { redirect: string | null }) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNeedsVerification(null);
    setResent(false);
    try {
      const res = await registryFetch(withBase("/api/auth/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        email?: string;
        redirectTo?: string;
      };
      if (!res.ok) {
        if (data.code === "email_not_verified") {
          setNeedsVerification(email);
          return;
        }
        setError(data.error ?? t("loginFailed"));
        return;
      }
      // Priority: an explicit `?next=…` (deep-link) wins; otherwise the
      // server's role-based `redirectTo`; otherwise the generic /portal.
      const target = redirect ?? data.redirectTo ?? "/portal";
      // Hard redirect so the server reads the new cookie.
      window.location.assign(withBase(target));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!needsVerification) return;
    setResendBusy(true);
    try {
      await registryFetch(withBase("/api/auth/resend-verification"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: needsVerification })
      });
      setResent(true);
    } catch {
      // The endpoint always returns 200, so a thrown error here is a
      // transport issue - surface it generically.
      setResent(true);
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FormField label={t("email")} htmlFor="login-email">
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </FormField>
      <FormField label={t("password")} htmlFor="login-password">
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
      </FormField>
      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : null}
      {needsVerification ? (
        <div
          role="alert"
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "rgba(var(--primary-rgb), 0.08)",
            color: "var(--text)",
            fontSize: 13,
            lineHeight: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}
        >
          <span>
            {t.rich("verifyEmail", {
              strong: (chunks) => <strong>{chunks}</strong>,
              email: needsVerification
            })}
          </span>
          {resent ? (
            <span style={{ color: "var(--text-2)" }}>
              {t("verificationResent")}
            </span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={resendBusy}
              className="btn"
              style={{ alignSelf: "flex-start" }}
            >
              {resendBusy ? t("sendingResend") : t("resendVerification")}
            </button>
          )}
        </div>
      ) : null}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={busy}
        style={{ marginTop: 6 }}
      >
        {busy ? t("signingIn") : t("signIn")}
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

