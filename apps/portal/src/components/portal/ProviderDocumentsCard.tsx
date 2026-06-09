"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { registryFetch } from "@airegistry/ui-kit";
import { withBase } from "@airegistry/sdk";

type DocumentRow = {
  id: string;
  title: string;
  description: string | null;
  documentType: { code: string; name: string };
  filename: string;
  contentType: string;
  sizeBytes: number;
  publicVisibility: boolean;
  expiresAt: string | null;
  uploadedAt: string;
  uploadedBy: { id: string; name: string; email: string };
  url: string;
};

type Props = {
  documentTypes: { code: string; name: string }[];
};

const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/zip"
]);
const MAX = 10 * 1024 * 1024;

export function ProviderDocumentsCard({ documentTypes }: Props) {
  const t = useTranslations("providerDocs");
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const res = await registryFetch("/api/portal/provider/documents");
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      const data = await res.json();
      setDocs(data.documents);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="glass" style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{t("title")}</h2>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 4, marginBottom: 0 }}>
            {t("description")}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="btn btn-primary"
          style={{ marginLeft: "auto" }}
        >
          {t("uploadButton")}
        </button>
      </div>

      {loading && <p style={{ fontSize: 13, opacity: 0.7 }}>{t("loading")}</p>}
      {err && <p style={{ fontSize: 13, color: "tomato" }}>{t("error", { message: err })}</p>}

      {!loading && docs.length === 0 && (
        <p style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>
          {t("emptyState")}
        </p>
      )}

      {docs.length > 0 && (
        <table style={{ width: "100%", marginTop: 8, fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-1)" }}>
              <th style={{ padding: "8px 6px" }}>{t("colType")}</th>
              <th style={{ padding: "8px 6px" }}>{t("colTitle")}</th>
              <th style={{ padding: "8px 6px" }}>{t("colFile")}</th>
              <th style={{ padding: "8px 6px" }}>{t("colVisibility")}</th>
              <th style={{ padding: "8px 6px" }}>{t("colExpires")}</th>
              <th style={{ padding: "8px 6px" }}></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid var(--border-1)" }}>
                <td style={{ padding: "8px 6px" }}>{d.documentType.name}</td>
                <td style={{ padding: "8px 6px" }}>{d.title}</td>
                <td style={{ padding: "8px 6px" }}>
                  <a href={withBase(d.url)} target="_blank" rel="noreferrer">
                    {d.filename}
                  </a>{" "}
                  <span style={{ opacity: 0.5 }}>({formatSize(d.sizeBytes)})</span>
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {d.publicVisibility ? t("visPublic") : t("visVerifierOnly")}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {d.expiresAt ? formatDate(d.expiresAt) : "—"}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  <DeleteButton id={d.id} onDeleted={refresh} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open && (
        <UploadDialog
          documentTypes={documentTypes}
          onClose={() => setOpen(false)}
          onUploaded={() => {
            setOpen(false);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const t = useTranslations("providerDocs");
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!confirm(t("deleteConfirm"))) return;
    setBusy(true);
    try {
      const res = await registryFetch(`/api/portal/provider/documents/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        alert(
          `${t("deleteFailed")}: ${(await res.json().catch(() => ({}))).error ?? res.status}`
        );
      }
      onDeleted();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={del}
      disabled={busy}
      style={{
        fontSize: 12,
        background: "transparent",
        border: "1px solid var(--border-1)",
        padding: "4px 8px",
        borderRadius: 4,
        cursor: "pointer",
        opacity: busy ? 0.5 : 1
      }}
    >
      {t("deleteButton")}
    </button>
  );
}

function UploadDialog({
  documentTypes,
  onClose,
  onUploaded
}: {
  documentTypes: { code: string; name: string }[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const t = useTranslations("providerDocs");
  const [file, setFile] = useState<File | null>(null);
  const [documentTypeCode, setDocumentTypeCode] = useState(documentTypes[0]?.code ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publicVisibility, setPublicVisibility] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!file) {
      setErr(t("pickFile"));
      return;
    }
    if (!ALLOWED.has(file.type)) {
      setErr(t("typeNotAllowed", { type: file.type || "unknown" }));
      return;
    }
    if (file.size > MAX) {
      setErr(t("fileExceeds10MB"));
      return;
    }
    if (title.trim().length === 0) {
      setErr(t("titleRequired"));
      return;
    }

    setBusy(true);
    setErr(null);
    const form = new FormData();
    form.append("file", file);
    form.append("documentTypeCode", documentTypeCode);
    form.append("title", title.trim());
    if (description.trim()) form.append("description", description.trim());
    if (publicVisibility) form.append("publicVisibility", "true");
    if (expiresAt) form.append("expiresAt", expiresAt);

    try {
      const res = await registryFetch("/api/portal/provider/documents", {
        method: "POST",
        body: form
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`;
        setErr(detail);
        return;
      }
      onUploaded();
    } finally {
      setBusy(false);
    }
  }

  const fieldSpacing: CSSProperties = { marginTop: 6 };
  const labelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text-2, rgba(255,255,255,0.7))",
    textTransform: "uppercase",
    letterSpacing: "0.04em"
  };

  return (
    <div
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-2, #14181f)",
          border: "1px solid var(--hairline, rgba(255,255,255,0.08))",
          padding: 28,
          borderRadius: 12,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 4, fontSize: 18, fontWeight: 600 }}>
          {t("uploadDialogTitle")}
        </h3>
        <p style={{ margin: 0, marginBottom: 20, fontSize: 13, color: "var(--text-3, rgba(255,255,255,0.55))" }}>
          {t("uploadDialogDescription")}
        </p>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={labelStyle}>{t("colType")}</div>
            <select
              className="auth-input p-select"
              value={documentTypeCode}
              onChange={(e) => setDocumentTypeCode(e.target.value)}
              style={fieldSpacing}
            >
              {documentTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={labelStyle}>{t("colTitle")}</div>
            <input
              type="text"
              className="auth-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              style={fieldSpacing}
            />
          </div>

          <div>
            <div style={labelStyle}>{t("descriptionOptional")}</div>
            <textarea
              className="p-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ ...fieldSpacing, minHeight: 70, height: "auto", resize: "vertical" }}
            />
          </div>

          <div>
            <div style={labelStyle}>{t("fileLabel")}</div>
            <FilePicker file={file} onPick={setFile} />
          </div>

          <div>
            <div style={labelStyle}>{t("expiresOptional")}</div>
            <input
              type="date"
              className="auth-input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              style={fieldSpacing}
            />
          </div>

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              fontSize: 13,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--hairline, rgba(255,255,255,0.08))",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            <input
              type="checkbox"
              checked={publicVisibility}
              onChange={(e) => setPublicVisibility(e.target.checked)}
              style={{ accentColor: "var(--accent, #5ad1ff)" }}
            />
            <span>{t("showOnPublicPage")}</span>
          </label>

          {err && (
            <div
              style={{
                fontSize: 12,
                color: "#ff8a95",
                padding: "8px 10px",
                background: "rgba(255, 90, 106, 0.1)",
                border: "1px solid rgba(255, 90, 106, 0.3)",
                borderRadius: 6
              }}
            >
              {err}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={busy}
            className="btn"
            style={{ minWidth: 100 }}
          >
            {t("cancel")}
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="btn btn-primary"
            style={{ minWidth: 100 }}
          >
            {busy ? t("uploading") : t("upload")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilePicker({
  file,
  onPick
}: {
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const t = useTranslations("providerDocs");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => ref.current?.click()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 6,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.04)",
        border: "1px dashed var(--hairline, rgba(255,255,255,0.18))",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 13
      }}
    >
      <span style={{ fontSize: 18 }}>📎</span>
      {file ? (
        <>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name}
          </span>
          <span style={{ opacity: 0.6, fontSize: 12 }}>{formatSize(file.size)}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPick(null);
              if (ref.current) ref.current.value = "";
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-3, rgba(255,255,255,0.6))",
              fontSize: 16,
              padding: 0
            }}
            aria-label={t("removeFileAria")}
          >
            ✕
          </button>
        </>
      ) : (
        <span style={{ opacity: 0.7 }}>{t("pickFilePrompt")}</span>
      )}
      <input
        ref={ref}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
        style={{ display: "none" }}
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
