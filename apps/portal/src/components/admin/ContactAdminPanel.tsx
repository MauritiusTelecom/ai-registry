"use client";

import { withBase } from "@airegistry/sdk";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/library";
import { registryFetch } from "@airegistry/ui-kit";

type Props = {
  contactId: string;
  recipientEmail: string;
  recipientName: string;
  topic: string;
};

/**
 * Right-rail admin panel for a single contact message. Two actions:
 *
 *   1. Reply by email - hits POST /api/admin/contacts/:id/reply.
 *   2. Delete (destructive, double-confirm) - DELETE /api/admin/contacts/:id.
 */
export function ContactAdminPanel({
  contactId,
  recipientEmail,
  recipientName,
  topic
}: Props) {
  return (
    <div style={{ display: "grid", gap: 18, position: "sticky", top: 88 }}>
      <ReplyCard
        contactId={contactId}
        recipientEmail={recipientEmail}
        recipientName={recipientName}
        topic={topic}
      />
      <DeleteCard contactId={contactId} />
    </div>
  );
}

function Shell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 20px"
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-3)",
          marginBottom: subtitle ? 4 : 12
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>{subtitle}</div>
      ) : null}
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
    </div>
  );
}

function ReplyCard({
  contactId,
  recipientEmail,
  recipientName,
  topic
}: {
  contactId: string;
  recipientEmail: string;
  recipientName: string;
  topic: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(`Re: ${topic}`);
  const [body, setBody] = useState(`Hi ${recipientName},\n\n`);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function send() {
    setMsg(null);
    if (body.trim().length < 4) {
      setMsg({ kind: "err", text: "Message body is required" });
      return;
    }
    setBusy(true);
    try {
      const res = await registryFetch(withBase(`/api/admin/contacts/${contactId}/reply`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: body.trim() })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "Send failed" });
        return;
      }
      setMsg({ kind: "ok", text: "Reply sent" });
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Reply" subtitle={`To: ${recipientEmail}`}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>Subject</span>
        <input
          className="glass"
          style={{ padding: 8, borderRadius: 8, fontSize: 13 }}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>Message</span>
        <textarea
          className="glass"
          rows={8}
          style={{ padding: 10, borderRadius: 8, fontSize: 13 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      {msg ? (
        <p style={{ color: msg.kind === "ok" ? "#22c55e" : "#f87171", fontSize: 12, margin: 0 }}>
          {msg.text}
        </p>
      ) : null}
      <Button intent="primary" disabled={busy} onClick={() => void send()}>
        {busy ? "Sending…" : "Send reply"}
      </Button>
    </Shell>
  );
}

function DeleteCard({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doDelete() {
    setErr(null);
    setBusy(true);
    try {
      const res = await registryFetch(withBase(`/api/admin/contacts/${contactId}`), {
        method: "DELETE"
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Delete failed");
        setBusy(false);
        return;
      }
      router.push("/admin/contacts");
      router.refresh();
    } catch {
      setErr("Network error");
      setBusy(false);
    }
  }

  return (
    <Shell title="Danger zone">
      {!confirming ? (
        <button
          type="button"
          className="btn"
          style={{ color: "#f87171", borderColor: "#f87171" }}
          onClick={() => setConfirming(true)}
        >
          Delete message
        </button>
      ) : (
        <>
          <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0 }}>
            This permanently removes the contact message. The audit log retains a record
            of the deletion.
          </p>
          {err ? <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{err}</p> : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: "#f87171", color: "#fff", borderColor: "#f87171" }}
              disabled={busy}
              onClick={() => void doDelete()}
            >
              {busy ? "Deleting…" : "Confirm delete"}
            </button>
          </div>
        </>
      )}
    </Shell>
  );
}
// safe pa