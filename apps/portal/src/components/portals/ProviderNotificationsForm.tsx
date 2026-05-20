"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

type Props = {
  initial: {
    incidentChannel: string | null;
    oncallEmail: string | null;
    webhookUrl: string | null;
  };
};

/**
 * Notifications card form on /provider/settings.
 *
 * Source of truth: modules/provider/settings/product.md §Notifications card.
 * PATCHes /api/portal/provider/notifications. All three fields are optional;
 * leaving a field blank clears it.
 */
export function ProviderNotificationsForm({ initial }: Props) {
  const router = useRouter();
  const [incidentChannel, setIncidentChannel] = useState(initial.incidentChannel ?? "");
  const [oncallEmail, setOncallEmail] = useState(initial.oncallEmail ?? "");
  const [webhookUrl, setWebhookUrl] = useState(initial.webhookUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const res = await registryFetch(withBase("/api/portal/provider/notifications"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentChannel: incidentChannel.trim(),
          oncallEmail: oncallEmail.trim(),
          webhookUrl: webhookUrl.trim()
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        setBusy(false);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14, fontSize: 13 }}>
      <Field
        label="Incident channel"
        hint="Slack / Teams / Matrix handle for high-severity pages."
      >
        <input
          className="auth-input"
          value={incidentChannel}
          onChange={(e) => setIncidentChannel(e.target.value)}
          placeholder="#edu-air-ops (Slack)"
        />
      </Field>
      <Field label="On-call email" hint="Fallback for incident + renewal reminders.">
        <input
          className="auth-input"
          type="email"
          value={oncallEmail}
          onChange={(e) => setOncallEmail(e.target.value)}
          placeholder="oncall@example.org"
        />
      </Field>
      <Field label="Webhook (optional)" hint="Outbound POST for incident lifecycle events.">
        <input
          className="auth-input"
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://example.org/hooks/airegistry"
        />
      </Field>
      {error ? <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{error}</p> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={save}
          disabled={busy}
          style={{ alignSelf: "start" }}
        >
          {busy ? "Saving…" : "Save notifications"}
        </button>
        {savedAt ? (
          <span
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              fontFamily: "IBM Plex Mono, monospace"
            }}
          >
            saved {savedAt}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em" }}>
        {label.toUpperCase()}
      </span>
      {children}
      <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{hint}</span>
    </label>
  );
}
