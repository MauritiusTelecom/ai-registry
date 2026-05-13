"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/public/Icon";
import { AdminGrid, type GridColumn, type GridFilter } from "./AdminGrid";
import { RowActionMenu, type RowMenuItem } from "./RowActionMenu";
import { withBase } from "@/lib/with-base";

export type ResourceRow = {
  id: string;
  slug: string;
  title: string;
  airId: string | null;
  kindCode: string;
  lifecycleCode: string;
  lifecycleName: string;
  providerSlug: string;
  providerName: string;
  riskCode: string;
  publicVisibility: boolean;
  updatedAt: string;
};

type RefRow = { code: string; name: string };

const LIFECYCLE_COLOUR: Record<string, string> = {
  draft: "var(--text-3)",
  submitted: "var(--secondary)",
  in_review: "var(--secondary)",
  needs_update: "#f59e0b",
  listed: "#10b981",
  suspended: "#ef4444",
  deprecated: "var(--text-3)",
  removed: "var(--text-3)"
};

// Compact icon-only style for the View / Edit inline buttons. Matches the
// height of the kebab trigger so the trio aligns cleanly. `.r-card-action-link`
// defaults to `--text-3` (muted) which is too dim for small icons — bump to
// `--text-2` so the glyphs read clearly in both themes.
const iconBtnStyle = {
  padding: "4px 6px",
  minWidth: 28,
  justifyContent: "center",
  color: "var(--text)"
} as const;

const LIFECYCLE_ICON: Record<string, IconName | undefined> = {
  approve: "check",
  reject: "x",
  suspend: "lock",
  restore: "check",
  deprecate: "flag",
  remove: "trash"
};

const LIFECYCLE_TONE: Record<string, "default" | "danger"> = {
  approve: "default",
  reject: "default",
  suspend: "danger",
  restore: "default",
  deprecate: "default",
  remove: "danger"
};

const ACTION_FROM: Record<string, string[]> = {
  draft: ["approve", "restore", "remove"],
  submitted: ["approve", "reject", "restore", "remove"],
  in_review: ["approve", "reject", "restore", "remove"],
  needs_update: ["approve", "reject", "restore", "remove"],
  listed: ["reject", "suspend", "deprecate", "remove"],
  suspended: ["restore", "remove"],
  deprecated: ["restore", "remove"],
  removed: ["restore"]
};

export function ResourcesAdmin({
  kinds,
  lifecycles,
  providers,
  jurisdictions,
  riskLevels
}: {
  kinds: RefRow[];
  lifecycles: RefRow[];
  providers: { slug: string; displayName: string }[];
  jurisdictions: RefRow[];
  riskLevels: RefRow[];
}) {
  const filters: GridFilter[] = [
    {
      id: "kind",
      label: "Kind",
      options: kinds.map((k) => ({ value: k.code, label: k.name }))
    },
    {
      id: "lifecycle",
      label: "Lifecycle",
      options: lifecycles.map((l) => ({ value: l.code, label: l.name }))
    },
    {
      id: "provider",
      label: "Provider",
      options: providers.map((p) => ({ value: p.slug, label: p.displayName }))
    }
  ];

  const columns: GridColumn<ResourceRow>[] = [
    {
      key: "title",
      label: "Resource",
      render: (row) => (
        <div>
          <Link
            href={
              row.airId
                ? `/registry/${row.slug}`
                : `/admin/resources?provider=${encodeURIComponent(row.providerSlug)}`
            }
            style={{ color: "var(--text)", textDecoration: "none" }}
          >
            {row.title}
          </Link>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              fontFamily: "IBM Plex Mono, monospace"
            }}
          >
            {row.airId ?? `${row.providerSlug}/${row.slug}`}
          </div>
        </div>
      )
    },
    {
      key: "kind",
      label: "Kind",
      render: (row) => <span className="tag">{row.kindCode}</span>
    },
    { key: "provider", label: "Provider", render: (row) => row.providerName },
    {
      key: "lifecycle",
      label: "Lifecycle",
      render: (row) => (
        <span
          style={{
            color: LIFECYCLE_COLOUR[row.lifecycleCode] ?? "var(--text)",
            fontWeight: 500
          }}
        >
          {row.lifecycleName}
        </span>
      )
    },
    { key: "risk", label: "Risk", render: (row) => row.riskCode, mono: true },
    {
      key: "public",
      label: "Public",
      render: (row) =>
        row.publicVisibility ? (
          <span className="tag" style={{ color: "#10b981" }}>
            visible
          </span>
        ) : (
          <span className="tag">hidden</span>
        )
    },
    {
      key: "updated",
      label: "Updated",
      render: (row) => row.updatedAt.slice(0, 10),
      mono: true
    }
  ];

  return (
    <AdminGrid<ResourceRow>
      endpoint="/api/admin/resources"
      searchPlaceholder="Search by title, slug, AIR-ID…"
      filters={filters}
      columns={columns}
      addModal={{
        title: "Add resource",
        render: (close) => (
          <ResourceForm
            kinds={kinds}
            providers={providers}
            jurisdictions={jurisdictions}
            riskLevels={riskLevels}
            onDone={close}
          />
        )
      }}
      emptyState="No resources match this filter."
      actions={(row, reload) => (
        <ResourceRowActions row={row} reload={reload} />
      )}
    />
  );
}

