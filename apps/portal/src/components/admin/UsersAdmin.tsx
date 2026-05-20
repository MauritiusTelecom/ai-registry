"use client";

import { useState } from "react";
import { Icon, ConfirmDialog, Modal, Button } from "@/components/library";
import { AdminGrid, type GridColumn, type GridFilter } from "./AdminGrid";
import { RowActionMenu, type RowMenuItem } from "./RowActionMenu";
import { StatusPill } from "@/components/portals/StatusPill";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  roleCode: string;
  roleName: string;
  statusCode: string;
  statusName: string;
  emailVerified: boolean;
  providerSlug: string | null;
  providerName: string | null;
  createdAt: string;
};

type RefRow = { code: string; name: string };

// Compact icon-only style for the Edit inline button. Matches the height of
// the kebab trigger so the pair aligns cleanly. `.r-card-action-link` defaults
// to `--text-3` (muted) which is too dim for small icons — bump to `--text-2`
// so the glyphs read clearly in both themes.
const iconBtnStyle = {
  padding: "4px 6px",
  minWidth: 28,
  justifyContent: "center",
  color: "var(--text)"
} as const;

const STATUS_DISPLAY: Record<string, string> = {
  active: "active",
  invited: "experimental",
  suspended: "isolated",
  deactivated: "isolated"
};

export function UsersAdmin({
  roles,
  statuses,
  providers,
  selfId
}: {
  roles: RefRow[];
  statuses: RefRow[];
  providers: { slug: string; displayName: string }[];
  selfId: string;
}) {
  const filters: GridFilter[] = [
    {
      id: "role",
      label: "Role",
      options: roles.map((r) => ({ value: r.code, label: r.name }))
    },
    {
      id: "status",
      label: "Status",
      options: statuses.map((s) => ({ value: s.code, label: s.name }))
    },
    {
      id: "verified",
      label: "Email",
      options: [
        { value: "true", label: "Verified" },
        { value: "false", label: "Pending" }
      ],
      emptyLabel: "All emails"
    }
  ];

  const columns: GridColumn<UserRow>[] = [
    {
      key: "user",
      label: "Operator",
      render: (row) => (
        <div>
          <div style={{ color: "var(--text)" }}>{row.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{row.email}</div>
        </div>
      )
    },
    {
      key: "role",
      label: "Role",
      render: (row) => <span className="tag">{row.roleName}</span>
    },
    {
      key: "provider",
      label: "Provider",
      render: (row) => row.providerName ?? "-"
    },
    {
      key: "verified",
      label: "Email",
      render: (row) =>
        row.emailVerified ? (
          <span className="tag" style={{ color: "#10b981" }}>
            verified
          </span>
        ) : (
          <span className="tag">pending</span>
        )
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusPill status={STATUS_DISPLAY[row.statusCode] ?? "active"} />
      )
    },
    {
      key: "joined",
      label: "Joined",
      render: (row) => row.createdAt.slice(0, 10),
      mono: true
    }
  ];

  return (
    <AdminGrid<UserRow>
      endpoint="/api/admin/users"
      searchPlaceholder="Search by name or email…"
      filters={filters}
      columns={columns}
      addModal={{
        title: "Add user",
        render: (close) => (
          <UserForm
            roles={roles}
            statuses={statuses}
            providers={providers}
            mode="create"
            initial={null}
            onDone={close}
          />
        )
      }}
      emptyState="No users match this filter."
      actions={(row, reload) => (
        <UserRowActions
          row={row}
          roles={roles}
          statuses={statuses}
          providers={providers}
          selfId={selfId}
          reload={reload}
        />
      )}
    />
  );
}

