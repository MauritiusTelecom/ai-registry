"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@airegistry/ui-kit";
import { AdminGrid, type GridColumn, type GridFilter } from "./AdminGrid";
import { RowActionMenu, type RowMenuItem } from "./RowActionMenu";
import { StatusPill } from "@/components/portals/StatusPill";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

export type ProviderRow = {
  id: string;
  slug: string;
  displayName: string;
  typeCode: string;
  typeName: string;
  statusCode: string;
  statusName: string;
  jurisdictionCode: string;
  contactEmail: string;
  websiteUrl: string | null;
  resourceCount: number;
  createdAt: string;
};

type RefRow = { code: string; name: string };

const STATUS_DISPLAY: Record<string, string> = {
  unverified: "experimental",
  verified: "verified",
  official_provider: "trusted",
  suspended: "isolated"
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

export function ProvidersAdmin({
  types,
  statuses,
  jurisdictions
}: {
  types: RefRow[];
  statuses: RefRow[];
  jurisdictions: RefRow[];
}) {
  const filters: GridFilter[] = [
    {
      id: "type",
      label: "Type",
      options: types.map((t) => ({ value: t.code, label: t.name }))
    },
    {
      id: "status",
      label: "Status",
      options: statuses.map((s) => ({ value: s.code, label: s.name }))
    },
    {
      id: "jurisdiction",
      label: "Jurisdiction",
      options: jurisdictions.map((j) => ({ value: j.code, label: j.name }))
    }
  ];

  const columns: GridColumn<ProviderRow>[] = [
    {
      key: "name",
      label: "Provider",
      render: (row) => (
        <Link
          href={`/admin/providers/${row.id}`}
          style={{ color: "var(--text)", textDecoration: "none" }}
        >
          <div>
            <div>{row.displayName}</div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-3)",
                fontFamily: "IBM Plex Mono, monospace"
              }}
            >
              {row.slug}
            </div>
          </div>
        </Link>
      )
    },
    { key: "type", label: "Type", render: (row) => <span className="tag">{row.typeName}</span> },
    {
      key: "jurisdiction",
      label: "Region",
      render: (row) => row.jurisdictionCode,
      mono: true
    },
    {
      key: "resources",
      label: "Resources",
      render: (row) => row.resourceCount,
      mono: true
    },
    { key: "contact", label: "Contact", render: (row) => row.contactEmail, mono: true },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill status={STATUS_DISPLAY[row.statusCode] ?? "active"} />
    }
  ];

  return (
    <AdminGrid<ProviderRow>
      endpoint="/api/admin/providers"
      searchPlaceholder="Search by slug, name, contact…"
      filters={filters}
      columns={columns}
      addModal={{
        title: "Add provider",
        render: (close) => (
          <ProviderForm
            types={types}
            jurisdictions={jurisdictions}
            mode="create"
            initial={null}
            onDone={close}
          />
        )
      }}
      emptyState="No providers match this filter."
      actions={(row, reload) => (
        <ProviderRowActions
          row={row}
          types={types}
          jurisdictions={jurisdictions}
          reload={reload}
        />
      )}
    />
  );
}

function ProviderRowActions({
  row,
  types,
  jurisdictions,
  reload
}: {
  row: ProviderRow;
  types: RefRow[];
  jurisdictions: RefRow[];
  reload: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doDelete() {
    setError(null);
    setBusy(true);
    try {
      const res = await registryFetch(withBase(`/api/admin/providers/${row.id}`), { method: "DELETE" });
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

  return (
    <>
      <Link
        href={`/admin/providers/${row.id}`}
        className="r-card-action-link"
        title="View"
        aria-label="View"
        style={iconBtnStyle}
      >
        <Icon name="eye" size={14} />
      </Link>
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
            key: "verify",
            label: "Verify status",
            icon: "shield",
            onSelect: () => router.push(`/admin/providers/${row.id}`)
          },
          {
            key: "delete",
            label: "Delete",
            icon: "trash",
            tone: "danger",
            disabled: busy,
            onSelect: () => setConfirmDelete(true)
          }
        ] satisfies RowMenuItem[]}
      />

      {error ? (
        <div className="field-error" style={{ width: "100%", marginTop: 4 }} role="alert">
          {error}
        </div>
      ) : null}

      {editing ? (
        <div className="modal-backdrop" onClick={() => setEditing(false)}>
          <div
            className="glass"
            style={{ maxWidth: 600, padding: 24, width: "100%" }}
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
              <h3 style={{ margin: 0 }}>Edit provider</h3>
              <button
                type="button"
                className="r-card-action-link"
                onClick={() => setEditing(false)}
                aria-label="Close"
                style={{ color: "var(--text)" }}
              >
                <Icon name="x" size={12} /> Close
              </button>
            </header>
            <ProviderForm
              types={types}
              jurisdictions={jurisdictions}
              mode="edit"
              initial={row}
              onDone={() => {
                setEditing(false);
                reload();
              }}
            />
          </div>
        </div>
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
            <h3 style={{ margin: 0, marginBottom: 8 }}>Delete provider?</h3>
            <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 18 }}>
              <strong>{row.displayName}</strong> ({row.slug}) will be deleted permanently.
              Delete is refused when any resource, user, or audit reference exists - suspend
              the provider instead.
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

function ProviderForm({
  types,
  jurisdictions,
  mode,
  initial,
  onDone
}: {
  types: RefRow[];
  jurisdictions: RefRow[];
  mode: "create" | "edit";
  initial: ProviderRow | null;
  onDone: () => void;
}) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [typeCode, setTypeCode] = useState(initial?.typeCode ?? types[0]?.code ?? "");
  const [jurisdictionCode, setJurisdictionCode] = useState(
    initial?.jurisdictionCode ?? jurisdictions[0]?.code ?? ""
  );
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [legalName, setLegalName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        displayName: displayName.trim(),
        typeCode,
        jurisdictionCode,
        contactEmail: contactEmail.trim()
      };
      if (legalName.trim()) body.legalName = legalName.trim();
      if (websiteUrl.trim()) body.websiteUrl = websiteUrl.trim();
      else if (mode === "edit") body.websiteUrl = null;
      if (mode === "create") body.slug = slug.trim();

      const res = await registryFetch(
        withBase(
          mode === "create"
            ? "/api/admin/providers"
            : `/api/admin/providers/${initial!.id}`
        ),
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }
      );
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
    <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
      {mode === "create" ? (
        <Field label="Slug" hint="Lowercase, hyphens. Cannot be changed later.">
          <input
            className="auth-input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </Field>
      ) : null}
      <Field label="Display name">
        <input
          className="auth-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Type">
          <select
            className="auth-input"
            value={typeCode}
            onChange={(e) => setTypeCode(e.target.value)}
          >
            {types.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Home jurisdiction">
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
      </div>
      <Field label="Contact email">
        <input
          className="auth-input"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
      </Field>
      {mode === "create" ? (
        <Field label="Legal name (optional)">
          <input
            className="auth-input"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
          />
        </Field>
      ) : null}
      <Field label="Website (optional)">
        <input
          className="auth-input"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://example.org"
        />
      </Field>

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
          {busy ? "Saving…" : mode === "create" ? "Create provider" : "Save"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em" }}>
        {label.toUpperCase()}
      </span>
      {children}
      {hint ? (
        <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{hint}</span>
      ) : null}
    </label>
  );
}
