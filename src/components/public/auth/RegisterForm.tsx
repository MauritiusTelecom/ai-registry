"use client";

import { useState } from "react";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDevVerifyUrl(null);
    try {
      const res = await fetch("/api/auth/register", {
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
      // Server picks the role-appropriate landing — provider self-registration
      // lands on /provider, admin-seeded accounts will land elsewhere when
      // self-registration is enabled for them. Fallback to /portal.
      window.location.assign(data.redirectTo ?? "/portal");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FormField label="Full name" htmlFor="reg-name">
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
      </FormField>
      <FormField label="Organisation (optional)" htmlFor="reg-org">
        <input
          id="reg-org"
          type="text"
          autoComplete="organization"
          value={organisationName}
          onChange={(e) => setOrganisationName(e.target.value)}
          className="auth-input"
        />
      </FormField>
      <FormField label="Email" htmlFor="reg-email">
        <input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </FormField>
      <FormField label="Password (min 8 chars)" htmlFor="reg-password">
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
      </FormField>
      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : null}
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
      <button
        type="submit"
        className="btn btn-primary"
        disabled={busy}
        style={{ marginTop: 6 }}
      >
        {busy ? "Creating account…" : "Create account"}
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
