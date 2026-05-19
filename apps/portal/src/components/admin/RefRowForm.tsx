"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RefTableConfig } from "@/lib/admin/reference-tables";
import { withBase } from "@airegistry/sdk";

/**
 * Form used by both /new and /[id]/edit routes. Fields are rendered from
 * `config.fields`; the initial values come from a server-fetched row in
 * edit mode or `config.fields[*].default` in create mode.
 */

type FormValues = Record<string, string | number | boolean | null>;

export function RefRowForm({
  config,
  mode,
  initial
}: {
  config: RefTableConfig;
  mode: "create" | "update";
  initial?: FormValues & { id?: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => {
    const out: FormValues = {};
    for (const f of config.fields) {
      const v = initial?.[f.key];
      if (v !== undefined) out[f.key] = v;
      else if (f.default !== undefined) out[f.key] = f.default;
      else if (f.kind === "boolean") out[f.key] = false;
      else if (f.kind === "integer") out[f.key] = 0;
      else out[f.key] = "";
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, v: string | number | boolean | null) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const url =
        mode === "create"
          ? `/api/admin/ref/${config.id}`
          : `/api/admin/ref/${config.id}/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(withBase(url), {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; error?: string; title?: string };
        throw new Error(body.detail ?? body.error ?? body.title ?? `HTTP ${res.status}`);
      }
      router.push(`/admin/ref/${config.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
      {config.fields.map((f) => {
        const id = `ref-${config.id}-${f.key}`;
        return (
          <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor={id}
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 10.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--text-3)"
              }}
            >
              {f.label}
              {f.required ? " *" : ""}
            </label>
            {renderInput(f.kind, id, values[f.key], (v) => set(f.key, v))}
            {f.help ? (
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>{f.help}</span>
            ) : null}
          </div>
        );
      })}

      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
          disabled={busy}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function renderInput(
  kind: "text" | "textarea" | "boolean" | "integer",
  id: string,
  value: string | number | boolean | null,
  set: (v: string | number | boolean | null) => void
) {
  if (kind === "textarea") {
    return (
      <textarea
        id={id}
        rows={4}
        className="auth-input"
        style={{ height: "auto", padding: "10px 14px", resize: "vertical" }}
        value={(value as string | null) ?? ""}
        onChange={(e) => set(e.target.value === "" ? null : e.target.value)}
      />
    );
  }
  if (kind === "boolean") {
    return (
      <label
        htmlFor={id}
        style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}
      >
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => set(e.target.checked)}
        />
        <span>{Boolean(value) ? "Active" : "Inactive"}</span>
      </label>
    );
  }
  if (kind === "integer") {
    return (
      <input
        id={id}
        type="number"
        className="auth-input"
        value={typeof value === "number" ? value : 0}
        onChange={(e) => set(Number.parseInt(e.target.value, 10) || 0)}
      />
    );
  }
  return (
    <input
      id={id}
      type="text"
      className="auth-input"
      value={(value as string | null) ?? ""}
      onChange={(e) => set(e.target.value)}
    />
  );
}
