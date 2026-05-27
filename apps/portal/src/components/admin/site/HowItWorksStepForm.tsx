"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";
import { useTranslations } from "next-intl";

export type HowItWorksStepFormInitial = {
  code: string;
  title: string;
  description: string;
  stepNumber: number;
  highlight: boolean;
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

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--panel)",
  color: "var(--text)",
  fontSize: 14
};

export function HowItWorksStepForm({
  mode,
  initial
}: {
  mode: "create" | "edit";
  initial: HowItWorksStepFormInitial;
}) {
  const t = useTranslations("adminSiteHowItWorks");
  const router = useRouter();
  const [code, setCode] = useState(initial.code);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [stepNumber, setStepNumber] = useState(String(initial.stepNumber));
  const [highlight, setHighlight] = useState(initial.highlight);
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
      const res = await registryFetch(withBase("/api/admin/site/how-it-works"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          title: title.trim(),
          description: description.trim(),
          stepNumber: Number(stepNumber) || 1,
          highlight,
          sortOrder: Number(sortOrder) || 0,
          active
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.push("/admin/site/how-it-works");
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit") return;
    if (!confirm(t("confirmDelete", { code: initial.code }))) return;
    setDeleting(true);
    try {
      const res = await registryFetch(
        withBase(`/api/admin/site/how-it-works/${encodeURIComponent(initial.code)}`),
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.push("/admin/site/how-it-works");
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 720, display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="hiw-code" style={labelStyle}>{t("code")}</label>
        <input
          id="hiw-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          disabled={mode === "edit"}
          placeholder={t("codePlaceholder")}
          style={{ ...inputStyle, opacity: mode === "edit" ? 0.55 : 1 }}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="hiw-title" style={labelStyle}>{t("title")}</label>
        <input
          id="hiw-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={inputStyle}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="hiw-desc" style={labelStyle}>{t("description")}</label>
        <textarea
          id="hiw-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 18, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="hiw-num" style={labelStyle}>{t("stepNumber")}</label>
          <input
            id="hiw-num"
            type="number"
            value={stepNumber}
            onChange={(e) => setStepNumber(e.target.value)}
            min={1}
            style={{ ...inputStyle, width: 90 }}
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="hiw-sort" style={labelStyle}>{t("sortOrder")}</label>
          <input
            id="hiw-sort"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            min={0}
            style={{ ...inputStyle, width: 110 }}
          />
        </div>
        <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-2)" }}>
            <input
              type="checkbox"
              checked={highlight}
              onChange={(e) => setHighlight(e.target.checked)}
            />
            {t("highlightLabel")}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-2)" }}>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            {t("active")}
          </label>
        </div>
      </div>

      {message ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(239, 68, 68, 0.10)",
            border: "1px solid rgba(239, 68, 68, 0.30)",
            color: "#ef4444",
            fontSize: 13
          }}
        >
          {message.text}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
          {saving ? t("saving") : mode === "create" ? t("createStep") : t("saveChanges")}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onDelete}
            disabled={saving || deleting}
            style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.45)" }}
          >
            {deleting ? t("deleting") : t("deleteStep")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
