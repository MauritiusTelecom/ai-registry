"use client";

import { useState } from "react";
import { Button } from "@/components/library";
import { withBase } from "@/lib/with-base";
import { AuthFormField } from "./AuthShell";

/**
 * Asks for an email address and posts to `/api/auth/resend-verification`.
 * That endpoint always returns 200 (no enumeration), so the UI always shows
 * the same "If an account exists, we've sent a fresh link" confirmation.
 */
export function ResendVerificationForm({ initialEmail = "" }: { initialEmail?: string } = {}) {
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
      const res = await fetch(withBase("/api/auth/resend-verification"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = (await res.json()) as { ok?: boolean; verifyUrl?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not send verification email. Try again.");
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
          If an account exists for <strong>{email}</strong>, a fresh verification email is on its
          way. The link expires in 24 hours.
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
        <div style={{ textAlign: "center" }}>
          <Button href="/login" intent="primary">
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AuthFormField label="Email" htmlFor="resend-email">
        <input
          id="resend-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        {busy ? "Sending…" : "Send verification email"}
      </Button>
    </form>
  );
}