function UserRowActions({
  row,
  roles,
  statuses,
  providers,
  selfId,
  reload
}: {
  row: UserRow;
  roles: RefRow[];
  statuses: RefRow[];
  providers: { slug: string; displayName: string }[];
  selfId: string;
  reload: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Suspend/reactivate confirm dialog state.
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [statusNotify, setStatusNotify] = useState(true);
  const [statusReason, setStatusReason] = useState("");

  const isSelf = row.id === selfId;
  const isSuspended = row.statusCode === "suspended" || row.statusCode === "deactivated";

  async function patch(body: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      const res = await registryFetch(withBase(`/api/admin/users/${row.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return false;
      }
      reload();
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setError(null);
    setBusy(true);
    try {
      const res = await registryFetch(withBase(`/api/admin/users/${row.id}`), { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Delete failed");
        return;
      }
      setConfirmDelete(false);
      reload();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="r-card-action-link"
        onClick={() => setEditing(true)}
        title="Edit"
        aria-label="Edit"
        disabled={busy}
        style={iconBtnStyle}
      >
        <Icon name="edit" size={14} />
      </button>
      <RowActionMenu
        items={[
          {
            key: "toggleSuspend",
            label: isSuspended ? "Reactivate" : "Suspend",
            icon: isSuspended ? "check" : "lock",
            tone: isSuspended ? "default" : "danger",
            disabled: busy || isSelf,
            onSelect: () => {
              setStatusNotify(true);
              setStatusReason("");
              setConfirmStatus(true);
            }
          },
          {
            key: "delete",
            label: "Delete",
            icon: "trash",
            tone: "danger",
            disabled: busy || isSelf,
            onSelect: () => setConfirmDelete(true)
          }
        ] satisfies RowMenuItem[]}
      />

      {error ? (
        <div className="field-error" style={{ width: "100%", marginTop: 4 }} role="alert">
          {error}
        </div>
      ) : null}

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit user"
        maxWidth={560}
      >
        <div style={{ padding: 24 }}>
          <UserForm
            roles={roles}
            statuses={statuses}
            providers={providers}
            mode="edit"
            initial={row}
            onDone={() => {
              setEditing(false);
              reload();
            }}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete user?"
        body={
          <>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14, marginBottom: 12 }}>
              <strong>{row.name}</strong> ({row.email}) will be removed permanently. Audit
              entries they authored remain but become anonymous.
            </p>
            {error ? (
              <div className="field-error" style={{ marginBottom: 4 }}>
                {error}
              </div>
            ) : null}
          </>
        }
        destructive
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={doDelete}
      />

      <ConfirmDialog
        open={confirmStatus}
        title={isSuspended ? "Reactivate user?" : "Suspend user?"}
        body={
          <>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14, marginBottom: 14 }}>
              <strong>{row.name}</strong> ({row.email}) will be marked as{" "}
              <strong>{isSuspended ? "active" : "suspended"}</strong>.
            </p>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                color: statusNotify ? "var(--text-2)" : "var(--text-3)",
                marginBottom: 12,
                cursor: "pointer"
              }}
            >
              <input
                type="checkbox"
                checked={statusNotify}
                onChange={(e) => setStatusNotify(e.target.checked)}
              />
              Email the user about this status change
            </label>
            {statusNotify ? (
              <label style={{ display: "grid", gap: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em" }}>
                  REASON (OPTIONAL, INCLUDED IN EMAIL)
                </span>
                <textarea
                  className="auth-input"
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Why is this status changing?"
                />
              </label>
            ) : null}
            {error ? (
              <div className="field-error" style={{ marginBottom: 4 }}>
                {error}
              </div>
            ) : null}
          </>
        }
        confirmLabel={busy ? "Saving…" : isSuspended ? "Reactivate" : "Suspend"}
        onCancel={() => setConfirmStatus(false)}
        onConfirm={async () => {
          const ok = await patch({
            statusCode: isSuspended ? "active" : "suspended",
            notifyByEmail: statusNotify,
            statusChangeReason:
              statusNotify && statusReason.trim() !== ""
                ? statusReason.trim()
                : undefined
          });
          if (ok) setConfirmStatus(false);
        }}
      />
    </>
  );
}

function UserForm({
  roles,
  statuses,
  providers,
  mode,
  initial,
  onDone
}: {
  roles: RefRow[];
  statuses: RefRow[];
  providers: { slug: string; displayName: string }[];
  mode: "create" | "edit";
  initial: UserRow | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [roleCode, setRoleCode] = useState(initial?.roleCode ?? "provider");
  const [statusCode, setStatusCode] = useState(initial?.statusCode ?? "invited");
  const [providerSlug, setProviderSlug] = useState(initial?.providerSlug ?? "");
  const [sendInvite, setSendInvite] = useState(true);
  // Edit mode: notify the user when their status changes. Default ON; only
  // surfaced in the UI once the operator picks a status different from the
  // current one.
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [statusChangeReason, setStatusChangeReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusWillChange =
    mode === "edit" && !!initial && statusCode !== initial.statusCode;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        roleCode,
        statusCode,
        providerSlug: providerSlug || null
      };
      if (mode === "create") body.sendInvite = sendInvite;
      if (mode === "edit" && statusWillChange) {
        body.notifyByEmail = notifyOnStatusChange;
        if (statusChangeReason.trim() !== "") {
          body.statusChangeReason = statusChangeReason.trim();
        }
      }

      const url =
        mode === "create" ? "/api/admin/users" : `/api/admin/users/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await registryFetch(withBase(url), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      onDone();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14, fontSize: 13 }}>
      <Field label="Name">
        <input
          className="auth-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Email">
        <input
          className="auth-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Role">
        <select
          className="auth-input"
          value={roleCode}
          onChange={(e) => setRoleCode(e.target.value)}
        >
          {roles.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <select
          className="auth-input"
          value={statusCode}
          onChange={(e) => setStatusCode(e.target.value)}
        >
          {statuses.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Provider linkage">
        <select
          className="auth-input"
          value={providerSlug}
          onChange={(e) => setProviderSlug(e.target.value)}
        >
          <option value="">- none -</option>
          {providers.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.displayName}
            </option>
          ))}
        </select>
      </Field>
      {mode === "create" ? (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            color: "var(--text-2)"
          }}
        >
          <input
            type="checkbox"
            checked={sendInvite}
            onChange={(e) => setSendInvite(e.target.checked)}
          />
          Send verification / invite email now
        </label>
      ) : null}
      {statusWillChange ? (
        <div style={{ display: "grid", gap: 8 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              color: notifyOnStatusChange ? "var(--text-2)" : "var(--text-3)",
              cursor: "pointer"
            }}
          >
            <input
              type="checkbox"
              checked={notifyOnStatusChange}
              onChange={(e) => setNotifyOnStatusChange(e.target.checked)}
            />
            Email the user about this status change
          </label>
          {notifyOnStatusChange ? (
            <Field label="Reason (optional, included in email)">
              <textarea
                className="auth-input"
                rows={2}
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder="Why is this status changing? Shown to the user."
              />
            </Field>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button intent="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button intent="primary" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? "Create user" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em" }}>
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  );
}
