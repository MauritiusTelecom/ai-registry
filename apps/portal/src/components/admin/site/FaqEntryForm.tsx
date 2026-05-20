"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

export type FaqEntryFormInitial = {
  code: string;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
};

const labelStyle: React.CSSProperties = {
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: 10.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--text-3)"
};

/**
 * Single client form used by both /admin/site/faq/new (mode="create") and
 * /admin/site/faq/[code] (mode="edit"). Submits to POST /api/admin/site/faq
 * for upsert; the API does `prisma.upsert({ where: { code } })` so create vs
 * edit only differ in the form's initial values and whether the delete button
 * is rendered.
 */
export function FaqEntryForm({
  mode,
  initial
}: {
  mode: "create" | "edit";
  initial: FaqEntryFormInitial;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initial.code);
  const [question, setQuestion] = useState(initial.question);
  const [answer, setAnswer] = useState(initial.answer);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [active, setActive] = useState(initial.active);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await registryFetch(withBase("/api/admin/site/faq"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          question: question.trim(),
          answer: answer.trim(),
          sortOrder: Number(sortOrder) || 0,
          active
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setMessage({ kind: "ok", text: "Saved." });
      router.push("/admin/site/faq");
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit") return;
    if (!confirm(`Delete FAQ entry "${initial.code}"? This cannot be undone.`)) return;
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch(
        withBase(`/api/admin/site/faq/${encodeURIComponent(initial.code)}`),
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.push("/admin/site/faq");
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 720, display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="faq-code" style={labelStyle}>
          Code
        </label>
        <input
          id="faq-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          disabled={mode === "edit"}
          placeholder='e.g. "hosting", "verified"'
          style={{
            padding: "9px 12px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--panel)",
            color: "var(--text)",
            fontSize: 14,
            opacity: mode === "edit" ? 0.55 : 1
          }}
        />
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
          Stable lookup key (lowercase, hyphen-separated). Cannot be changed
          after creation — delete and re-create to rename.
        </span>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="faq-question" style={labelStyle}>
          Question
        </label>
        <input
          id="faq-question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          maxLength={200}
          style={{
            padding: "9px 12px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--panel)",
            color: "var(--text)",
            fontSize: 14
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="faq-answer" style={labelStyle}>
          Answer
        </label>
        <textarea
          id="faq-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          required
          rows={5}
          style={{
            padding: "9px 12px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--panel)",
            color: "var(--text)",
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical"
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="faq-sortOrder" style={labelStyle}>
            Sort order
          </label>
          <input
            id="faq-sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            min={0}
            style={{
              padding: "9px 12px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--panel)",
              color: "var(--text)",
              fontSize: 14,
              width: 110
            }}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: "var(--text-2)",
            cursor: "pointer"
          }}
        >
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active (visible on the public site)
        </label>
      </div>

      {message ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background:
              message.kind === "ok"
                ? "rgba(16, 185, 129, 0.10)"
                : "rgba(239, 68, 68, 0.10)",
            border:
              message.kind === "ok"
                ? "1px solid rgba(16, 185, 129, 0.30)"
                : "1px solid rgba(239, 68, 68, 0.30)",
            color: message.kind === "ok" ? "#10b981" : "#ef4444",
            fontSize: 13
          }}
        >
          {message.text}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
          {saving ? "Saving…" : mode === "create" ? "Create entry" : "Save changes"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onDelete}
            disabled={saving || deleting}
            style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.45)" }}
          >
            {deleting ? "Deleting…" : "Delete entry"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
