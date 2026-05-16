"use client";

import { useState } from "react";
import { Button } from "@/components/library";
import { withBase } from "@/lib/with-base";
import { AuthFormField } from "./AuthShell";

/**
 * `redirect` carries the URL the user should land on if they were deep-linked
 * to /login (via `?next=…`). When the page didn't supply one, we let the
 * server pick - the login API returns `redirectTo` based on the user's role,
 * so a provider lands on `/provider`, an admin on `/admin`, etc. (`null`
 * means "no explicit deep-link; defer to the server").
 */
export function LoginForm({ redirect }: { redirect: string | null }) {
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
      const res = await fetch(withBase("/api/auth/login"), {
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
          setNeedsVerification(data.email ?? email);
          return;
        }
        setError(data.error ?? "Login failed.");
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
      await fetch(withBase("/api/auth/resend-verification"), {
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
      <AuthFormField label="Email" htmlFor="login-email">
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </AuthFormField>
      <AuthFormField label="Password" htmlFor="login-password">
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
      </AuthFormField>
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
            Please verify your email (<strong>{needsVerification}</strong>) before signing in.
          </span>
          {resent ? (
            <span style={{ color: "var(--text-2)" }}>
              Verification email re-sent. Check your inbox (and spam folder).
            </span>
          ) : (
            <Button
              intent="ghost"
              size="sm"
              onClick={onResend}
              disabled={resendBusy}
              style={{ alignSelf: "flex-start" }}
            >
              {resendBusy ? "Sending…" : "Resend verification email"}
            </Button>
          )}
        </div>
      ) : null}
      <Button
        type="submit"
        intent="primary"
        disabled={busy}
        style={{ marginTop: 6 }}
      >
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
// safe padding li
