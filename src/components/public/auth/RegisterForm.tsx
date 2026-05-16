"use client";

import { useState } from "react";
import { Button } from "@/components/library";
import { withBase } from "@/lib/with-base";
import { AuthFormField } from "./AuthShell";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDevVerifyUrl(null);
    try {
      const res = await fetch(withBase("/api/auth/register"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, organisationName, email, password })
      });
      const data = (await res.json()) as {
        error?: string;
        verifyUrl?: string;
        redirectTo?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }
      if (data.verifyUrl) setDevVerifyUrl(data.verifyUrl);
      // No session is issued at registration. Show a "check your email"
      // confirmation; the user must verify before they can sign in.
      setSubmittedEmail(email);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (submittedEmail) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ color: "var(--text-2)", lineHeight: 1.5 }}>
          We sent a verification link to <strong>{submittedEmail}</strong>. Open it within 24
          hours to activate your account, then sign in to access the provider portal.
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
            Dev: open this verification link → {devVerifyUrl}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button href="/login?registered=1" intent="primary">
            Go to sign in
          </Button>
          <Button href="/auth/verify" intent="ghost">
            Resend verification email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AuthFormField label="Full name" htmlFor="reg-name">
        <input
          id="reg-name"
          type="text"
          required
          minLength={2}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="auth-input"
        />
      </AuthFormField>
      <AuthFormField label="Organisation (optional)" htmlFor="reg-org">
        <input
          id="reg-org"
          type="text"
          autoComplete="organization"
          value={organisationName}
          onChange={(e) => setOrganisationName(e.target.value)}
          className="auth-input"
        />
      </AuthFormField>
      <AuthFormField label="Email" htmlFor="reg-email">
        <input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </AuthFormField>
      <AuthFormField label="Password (min 8 chars)" htmlFor="reg-password">
        <input
          id="reg-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
      <Button
        type="submit"
        intent="primary"
        disabled={busy}
        style={{ marginTop: 6 }}
      >
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
