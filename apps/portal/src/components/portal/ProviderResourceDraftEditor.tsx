"use client";

import { withBase } from "@airegistry/sdk";
import { useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { Button, Field, Input, TextArea } from "@/components/library";
import { registryFetch } from "@airegistry/ui-kit";

/**
 * Draft editor for a LIVE (listed) resource.
 *
 * Edits never touch the published listing. They accumulate on a draft version
 * that goes for re-approval; the live entry stays public until an admin/reviewer
 * approves the draft, at which point it overwrites the live one. Only the
 * versioned scalar fields are editable here — sovereignty evidence, endpoints,
 * languages and sectors stay locked while a resource is live.
 */

export type DraftScalars = {
  title: string;
  shortDescription: string;
  longDescription: string | null;
  versionLabel: string | null;
  versionNumber: string | null;
  latencyTier: string | null;
  license: string | null;
  accessUrl: string | null;
  documentationUrl: string | null;
  sourceCodeUrl: string | null;
  termsUrl: string | null;
};

type Props = {
  resourceId: string;
  live: DraftScalars;
  draft: DraftScalars | null;
  draftStatus: "draft" | "submitted" | "rejected" | null;
  postSubmitPath: string;
};

const FIELD_LABELS: { key: keyof DraftScalars; label: string; long?: boolean }[] = [
  { key: "title", label: "Title" },
  { key: "shortDescription", label: "Short description", long: true },
  { key: "longDescription", label: "Long description", long: true },
  { key: "versionLabel", label: "Version label" },
  { key: "versionNumber", label: "Version number" },
  { key: "latencyTier", label: "Latency tier" },
  { key: "license", label: "License" },
  { key: "accessUrl", label: "Access URL" },
  { key: "documentationUrl", label: "Documentation URL" },
  { key: "sourceCodeUrl", label: "Source code URL" },
  { key: "termsUrl", label: "Terms URL" }
];

function s(v: string | null): string {
  return v ?? "";
}

export function ProviderResourceDraftEditor({
  resourceId,
  live,
  draft,
  draftStatus,
  postSubmitPath
}: Props) {
  const router = useRouter();

  // Initialise from the pending draft if one exists, else from the live record.
  const base = draft ?? live;
  const [values, setValues] = useState<DraftScalars>({
    title: base.title,
    shortDescription: base.shortDescription,
    longDescription: base.longDescription,
    versionLabel: base.versionLabel,
    versionNumber: base.versionNumber,
    latencyTier: base.latencyTier,
    license: base.license,
    accessUrl: base.accessUrl,
    documentationUrl: base.documentationUrl,
    sourceCodeUrl: base.sourceCodeUrl,
    termsUrl: base.termsUrl
  });

  const [status, setStatus] = useState<"draft" | "submitted" | "rejected" | null>(
    draftStatus
  );
  const [busy, setBusy] = useState<null | "save" | "submit" | "discard">(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const locked = status === "submitted";

  // Fields that differ from the live listing — shown as the pending change set.
  const changed = useMemo(() => {
    return FIELD_LABELS.filter(({ key }) => s(values[key]) !== s(live[key])).map(
      (f) => f.label
    );
  }, [values, live]);

  function set<K extends keyof DraftScalars>(key: K, raw: string) {
    setValues((v) => ({ ...v, [key]: raw }));
    setSavedAt(null);
  }

  function payload(): Record<string, string | null> {
    return {
      title: values.title.trim(),
      shortDescription: values.shortDescription.trim(),
      longDescription: s(values.longDescription).trim() || null,
      versionLabel: s(values.versionLabel).trim() || null,
      versionNumber: s(values.versionNumber).trim() || null,
      latencyTier: s(values.latencyTier).trim() || null,
      license: s(values.license).trim() || null,
      accessUrl: s(values.accessUrl).trim() || null,
      documentationUrl: s(values.documentationUrl).trim() || null,
      sourceCodeUrl: s(values.sourceCodeUrl).trim() || null,
      termsUrl: s(values.termsUrl).trim() || null
    };
  }

  async function saveDraft(): Promise<boolean> {
    // Ensure a draft exists (idempotent), then write the scalar patch onto it.
    const open = await registryFetch(
      withBase(`/api/portal/resources/${resourceId}/draft`),
      { method: "POST" }
    );
    if (!open.ok) {
      const d = (await open.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "Could not open a draft.");
      return false;
    }
    const res = await registryFetch(
      withBase(`/api/portal/resources/${resourceId}/draft`),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload())
      }
    );
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "Could not save changes.");
      return false;
    }
    setStatus("draft");
    return true;
  }

  async function onSave() {
    setError(null);
    setBusy("save");
    try {
      if (await saveDraft()) setSavedAt(Date.now());
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit() {
    setError(null);
    setBusy("submit");
    try {
      // Persist the latest edits first, then submit the draft for approval.
      if (!(await saveDraft())) return;
      const res = await registryFetch(
        withBase(`/api/portal/resources/${resourceId}/draft/submit`),
        { method: "POST" }
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Could not submit for approval.");
        return;
      }
      router.push(postSubmitPath);
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setBusy(null);
    }
  }

  async function onDiscard() {
    setError(null);
    setBusy("discard");
    try {
      const res = await registryFetch(
        withBase(`/api/portal/resources/${resourceId}/draft`),
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Could not discard the draft.");
        return;
      }
      setValues({
        title: live.title,
        shortDescription: live.shortDescription,
        longDescription: live.longDescription,
        versionLabel: live.versionLabel,
        versionNumber: live.versionNumber,
        latencyTier: live.latencyTier,
        license: live.license,
        accessUrl: live.accessUrl,
        documentationUrl: live.documentationUrl,
        sourceCodeUrl: live.sourceCodeUrl,
        termsUrl: live.termsUrl
      });
      setStatus(null);
      setSavedAt(null);
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Banner status={status} locked={locked} />

      {error ? (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.08)",
            color: "#fca5a5",
            fontSize: 13
          }}
        >
          {error}
        </div>
      ) : null}

      <div className="p-card" style={{ display: "grid", gap: 14, padding: 18 }}>
        {FIELD_LABELS.map(({ key, label, long }) => (
          <Field key={key} label={label}>
            {long ? (
              <TextArea
                value={s(values[key])}
                disabled={locked}
                rows={key === "longDescription" ? 6 : 3}
                onChange={(e) => set(key, e.target.value)}
              />
            ) : (
              <Input
                value={s(values[key])}
                disabled={locked}
                onChange={(e) => set(key, e.target.value)}
              />
            )}
          </Field>
        ))}
      </div>

      <div
        style={{
          fontSize: 12.5,
          color: "var(--text-3)",
          borderTop: "1px solid var(--border)",
          paddingTop: 12
        }}
      >
        {changed.length > 0 ? (
          <>
            <strong style={{ color: "var(--text-2)" }}>
              {changed.length} change{changed.length === 1 ? "" : "s"} vs live:
            </strong>{" "}
            {changed.join(", ")}
          </>
        ) : (
          "No changes from the live listing yet."
        )}
        {savedAt ? (
          <span style={{ marginLeft: 8, color: "#34d399" }}>· Draft saved</span>
        ) : null}
      </div>

      {!locked ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={onSubmit} disabled={busy !== null || changed.length === 0}>
            {busy === "submit" ? "Submitting…" : "Submit for approval"}
          </Button>
          <Button
            intent="secondary"
            onClick={onSave}
            disabled={busy !== null || changed.length === 0}
          >
            {busy === "save" ? "Saving…" : "Save draft"}
          </Button>
          {status === "draft" || status === "rejected" ? (
            <Button intent="ghost" onClick={onDiscard} disabled={busy !== null}>
              {busy === "discard" ? "Discarding…" : "Discard draft"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Banner({
  status,
  locked
}: {
  status: "draft" | "submitted" | "rejected" | null;
  locked: boolean;
}) {
  let tone = "rgba(59,130,246,0.4)";
  let bg = "rgba(59,130,246,0.08)";
  let title = "This resource is live";
  let body =
    "Your changes create a pending update that goes for approval. The current version stays public until an admin approves the update.";

  if (locked) {
    tone = "rgba(245,158,11,0.45)";
    bg = "rgba(245,158,11,0.08)";
    title = "Update pending review";
    body =
      "Your update has been submitted and is awaiting approval. The live listing is unchanged until it is approved.";
  } else if (status === "rejected") {
    tone = "rgba(239,68,68,0.4)";
    bg = "rgba(239,68,68,0.08)";
    title = "Changes were requested";
    body =
      "Your previous update was not approved. Edit and resubmit it for another review. The live listing is unchanged.";
  }

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 12,
        border: `1px solid ${tone}`,
        background: bg
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}
