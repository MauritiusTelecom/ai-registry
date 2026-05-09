"use client";

import { useState } from "react";

/**
 * `redirect` carries the URL the user should land on if they were deep-linked
 * to /login (via `?next=…`). When the page didn't supply one, we let the
 * server pick — the login API returns `redirectTo` based on the user's role,
 * so a provider lands on `/provider`, an admin on `/admin`, etc. (`null`
 * means "no explicit deep-link; defer to the server").
 */
export function LoginForm({ redirect }: { redirect: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = (await res.json()) as { error?: string; redirectTo?: string };
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      // Priority: an explicit `?next=…` (deep-link) wins; otherwise the
      // server's role-based `redirectTo`; otherwise the generic /portal.
      const target = redirect ?? data.redirectTo ?? "/portal";
      // Hard redirect so the server reads the new cookie.
      window.location.assign(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FormField label="Email" htmlFor="login-email">
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
      <FormField label="Password" htmlFor="login-password">
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
      <button
        type="submit"
        className="btn btn-primary"
        disabled={busy}
        style={{ marginTop: 6 }}
      >
        {busy ? "Signing in…" : "Sign in"}
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
