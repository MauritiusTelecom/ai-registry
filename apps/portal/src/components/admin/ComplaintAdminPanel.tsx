"use client";

import { withBase } from "@airegistry/sdk";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/library";
import { registryFetch } from "@airegistry/ui-kit";
import { useTranslations } from "next-intl";

type StatusOption = { id: string; code: string; name: string };
type AdminUser = { id: string; name: string; email: string };

type Props = {
  complaintId: string;
  currentStatusCode: string;
  currentStatusId: string;
  statusOptions: StatusOption[];
  assignedToId: string | null;
  adminUsers: AdminUser[];
  complainantEmail: string | null;
  resolutionSummary: string | null;
};

/**
 * Right-rail admin panel for a single complaint. Three independent forms:
 *
 *   1. Reply by email - only available when complainantEmail is set.
 *   2. Update status + (optional) reassign + (optional) resolution summary.
 *      The same endpoint accepts partial updates so each control is a no-op
 *      unless the operator changes it.
 *   3. Delete (destructive, double-confirm).
 *
 * All requests go through /api/admin/complaints/:id/... which audit-logs
 * every mutation.
 */
export function ComplaintAdminPanel(props: Props) {
  return (
    <div style={{ display: "grid", gap: 18, position: "sticky", top: 88 }}>
      <ReplyCard complaintId={props.complaintId} complainantEmail={props.complainantEmail} />
      <ManageCard
        complaintId={props.complaintId}
        currentStatusId={props.currentStatusId}
        statusOptions={props.statusOptions}
        assignedToId={props.assignedToId}
        adminUsers={props.adminUsers}
        resolutionSummary={props.resolutionSummary}
      />
      <DeleteCard complaintId={props.complaintId} />
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
  complaintId,
  complainantEmail
}: {
  complaintId: string;
  complainantEmail: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("adminComplaint");
  const [subject, setSubject] = useState(t("defaultSubject"));
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  if (!complainantEmail) {
    return (
      <Shell title={t("replyTitle")} subtitle={t("noEmailProvided")}>
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
          {t("anonymousCannotReply")}
        </p>
      </Shell>
    );
  }

  async function send() {
    setMsg(null);
    if (body.trim().length < 4) {
      setMsg({ kind: "err", text: t("messageBodyRequired") });
      return;
    }
    setBusy(true);
    try {
      const res = await registryFetch(withBase(`/api/admin/complaints/${complaintId}/reply`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: body.trim() })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? t("sendFailed") });
        return;
      }
      setMsg({ kind: "ok", text: t("replySent") });
      setBody("");
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: t("networkError") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title={t("replyTitle")} subtitle={`To: ${complainantEmail}`}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t("labelSubject")}</span>
        <input
          className="glass"
          style={{ padding: 8, borderRadius: 8, fontSize: 13 }}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t("labelMessage")}</span>
        <textarea
          className="glass"
          rows={6}
          style={{ padding: 10, borderRadius: 8, fontSize: 13 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("placeholderReply")}
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

function ManageCard({
  complaintId,
  currentStatusId,
  statusOptions,
  assignedToId,
  adminUsers,
  resolutionSummary
}: {
  complaintId: string;
  currentStatusId: string;
  statusOptions: StatusOption[];
  assignedToId: string | null;
  adminUsers: AdminUser[];
  resolutionSummary: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("adminComplaint");
  const [statusId, setStatusId] = useState(currentStatusId);
  const [assignee, setAssignee] = useState(assignedToId ?? "");
  const [summary, setSummary] = useState(resolutionSummary ?? "");
  // Email-on-assign toggle. Default ON, per spec. Only meaningful when the
  // assignee actually changes — but rather than disable the checkbox in that
  // case (which would feel jumpy) we just send it on every save and the
  // server treats it as a no-op when nothing changed.
  const [notifyAssignee, setNotifyAssignee] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const selectedStatus = statusOptions.find((s) => s.id === statusId);
  const isResolving =
    selectedStatus?.code === "resolved" || selectedStatus?.code === "rejected";
  const assignmentWillChange = (assignee || null) !== (assignedToId ?? null);
  const willNotifyOnSave = assignmentWillChange && !!assignee && notifyAssignee;

  async function save() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await registryFetch(withBase(`/api/admin/complaints/${complaintId}/update`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusId,
          assignedToId: assignee || null,
          resolutionSummary: summary.trim() || null,
          notifyAssignee
        })
      });
      const data = (await res.json()) as {
        error?: string;
        autoBumped?: boolean;
        emailNotified?: boolean;
      };
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? t("updateFailed") });
        return;
      }
      const parts: string[] = [t("saved")];
      if (data.autoBumped) parts.push(t("statusMovedToInvestigating"));
      if (data.emailNotified) parts.push(t("assigneeNotifiedByEmail"));
      setMsg({ kind: "ok", text: parts.join(" · ") });
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: t("networkError") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title={t("manageTitle")}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t("labelStatus")}</span>
        <select
          className="auth-input p-select"
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
        >
          {statusOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t("labelAssignedTo")}</span>
        <select
          className="auth-input p-select"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        >
          <option value="">{t("unassigned")}</option>
          {adminUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: assignmentWillChange && assignee
              ? "var(--text-2)"
              : "var(--text-3)",
            marginTop: 2,
            cursor: "pointer"
          }}
        >
          <input
            type="checkbox"
            checked={notifyAssignee}
            onChange={(e) => setNotifyAssignee(e.target.checked)}
            style={{ accentColor: "var(--primary)" }}
          />
          <span>
            {t("emailAssigneeOnChange")}
            {willNotifyOnSave ? (
              <span style={{ color: "var(--text)", marginLeft: 6 }}>{t("willSend")}</span>
            ) : null}
          </span>
        </label>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
          {t("labelResolutionSummary")} {isResolving ? <em style={{ color: "var(--text-2)" }}>{t("recommended")}</em> : null}
        </span>
        <textarea
          className="glass"
          rows={4}
          style={{ padding: 10, borderRadius: 8, fontSize: 13 }}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={t("placeholderOutcome")}
        />
      </label>
      {msg ? (
        <p style={{ color: msg.kind === "ok" ? "#22c55e" : "#f87171", fontSize: 12, margin: 0 }}>
          {msg.text}
        </p>
      ) : null}
<Button intent="primary" disabled={busy} onClick={() => void save()}>
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </Shell>
  );
}

function DeleteCard({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const t = useTranslations("adminComplaint");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doDelete() {
    setErr(null);
    setBusy(true);
    try {
      const res = await registryFetch(withBase(`/api/admin/complaints/${complaintId}`), {
        method: "DELETE"
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? t("deleteFailed"));
        setBusy(false);
        return;
      }
      router.push("/admin/complaints");
      router.refresh();
    } catch {
      setErr(t("networkError"));
      setBusy(false);
    }
  }

  return (
    <Shell title={t("dangerZone")}>
      {!confirming ? (
        <button
          type="button"
          className="btn"
          style={{ color: "#f87171", borderColor: "#f87171" }}
          onClick={() => setConfirming(true)}
        >
          {t("deleteComplaint")}
        </button>
      ) : (
        <>
          <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0 }}>
            {t("deleteConfirmation")}
          </p>
          {err ? (
            <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{err}</p>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: "#f87171", color: "#fff", borderColor: "#f87171" }}
              disabled={busy}
              onClick={() => void doDelete()}
            >
              {busy ? t("deleting") : t("confirmDelete")}
            </button>
          </div>
        </>
      )}
    </Shell>
  );
}
// s