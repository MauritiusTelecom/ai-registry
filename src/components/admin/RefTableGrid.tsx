"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  EntityGrid,
  ConfirmDialog,
  type EntityColumn,
  type EntityFilter,
  type EntityRowAction
} from "@/components/library";
import type { RefTableConfig } from "@/lib/admin/reference-tables";
import { withBase } from "@/lib/with-base";

/**
 * CRUD grid for one reference table. Now a thin adapter that translates a
 * `RefTableConfig` into `<EntityGrid>` props and adds the delete-confirm
 * flow. All paging / search / filter / fetch logic lives in `EntityGrid`.
 *
 * The endpoint `/api/admin/ref/[table]` keeps its existing `pageSize` URL
 * param convention (rather than EntityGrid's default `limit`) so no server
 * changes are required.
 */

type Row = Record<string, unknown> & { id: string };

export function RefTableGrid({ config }: { config: RefTableConfig }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Translate `config.gridColumns` (string keys) into EntityGrid columns
  // by looking up the matching field label.
  const columns: EntityColumn<Row>[] = useMemo(
    () =>
      config.gridColumns.map((key) => ({
        key,
        label: labelFor(config, key),
        mono: key === "code",
        render: (row) => renderCell(row[key])
      })),
    [config]
  );

  // The grid surfaces an `active` filter when the table has the column.
  const filters: EntityFilter[] | undefined = useMemo(() => {
    if (!config.hasActive) return undefined;
    return [
      {
        key: "active",
        label: "Active",
        options: [
          { value: "true", label: "Active only" },
          { value: "false", label: "Inactive only" }
        ]
      }
    ];
  }, [config.hasActive]);

  const onDelete = useCallback(async () => {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        withBase(`/api/admin/ref/${config.id}/${deleting.id}`),
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          detail?: string;
          title?: string;
        };
        throw new Error(body.detail ?? body.title ?? `HTTP ${res.status}`);
      }
      setDeleting(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [deleting, config.id]);

  const rowActions: EntityRowAction<Row>[] = useMemo(
    () => [
      {
        id: "view",
        label: "",
        icon: "eye",
        onSelect: (row) => router.push(`/admin/ref/${config.id}/${row.id}`)
      },
      {
        id: "edit",
        label: "",
        icon: "edit",
        onSelect: (row) => router.push(`/admin/ref/${config.id}/${row.id}/edit`)
      },
      {
        id: "delete",
        label: "",
        icon: "trash",
        destructive: true,
        onSelect: (row) => setDeleting(row)
      }
    ],
    [router, config.id]
  );

  return (
    <>
      {error ? (
        <div className="field-error" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <EntityGrid<Row>
        endpoint={withBase(`/api/admin/ref/${config.id}`)}
        columns={columns}
        filters={filters}
        rowActions={rowActions}
        addAction={{ href: `/admin/ref/${config.id}/new` }}
        searchPlaceholder="Search…"
        pageSizeOptions={[10, 20, 50, 100]}
        defaultPageSize={20}
        pageSizeParam="pageSize"
        emptyState="No rows match the current filter."
        reloadKey={reloadKey}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete row?"
        body={
          <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
            This permanently removes the entry from <code>{config.label}</code>. If
            other rows reference it, deletion is blocked - toggle <code>active</code>
            to false instead.
          </p>
        }
        destructive
        confirmLabel={busy ? "Deleting…" : "Delete"}
        onCancel={() => setDeleting(null)}
        onConfirm={onDelete}
      />
    </>
  );
}

function renderCell(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span style={{ color: "var(--text-3)" }}>-</span>;
  }
  if (typeof value === "boolean") {
    return value ? (
      <span className="tag" style={{ color: "#10b981" }}>active</span>
    ) : (
      <span className="tag">inactive</span>
    );
  }
  if (typeof value === "string" && value.length > 80) {
    return value.slice(0, 77) + "…";
  }
  return String(value);
}

function labelFor(config: RefTableConfig, key: string): string {
  const f = config.fields.find((x) => x.key === key);
  return f?.label ?? key;
}
