/**
 * @deprecated — superseded by `<EntityGrid rows>` in `@/components/library`.
 *
 * The original FilteredDataTable lived here as a client-paginated wrapper
 * around DataTable. All 5 consumers (the `portals/provider/*Grid.tsx`
 * files) have migrated to `<EntityGrid rows>` which provides the same
 * behaviour plus filters / search / pagination from one library composite.
 *
 * Delete this file outright in a follow-up cleanup PR — kept as a stub
 * here only because the dev-mount in this session couldn't `rm` it.
 */
export {};
