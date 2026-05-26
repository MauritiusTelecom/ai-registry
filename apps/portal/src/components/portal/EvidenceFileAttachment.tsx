"use client";

import { useRef, useState } from "react";
import { registryFetch } from "@airegistry/ui-kit";
import { withBase } from "@airegistry/sdk";

type Props = {
  resourceId: string;
  /** When undefined, the evidence row hasn't been saved yet. The component
   *  stages the file locally and reports it via onPendingChange. */
  evidenceId?: string;
  initial: {
    filename: string | null;
    sizeBytes: number | null;
    contentType: string | null;
  };
  disabled?: boolean;
  /** Pending mode (unsaved row): the parent receives the staged file and
   *  uploads it after save once the evidence id exists. */
  pendingFile?: File | null;
  onPendingChange?: (file: File | null) => void;
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

export function EvidenceFileAttachment({
  resourceId,
  evidenceId,
  initial,
  disabled,
  pendingFile,
  onPendingChange
}: Props) {
  // Pending mode: evidence row not saved yet. Show file picker that stages
  // a File locally; the form uploads it after the resource save returns
  // the new evidence id.
  if (!evidenceId) {
    return (
      <PendingFilePicker
        file={pendingFile ?? null}
        onChange={(f) => onPendingChange?.(f)}
        disabled={disabled}
      />
    );
  }
  return <SavedRowAttachment resourceId={resourceId} evidenceId={evidenceId} initial={initial} disabled={disabled} />;
}

function SavedRowAttachment({
  resourceId,
  evidenceId,
  initial,
  disabled
}: {
  resourceId: string;
  evidenceId: string;
  initial: Props["initial"];
  disabled?: boolean;
}) {
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

function PendingFilePicker({
  file,
  onChange,
  disabled
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  function pick(f: File | null) {
    if (!f) {
      onChange(null);
      setErr(null);
      return;
    }
    if (!ALLOWED.has(f.type)) {
      setErr(`Type ${f.type || "unknown"} not allowed`);
      return;
    }
    if (f.size > MAX) {
      setErr("File exceeds 10 MB");
      return;
    }
    setErr(null);
    onChange(f);
  }

  if (file) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12,
          padding: "6px 10px",
          background: "rgba(90, 209, 255, 0.06)",
          border: "1px dashed rgba(90, 209, 255, 0.25)",
          borderRadius: 6
        }}
      >
        <span>📎</span>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.name}
        </span>
        <span style={{ opacity: 0.6 }}>{formatSize(file.size)}</span>
        <span style={{ fontSize: 11, opacity: 0.7, fontStyle: "italic" }}>
          will upload when you Save changes
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              pick(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-3, rgba(255,255,255,0.6))",
              cursor: "pointer",
              fontSize: 14,
              padding: 0
            }}
            aria-label="Remove staged file"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
      {!disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            fontSize: 11,
            background: "transparent",
            border: "1px solid var(--border-1, rgba(255,255,255,0.12))",
            padding: "4px 8px",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          📎 Attach file (optional)
        </button>
      )}
      <span style={{ opacity: 0.5, fontSize: 11 }}>
        PDF, image, txt, zip · max 10 MB
      </span>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
        style={{ display: "none" }}
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      {err && <span style={{ color: "tomato" }}>{err}</span>}
    </div>
  );
}