function ResourceRowActions({
  row,
  reload
}: {
  row: ResourceRow;
  reload: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionFor, setActionFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = ACTION_FROM[row.lifecycleCode] ?? [];

  async function doDelete() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(withBase(`/api/admin/resources/${row.id}`), { method: "DELETE" });
      const data = (await res.json()) as { error?: string; detail?: string };
      if (!res.ok) {
        setError(data.error ?? data.detail ?? "Delete failed");
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

  // Inline: View (icon-only, when there is a public detail) + Edit (icon-only).
  // Kebab: every other action (lifecycle transitions + Delete when applicable).
  const menuItems: RowMenuItem[] = [];
  for (const a of allowed) {
    menuItems.push({
      key: a,
      label: a.charAt(0).toUpperCase() + a.slice(1),
      icon: LIFECYCLE_ICON[a],
      tone: LIFECYCLE_TONE[a],
      disabled: busy,
      onSelect: () => setActionFor(a)
    });
  }
  if (!row.airId) {
    menuItems.push({
      key: "delete",
      label: "Delete",
      icon: "trash",
      tone: "danger",
      disabled: busy,
      onSelect: () => setConfirmDelete(true)
    });
  }

  return (
    <>
      {row.airId ? (
        <Link
          href={`/registry/${row.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="r-card-action-link"
          title="View public detail"
          aria-label="View public detail"
          style={iconBtnStyle}
        >
          <Icon name="eye" size={14} />
        </Link>
      ) : null}
      <Link
        href={`/admin/resources/${row.id}/edit`}
        className="r-card-action-link"
        title="Edit"
        aria-label="Edit"
        style={iconBtnStyle}
      >
        <Icon name="edit" size={14} />
      </Link>
      {menuItems.length > 0 ? <RowActionMenu items={menuItems} /> : null}

      {error ? (
        <div className="field-error" style={{ width: "100%", marginTop: 4 }} role="alert">
          {error}
        </div>
      ) : null}

      {actionFor ? (
        <ActionDialog
          row={row}
          action={actionFor}
          onClose={(refreshed) => {
            setActionFor(null);
            if (refreshed) reload();
          }}
        />
      ) : null}

      {confirmDelete ? (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div
            className="glass"
            style={{ maxWidth: 460, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 style={{ margin: 0, marginBottom: 8 }}>Delete resource?</h3>
            <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 18 }}>
              <strong>{row.title}</strong> will be deleted permanently. Delete is refused once
              an AIR-ID has been minted or any review / trust-signal exists - use{" "}
              <strong>Remove</strong> instead to tombstone the row.
            </p>
            {error ? (
              <div className="field-error" style={{ marginBottom: 12 }}>
                {error}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={doDelete}
                disabled={busy}
                style={{ background: "#ef4444", borderColor: "#ef4444" }}
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ActionDialog({
  row,
  action,
  onClose
}: {
  row: ResourceRow;
  action: string;
  onClose: (refreshed: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(withBase(`/api/admin/resources/${row.id}/transition`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }
      onClose(true);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => onClose(false)}>
      <div
        className="glass"
        style={{ maxWidth: 480, padding: 24, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16
          }}
        >
          <h3 style={{ margin: 0, textTransform: "capitalize" }}>
            {action} · {row.title}
          </h3>
          <button
            type="button"
            className="r-card-action-link"
            onClick={() => onClose(false)}
            aria-label="Close"
            style={{ color: "var(--text)" }}
          >
            <Icon name="x" size={12} /> Close
          </button>
        </header>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 14px" }}>
          {action === "approve" ? (
            <>
              Marks this resource as <code>listed</code> and mints the AIR-ID. For full §11
              checklist capture use the proper review path at <code>/admin/reviews</code>.
            </>
          ) : action === "remove" ? (
            <>
              Tombstones the resource (lifecycle <code>removed</code>). Public detail returns
              410 Gone but the AIR-ID stays reserved.
            </>
          ) : (
            <>
              Records reason on the audit log and writes one TrustSignal so the public detail
              page reflects the change.
            </>
          )}
        </p>
        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em" }}>
            REASON
          </span>
          <textarea
            className="auth-input"
            style={{ minHeight: 80, fontFamily: "inherit" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What changed and why?"
          />
        </label>
        {error ? (
          <div className="field-error" role="alert" style={{ marginTop: 12 }}>
            {error}
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onClose(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={busy || reason.trim().length < 4}
          >
            {busy ? "Working…" : action.charAt(0).toUpperCase() + action.slice(1)}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResourceForm({
  kinds,
  providers,
  jurisdictions,
  riskLevels,
  onDone
}: {
  kinds: RefRow[];
  providers: { slug: string; displayName: string }[];
  jurisdictions: RefRow[];
  riskLevels: RefRow[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [kind, setKind] = useState(kinds[0]?.code ?? "");
  const [providerSlug, setProviderSlug] = useState(providers[0]?.slug ?? "");
  const [jurisdictionCode, setJurisdictionCode] = useState(jurisdictions[0]?.code ?? "");
  const [riskCode, setRiskCode] = useState(riskLevels[0]?.code ?? "low");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(withBase("/api/admin/resources"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          shortDescription: shortDescription.trim(),
          resourceTypeCode: kind,
          providerSlug,
          jurisdictionCode,
          riskCode
        })
      });
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      // Close the modal, then jump to the full edit page so the admin can
      // fill in descriptions, URLs, sovereignty evidence, endpoints, tags.
      onDone();
      if (data.id) router.push(`/admin/resources/${data.id}/edit`);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
      <p style={{ color: "var(--text-2)", margin: 0, fontSize: 12 }}>
        Creates a <code>draft</code>. After save you'll be sent to the full edit page
        to capture descriptions, URLs, sovereignty evidence, endpoints, and tags.
      </p>
      <Field label="Title">
        <input
          className="auth-input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slug) {
              const s = e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 80);
              setSlug(s);
            }
          }}
        />
      </Field>
      <Field label="Slug">
        <input
          className="auth-input"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </Field>
      <Field label="Short description">
        <textarea
          className="auth-input"
          style={{ minHeight: 70, fontFamily: "inherit" }}
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
        />
      </Field>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Kind">
          <select
            className="auth-input"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {kinds.map((k) => (
              <option key={k.code} value={k.code}>
                {k.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Provider">
          <select
            className="auth-input"
            value={providerSlug}
            onChange={(e) => setProviderSlug(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.displayName}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Primary jurisdiction">
          <select
            className="auth-input"
            value={jurisdictionCode}
            onChange={(e) => setJurisdictionCode(e.target.value)}
          >
            {jurisdictions.map((j) => (
              <option key={j.code} value={j.code}>
                {j.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Risk">
          <select
            className="auth-input"
            value={riskCode}
            onChange={(e) => setRiskCode(e.target.value)}
          >
            {riskLevels.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={busy}
        >
          {busy ? "Saving…" : "Create & open editor"}
        </button>
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
