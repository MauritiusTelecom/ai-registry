"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

export type ListingCriterionFormInitial = {
  code: string;
  title: string;
  description: string;
  iconName: string | null;
  sortOrder: number;
  active: boolean;
};

// Closed list of icons that look right in the criterion card (32px badge).
// Kept here rather than imported from ui-kit's IconName type so the admin UI
// doesn't surface every prototype icon — only the ones that read well at
// this size and tone.
const ALLOWED_ICONS: { value: string; label: string }[] = [
  { value: "flag", label: "flag (law / regulation)" },
  { value: "database", label: "database (data)" },
  { value: "lock", label: "lock (systems / security)" },
  { value: "globe", label: "globe (language / culture)" },
  { value: "shield", label: "shield (sovereignty)" },
  { value: "eye", label: "eye (visibility)" },
  { value: "check", label: "check (compliance)" },
  { value: "doc", label: "doc (record)" },
  { value: "cpu", label: "cpu (compute)" },
  { value: "agent", label: "agent" },
  { value: "users", label: "users (institutions)" },
  { value: "settings", label: "settings" },
  { value: "activity", label: "activity" },
  { value: "audit", label: "audit" },
  { value: "layers", label: "layers (resources)" }
];

const labelStyle: React.CSSProperties = {
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: 10.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--text-3)"
};

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--panel)",
  color: "var(--text)",
  fontSize: 14
};

export function ListingCriterionForm({
  mode,
  initial
}: {
  mode: "create" | "edit";
  initial: ListingCriterionFormInitial;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initial.code);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [iconName, setIconName] = useState(initial.iconName ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [active, setActive] = useState(initial.active);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ kind: "error"; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await registryFetch(withBase("/api/admin/site/listing-criteria"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          title: title.trim(),
          description: description.trim(),
          iconName: iconName.trim() || null,
          sortOrder: Number(sortOrder) || 0,
          active
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.push("/admin/site/listing-criteria");
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit") return;
    if (!confirm(`Delete criterion "${initial.code}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(
        withBase(`/api/admin/site/listing-criteria/${encodeURIComponent(initial.code)}`),
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.push("/admin/site/listing-criteria");
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 720, display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="lc-code" style={labelStyle}>Code</label>
        <input
          id="lc-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          disabled={mode === "edit"}
          placeholder='e.g. "local-law"'
          style={{ ...inputStyle, opacity: mode === "edit" ? 0.55 : 1 }}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="lc-title" style={labelStyle}>Title</label>
        <input
          id="lc-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={inputStyle}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="lc-desc" style={labelStyle}>Description</label>
        <textarea
          id="lc-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 18, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="lc-icon" style={labelStyle}>Icon</label>
          <select
            id="lc-icon"
            value={iconName}
            onChange={(e) => setIconName(e.target.value)}
            style={inputStyle}
          >
            <option value="">(no icon)</option>
            {ALLOWED_ICONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            Background tone (pink / purple / cyan / emerald) rotates with sort
            order, so reordering changes colours but not icons.
          </span>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="lc-sort" style={labelStyle}>Sort order</label>
          <input
            id="lc-sort"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            min={0}
            style={{ ...inputStyle, width: 110 }}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-2)", alignSelf: "end", paddingBottom: 4 }}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active
        </label>
      </div>

      {message ? (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(239, 68, 68, 0.10)", border: "1px solid rgba(239, 68, 68, 0.30)", color: "#ef4444", fontSize: 13 }}>
          {message.text}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
          {saving ? "Saving…" : mode === "create" ? "Create criterion" : "Save changes"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onDelete}
            disabled={saving || deleting}
            style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.45)" }}
          >
            {deleting ? "Deleting…" : "Delete criterion"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
