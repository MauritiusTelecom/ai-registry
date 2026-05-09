"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { initialName: string; initialOrganisation: string | null };

export function PortalProfileForm({ initialName, initialOrganisation }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [organisationName, setOrg] = useState(initialOrganisation ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setMessage(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          organisationName: organisationName.trim() === "" ? null : organisationName.trim()
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        setBusy(false);
        return;
      }
      setMessage("Saved.");
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px dashed var(--hairline)" }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-3)", marginBottom: 12 }}>
        Edit profile
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>Name</span>
          <input className="glass" style={{ padding: 10, borderRadius: 8 }} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>Organisation</span>
          <input
            className="glass"
            style={{ padding: 10, borderRadius: 8 }}
            value={organisationName}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="Optional"
          />
        </label>
        {message ? <p style={{ fontSize: 14, color: "var(--accent)" }}>{message}</p> : null}
        {error ? (
          <p style={{ fontSize: 14, color: "#f87171" }} role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
