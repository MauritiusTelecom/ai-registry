"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, ConfirmDialog, Modal, Button } from "@/components/library";
import { AdminGrid, type GridColumn, type GridFilter } from "./AdminGrid";
import { RowActionMenu, type RowMenuItem } from "./RowActionMenu";
import { StatusPill } from "@/components/portals/StatusPill";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("adminProviders");

  const filters: GridFilter[] = [
    {
      id: "type",
      label: t("filterType"),
      options: types.map((tp) => ({ value: tp.code, label: tp.name }))
    },
    {
      id: "status",
      label: t("filterStatus"),
      options: statuses.map((s) => ({ value: s.code, label: s.name }))
    },
    {
      id: "jurisdiction",
      label: t("filterJurisdiction"),
      options: jurisdictions.map((j) => ({ value: j.code, label: j.name }))
    }
  ];

  const columns: GridColumn<ProviderRow>[] = [
    {
      key: "name",
      label: t("colProvider"),
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
    { key: "type", label: t("colType"), render: (row) => <span className="tag">{row.typeName}</span> },
    {
      key: "jurisdiction",
      label: t("colRegion"),
      render: (row) => row.jurisdictionCode,
      mono: true
    },
    {
      key: "resources",
      label: t("colResources"),
      render: (row) => row.resourceCount,
      mono: true
    },
    { key: "contact", label: t("colContact"), render: (row) => row.contactEmail, mono: true },
    {
      key: "status",
      label: t("colStatus"),
      render: (row) => <StatusPill status={STATUS_DISPLAY[row.statusCode] ?? "active"} />
    }
  ];

  return (
    <AdminGrid<ProviderRow>
      endpoint="/api/admin/providers"
      searchPlaceholder={t("searchPlaceholder")}
      filters={filters}
      columns={columns}
      addModal={{
        title: t("addModalTitle"),
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
      emptyState={t("emptyState")}
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
  const t = useTranslations("adminProviders");
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
        setError(data.error ?? data.detail ?? t("deleteFailed"));
        return;
      }
      setConfirmDelete(false);
      reload();
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link
        href={`/admin/providers/${row.id}`}
        className="r-card-action-link"
        title={t("view")}
        aria-label={t("view")}
        style={iconBtnStyle}
      >
        <Icon name="eye" size={14} />
      </Link>
      <button
        type="button"
        className="r-card-action-link"
        onClick={() => setEditing(true)}
        title={t("edit")}
        aria-label={t("edit")}
        disabled={busy}
        style={iconBtnStyle}
      >
        <Icon name="edit" size={14} />
      </button>
      <RowActionMenu
        items={[
          {
            key: "verify",
            label: t("verifyStatus"),
            icon: "shield",
            onSelect: () => router.push(`/admin/providers/${row.id}`)
          },
          {
            key: "delete",
            label: t("delete"),
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

<Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit provider"
        maxWidth={600}
      >
        <div style={{ padding: 24 }}>
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
      </Modal>

<ConfirmDialog
        open={confirmDelete}
        title="Delete provider?"
        body={
          <>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14, marginBottom: 12 }}>
              <strong>{row.displayName}</strong> ({row.slug}) will be deleted permanently.
              Delete is refused when any resource, user, or audit reference exists - suspend
              the provider instead.
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
  const t = useTranslations("adminProviders");
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
        setError(data.error ?? t("saveFailed"));
        return;
      }
      onDone();
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
      {mode === "create" ? (
        <Field label={t("fieldSlug")} hint={t("slugHint")}>
          <input
            className="auth-input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </Field>
      ) : null}
      <Field label={t("fieldDisplayName")}>
        <input
          className="auth-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Field label={t("fieldType")}>
          <select
            className="auth-input"
            value={typeCode}
            onChange={(e) => setTypeCode(e.target.value)}
          >
            {types.map((tp) => (
              <option key={tp.code} value={tp.code}>
                {tp.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("fieldHomeJurisdiction")}>
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
      <Field label={t("fieldContactEmail")}>
        <input
          className="auth-input"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
      </Field>
      {mode === "create" ? (
        <Field label={t("fieldLegalName")}>
          <input
            className="auth-input"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
          />
        </Field>
      ) : null}
      <Field label={t("fieldWebsite")}>
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
<Button intent="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button intent="primary" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? "Create provider" : "Save"}
        </Button>
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
