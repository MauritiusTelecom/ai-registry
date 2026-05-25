"use client";

import { useCallback, useEffect, useState } from "react";
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
      setErr(e instanceof Error ? e.message : "Failed to load documents");
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
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Verification documents</h2>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 4, marginBottom: 0 }}>
            Upload company registration, certifications, and other proof. Public docs appear on your public provider page.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="btn btn-primary"
          style={{ marginLeft: "auto" }}
        >
          + Upload document
        </button>
      </div>

      {loading && <p style={{ fontSize: 13, opacity: 0.7 }}>Loading…</p>}
      {err && <p style={{ fontSize: 13, color: "tomato" }}>Error: {err}</p>}

      {!loading && docs.length === 0 && (
        <p style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>
          No documents uploaded yet.
        </p>
      )}

      {docs.length > 0 && (
        <table style={{ width: "100%", marginTop: 8, fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-1)" }}>
              <th style={{ padding: "8px 6px" }}>Type</th>
              <th style={{ padding: "8px 6px" }}>Title</th>
              <th style={{ padding: "8px 6px" }}>File</th>
              <th style={{ padding: "8px 6px" }}>Visibility</th>
              <th style={{ padding: "8px 6px" }}>Expires</th>
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
                  {d.publicVisibility ? "Public" : "Verifier only"}
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
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!confirm("Delete this document?")) return;
    setBusy(true);
    try {
      const res = await registryFetch(`/api/portal/provider/documents/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        alert("Delete failed: " + ((await res.json().catch(() => ({}))).error ?? res.status));
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
      Delete
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
      setErr("Pick a file");
      return;
    }
    if (!ALLOWED.has(file.type)) {
      setErr(`File type ${file.type || "unknown"} not allowed`);
      return;
    }
    if (file.size > MAX) {
      setErr("File exceeds 10 MB");
      return;
    }
    if (title.trim().length === 0) {
      setErr("Title is required");
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

  return (
    <div
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-1)",
          padding: 24,
          borderRadius: 8,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflow: "auto"
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 16 }}>Upload document</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: 13 }}>
            Type
            <select
              value={documentTypeCode}
              onChange={(e) => setDocumentTypeCode(e.target.value)}
              style={{
                display: "block",
                marginTop: 4,
                width: "100%",
                padding: 6
              }}
            >
              {documentTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MT Business Registration 2026"
              style={{
                display: "block",
                marginTop: 4,
                width: "100%",
                padding: 6
              }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{
                display: "block",
                marginTop: 4,
                width: "100%",
                padding: 6
              }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            File (PDF, image, txt, zip — 10 MB max)
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ display: "block", marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={publicVisibility}
              onChange={(e) => setPublicVisibility(e.target.checked)}
            />
            Show on public provider page
          </label>
          <label style={{ fontSize: 13 }}>
            Expires (optional)
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              style={{
                display: "block",
                marginTop: 4,
                width: "100%",
                padding: 6
              }}
            />
          </label>
          {err && <p style={{ fontSize: 12, color: "tomato", margin: 0 }}>{err}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={busy} className="btn">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn btn-primary">
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
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
