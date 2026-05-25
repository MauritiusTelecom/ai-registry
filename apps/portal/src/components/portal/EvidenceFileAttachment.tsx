"use client";

import { useRef, useState } from "react";
import { registryFetch } from "@airegistry/ui-kit";
import { withBase } from "@airegistry/sdk";

type Props = {
  resourceId: string;
  evidenceId: string;
  initial: {
    filename: string | null;
    sizeBytes: number | null;
    contentType: string | null;
  };
  disabled?: boolean;
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

export function EvidenceFileAttachment({ resourceId, evidenceId, initial, disabled }: Props) {
  const [filename, setFilename] = useState<string | null>(initial.filename);
  const [sizeBytes, setSizeBytes] = useState<number | null>(initial.sizeBytes);
  const [contentType, setContentType] = useState<string | null>(initial.contentType);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!ALLOWED.has(file.type)) {
      setErr(`Type ${file.type || "unknown"} not allowed`);
      return;
    }
    if (file.size > MAX) {
      setErr("File exceeds 10 MB");
      return;
    }
    setErr(null);
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await registryFetch(
        `/api/portal/resources/${resourceId}/evidence/${evidenceId}/file`,
        { method: "POST", body: form }
      );
      if (!res.ok) {
        setErr((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setFilename(data.filename);
      setSizeBytes(data.sizeBytes);
      setContentType(data.contentType);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Remove the attached file?")) return;
    setBusy(true);
    try {
      const res = await registryFetch(
        `/api/portal/resources/${resourceId}/evidence/${evidenceId}/file`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setErr((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
        return;
      }
      setFilename(null);
      setSizeBytes(null);
      setContentType(null);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  if (filename) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
        <span>📎</span>
        <a
          href={withBase(
            `/api/portal/resources/${resourceId}/evidence/${evidenceId}/file`
          )}
          target="_blank"
          rel="noreferrer"
        >
          {filename}
        </a>
        <span style={{ opacity: 0.6 }}>
          ({sizeBytes ? formatSize(sizeBytes) : ""}
          {contentType ? ` · ${contentType}` : ""})
        </span>
        {!disabled && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              style={{
                fontSize: 11,
                background: "transparent",
                border: "1px solid var(--border-1)",
                padding: "2px 6px",
                borderRadius: 4,
                cursor: "pointer"
              }}
            >
              Replace
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              style={{
                fontSize: 11,
                background: "transparent",
                border: "1px solid var(--border-1)",
                padding: "2px 6px",
                borderRadius: 4,
                cursor: "pointer"
              }}
            >
              Remove
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        {err && <span style={{ color: "tomato" }}>{err}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, opacity: 0.85 }}>
      <span style={{ opacity: 0.7 }}>No file attached.</span>
      {!disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{
            fontSize: 11,
            background: "transparent",
            border: "1px solid var(--border-1)",
            padding: "2px 6px",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          {busy ? "Uploading…" : "Upload file"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {err && <span style={{ color: "tomato" }}>{err}</span>}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
