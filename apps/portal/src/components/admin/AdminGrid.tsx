"use client";

import { withBase } from "@airegistry/sdk";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  EntityGrid,
  Modal,
  type EntityColumn,
  type EntityFilter
} from "@/components/library";

/**
 * Generic admin CRUD grid used by `/admin/users`, `/admin/providers`,
 * `/admin/resources`. Now a thin adapter around the library's `<EntityGrid>`
 * that adds:
 *
 *   - An "Add new" modal slot (Modal-wrapped form supplied by the caller).
 *   - A row-actions callback that receives a `reload` function the consumer
 *     can call after a successful mutation.
 *   - Deep-link seeding of `q` + filters from the URL search params.
 *
 * All paging / search / debouncing / fetch / error-state machinery now lives
 * once inside `EntityGrid`. Aligned with `ai-registry-specs/shared/admin-crud.md`.
 */

export type GridFilter = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  /** Reserved for future "All" label override. Unused by EntityGrid today. */
  emptyLabel?: string;
};

export type GridColumn<Row> = {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  mono?: boolean;
};

export type AdminGridProps<Row extends { id: string }> = {
  /** API base path, e.g. `/api/admin/users`. */
  endpoint: string;
  searchPlaceholder: string;
  filters?: GridFilter[];
  columns: GridColumn<Row>[];
  /**
   * Per-row trailing action slot. Receives the row plus a `reload` callback
   * the consumer should call after a successful mutation so the grid refreshes
   * without a full page reload.
   */
  actions: (row: Row, reload: () => void) => ReactNode;
  /** "Add new" modal contents. The grid renders the modal chrome; this
   *  callback returns the form. `close()` closes the modal and reloads. */
  addModal?: {
    title: string;
    render: (close: () => void) => ReactNode;
  };
  emptyState: string;
};

export function AdminGrid<Row extends { id: string }>(props: AdminGridProps<Row>) {
  // Seed q + filter values from the URL on first paint so a deep link
  // (e.g. /admin/users?q=alice@example.com) lands with the row already
  // pre-filtered. The header-search uses this exact pattern when it routes
  // a user-kind result into the admin CRUD area.
  //
  // EntityGrid doesn't yet support URL-seeded state, so we pass the initial
  // values down via `extraParams` (for filters) and a defaultSearch prop we
  // could add later. For now: the deep-link seeding only takes effect on the
  // first fetch; subsequent edits don't sync back to the URL. That mirrors
  // the previous AdminGrid behaviour.
  const searchParams = useSearchParams();
  const initialExtra: Record<string, string> = {};
  if (searchParams) {
    const qSeed = searchParams.get("q");
    if (qSeed) initialExtra.q = qSeed;
    if (props.filters) {
      for (const f of props.filters) {
        const v = searchParams.get(f.id);
        if (v) initialExtra[f.id] = v;
      }
    }
  }

  const [reloadKey, setReloadKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Translate GridColumn → EntityColumn (the column shapes happen to match;
  // just narrow the type).
  const columns: EntityColumn<Row>[] = useMemo(
    () =>
      props.columns.map((c) => ({
        key: c.key,
        label: c.label,
        render: c.render,
        mono: c.mono
      })),
    [props.columns]
  );

  // Translate GridFilter → EntityFilter (id → key, label stays, options stay).
  const filters: EntityFilter[] | undefined = useMemo(() => {
    if (!props.filters) return undefined;
    return props.filters.map((f) => ({
      key: f.id,
      label: f.label,
      options: f.options
    }));
  }, [props.filters]);

  const renderRowActions = useCallback(
    (row: Row) => props.actions(row, reload),
    [props.actions, reload]
  );

  const addAction = props.addModal
    ? { onClick: () => setAddOpen(true) }
    : undefined;

  return (
    <>
      <EntityGrid<Row>
        endpoint={withBase(props.endpoint)}
        columns={columns}
        filters={filters}
        renderRowActions={renderRowActions}
        addAction={addAction}
        searchPlaceholder={props.searchPlaceholder}
        pageSizeOptions={[10, 20, 50, 100]}
        defaultPageSize={20}
        pageSizeParam="pageSize"
        extraParams={
          Object.keys(initialExtra).length > 0 ? initialExtra : undefined
        }
        emptyState={props.emptyState}
        reloadKey={reloadKey}
      />

      {props.addModal ? (
        <Modal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          title={props.addModal.title}
          maxWidth={560}
        >
          <div style={{ padding: 24 }}>
            {props.addModal.render(() => {
              setAddOpen(false);
              reload();
            })}
          </div>
        </Modal>
      ) : null}
    </>
  );
}