"use client";

import { useState } from "react";
import { Button } from "@/components/library";
import { withBase } from "@/lib/with-base";
import { AuthFormField } from "./AuthShell";

export function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(withBase("/api/auth/request-reset"), {
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
          If an account exists for that email, a reset link is on its way. Check your inbox.
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
            Dev: {devUrl}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AuthFormField label="Email" htmlFor="rr-email">
        <input
          id="rr-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </AuthFormField>
      <Button type="submit" intent="primary" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
