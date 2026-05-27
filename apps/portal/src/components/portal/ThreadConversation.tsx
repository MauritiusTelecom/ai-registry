"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { registryFetch } from "@airegistry/ui-kit";
import { withBase } from "@airegistry/sdk";

type Attachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  url: string;
};

type Message = {
  id: string;
  body: string;
  systemEvent: string | null;
  createdAt: string;
  authorRole: string;
  author: { id: string; name: string; email: string; role?: { code: string } | null };
  attachments: Attachment[];
};

type Thread = {
  id: string;
  status: { code: string; name: string };
  openedBy: { id: string; name: string; email: string };
  createdAt: string;
  messages: Message[];
} | null;

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/zip"
]);
const MAX_BYTES = 10 * 1024 * 1024;

type Props = {
  reviewId: string;
  /** "verifier" | "admin" can open threads + change status. "provider" can only reply. */
  viewerRole: "verifier" | "admin" | "provider";
  /** Render the composer when true. Composer disabled if status is resolved/closed. */
  canCompose: boolean;
};

export function ThreadConversation({ reviewId, viewerRole, canCompose }: Props) {
  const t = useTranslations("threadConversation");
  const [thread, setThread] = useState<Thread>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await registryFetch(`/api/portal/reviews/${reviewId}/thread`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      const data = await res.json();
      setThread(data.thread);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) return <div className="p-4 text-sm opacity-70">{t("loading")}</div>;
  if (error) return <div className="p-4 text-sm text-red-400">{t("error", { message: error })}</div>;

  const canManageStatus = viewerRole === "verifier" || viewerRole === "admin";
  const canOpenNew = canManageStatus;
  const isClosed = thread?.status.code === "resolved" || thread?.status.code === "closed";

  return (
    <div className="space-y-3">
      {thread && (
        <ThreadHeader
          thread={thread}
          canManage={canManageStatus}
          reviewId={reviewId}
          onChange={refresh}
        />
      )}

      {!thread && canOpenNew && (
        <NewThreadComposer reviewId={reviewId} onOpened={refresh} />
      )}

      {!thread && !canOpenNew && (
        <div className="p-4 text-sm opacity-70 bg-black/20 rounded">
          {t("noConversationYet")}
        </div>
      )}

      {thread && (
        <>
          <ol className="space-y-3">
            {thread.messages.map((m) => (
              <MessageRow key={m.id} message={m} reviewId={reviewId} />
            ))}
          </ol>

          {canCompose && !isClosed && (
            <ReplyComposer reviewId={reviewId} onSent={refresh} />
          )}
          {canCompose && isClosed && (
            <div className="text-xs opacity-60 italic">
              {t("threadClosed", { status: thread.status.name.toLowerCase() })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

function ThreadHeader({
  thread,
  canManage,
  reviewId,
  onChange
}: {
  thread: NonNullable<Thread>;
  canManage: boolean;
  reviewId: string;
  onChange: () => void;
}) {
  const t = useTranslations("threadConversation");
  const [busy, setBusy] = useState(false);

  async function setStatus(statusCode: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await registryFetch(`/api/portal/reviews/${reviewId}/thread`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statusCode })
      });
      if (!res.ok) {
        alert("Failed to update status: " + ((await res.json().catch(() => ({}))).error ?? res.status));
      }
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm bg-black/20 rounded p-3">
      <span className="font-medium">{t("status")}:</span>
      <StatusPill code={thread.status.code} name={thread.status.name} />
      {canManage && (
        <div className="ml-auto flex gap-2">
          {thread.status.code !== "resolved" && (
            <button
              onClick={() => setStatus("resolved")}
              disabled={busy}
              className="px-3 py-1 text-xs rounded bg-green-700 hover:bg-green-600 disabled:opacity-50"
            >
              {t("markResolved")}
            </button>
          )}
          {thread.status.code !== "closed" && (
            <button
              onClick={() => setStatus("closed")}
              disabled={busy}
              className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50"
            >
              {t("close")}
            </button>
          )}
          {(thread.status.code === "resolved" || thread.status.code === "closed") && (
            <button
              onClick={() => setStatus("open")}
              disabled={busy}
              className="px-3 py-1 text-xs rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50"
            >
              {t("reopen")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({ code, name }: { code: string; name: string }) {
  const colour: Record<string, string> = {
    open: "bg-blue-600",
    awaiting_provider: "bg-orange-600",
    awaiting_verifier: "bg-cyan-600",
    resolved: "bg-green-600",
    closed: "bg-zinc-600"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colour[code] ?? "bg-zinc-700"}`}>
      {name}
    </span>
  );
}

function MessageRow({ message, reviewId }: { message: Message; reviewId: string }) {
  if (message.systemEvent) {
    return (
      <li className="text-xs italic opacity-60 px-3">
        — {message.body} ·{" "}
        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
      </li>
    );
  }

  return (
    <li className="bg-black/30 rounded p-3 space-y-2">
      <div className="flex items-baseline gap-2 text-xs">
        <span className="font-semibold">{message.author.name}</span>
        <RolePill role={message.authorRole} />
        <time className="opacity-60" dateTime={message.createdAt}>
          {formatTime(message.createdAt)}
        </time>
      </div>
      {message.body && <div className="text-sm whitespace-pre-wrap">{message.body}</div>}
      {message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {message.attachments.map((a) => (
            <AttachmentTile key={a.id} att={a} reviewId={reviewId} />
          ))}
        </div>
      )}
    </li>
  );
}

function RolePill({ role }: { role: string }) {
  const colour: Record<string, string> = {
    verifier: "bg-purple-700",
    admin: "bg-red-700",
    provider: "bg-blue-700"
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${colour[role] ?? "bg-zinc-700"}`}>
      {role}
    </span>
  );
}

function AttachmentTile({ att, reviewId }: { att: Attachment; reviewId: string }) {
  const url = withBase(att.url);
  if (IMAGE_TYPES.has(att.contentType)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={att.filename}
          className="max-w-[240px] max-h-[240px] rounded border border-white/10"
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded text-xs hover:bg-black/60"
    >
      <span>📎</span>
      <span className="font-medium">{att.filename}</span>
      <span className="opacity-60">({formatSize(att.sizeBytes)})</span>
    </a>
  );
}

function NewThreadComposer({ reviewId, onOpened }: { reviewId: string; onOpened: () => void }) {
  const t = useTranslations("threadConversation");
  return (
    <ComposerCore
      placeholder={t("newThreadPlaceholder")}
      buttonLabel={t("sendToProvider")}
      onSubmit={async (body, files) => {
        const res = await registryFetch(`/api/portal/reviews/${reviewId}/thread`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: body })
        });
        if (!res.ok) {
          throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        const messageId: string = data.thread.messages[0].id;
        await uploadFiles(reviewId, messageId, files);
        onOpened();
      }}
    />
  );
}

function ReplyComposer({ reviewId, onSent }: { reviewId: string; onSent: () => void }) {
  const t = useTranslations("threadConversation");
  return (
    <ComposerCore
      placeholder={t("replyPlaceholder")}
      buttonLabel={t("reply")}
      onSubmit={async (body, files) => {
        const res = await registryFetch(
          `/api/portal/reviews/${reviewId}/thread/messages`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ body })
          }
        );
        if (!res.ok) {
          throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        const messageId: string = data.message.id;
        await uploadFiles(reviewId, messageId, files);
        onSent();
      }}
    />
  );
}

async function uploadFiles(reviewId: string, messageId: string, files: File[]) {
  for (const file of files) {
    const form = new FormData();
    form.append("file", file);
    const res = await registryFetch(
      `/api/portal/reviews/${reviewId}/thread/messages/${messageId}/attachments`,
      { method: "POST", body: form }
    );
    if (!res.ok) {
      const detail = (await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`;
      throw new Error(`${file.name}: ${detail}`);
    }
  }
}

function ComposerCore({
  placeholder,
  buttonLabel,
  onSubmit
}: {
  placeholder: string;
  buttonLabel: string;
  onSubmit: (body: string, files: File[]) => Promise<void>;
}) {
  const t = useTranslations("threadConversation");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    const next: File[] = [...files];
    const errs: string[] = [];
    for (const f of arr) {
      if (next.length >= 5) {
        errs.push(`${f.name}: ${t("maxAttachments")}`);
        continue;
      }
      if (!ALLOWED_TYPES.has(f.type)) {
        errs.push(`${f.name}: ${t("typeNotAllowed", { type: f.type || "unknown" })}`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        errs.push(`${f.name}: ${t("exceeds10MB")}`);
        continue;
      }
      next.push(f);
    }
    if (errs.length) setErr(errs.join("\n"));
    else setErr(null);
    setFiles(next);
  }

  async function handleSend() {
    if (busy) return;
    if (body.trim().length === 0 && files.length === 0) {
      setErr(t("messageRequired"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(body.trim(), files);
      setBody("");
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("sendFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`relative rounded border ${
        dragging ? "border-cyan-400 bg-cyan-950/30" : "border-white/10 bg-black/30"
      } p-3 space-y-2`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
      }}
    >
      {dragging && (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium pointer-events-none bg-cyan-900/40 rounded">
          {t("dropToAttach")}
        </div>
      )}

      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-cyan-400"
      />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="flex items-center gap-1.5 bg-black/50 rounded px-2 py-1 text-xs"
            >
              {f.type.startsWith("image/") ? "🖼" : "📎"} {f.name} ({formatSize(f.size)})
              <button
                onClick={() =>
                  setFiles((prev) => prev.filter((_, j) => j !== i))
                }
                className="opacity-60 hover:opacity-100"
                aria-label={`Remove ${f.name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {err && <div className="text-xs text-red-400 whitespace-pre-wrap">{err}</div>}

      <div className="flex items-center justify-between">
        <div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <button
            onClick={() => fileInput.current?.click()}
            className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            📎 {t("attach")}
          </button>
        </div>
        <button
          onClick={handleSend}
          disabled={busy}
          className="px-4 py-1.5 text-sm rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
        >
          {busy ? t("sending") : buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Format helpers ────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
