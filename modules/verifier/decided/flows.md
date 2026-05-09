<!--
 Copyright 2026 rakesh.khoodeeram

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
-->

# Verifier · Decided module — Flows

## Routing

- Route lives at `/decided` of the verifier portal hash router.
- Activated via sidebar `Decided` (anchor `href="#/decided"`) or command palette.
- Active match: exact `'/decided'` OR `path.startsWith('/decided/')`.

## Initial render

1. App resolves `path === '/decided'` → renders `<VerDecided/>`.
2. VerDecided reads `V.decided` directly (no local state in prototype).
3. DataTable paints synchronously with all 5 mock rows in document order.
4. Production: emit `verifier.decided.viewed` after first paint with `totalCount` and per-decision counters.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Decision detail` drawer ships:

- Row click → drawer (right-anchored, 220ms slide).
- Drawer surfaces:
  - The decision body (≥12 chars from the verifier).
  - The original submission body for context.
  - Cross-link to the audit ledger row (`auditId`).
  - Cross-link to attached eval runs and red-team findings (read-only).
- Decisions are immutable; the drawer has NO action buttons except `Close`.
- Emit `verifier.decided.row.opened`.

## Filter flows (production)

- v0.4 has no filters.
- Production-recommended filter bar above the table:
  - Decision segmented control (`All | approved | rejected | withdrawn | archived`).
  - Verifier email filter (defaults to `me`; toggle to `all` shows the whole collegium).
  - Date range picker (`from` / `to`).
- Default `verifier=me` so each verifier sees their own history first; admins / reviewers may toggle to see the whole collegium.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `review.decided` adds new rows at the top.

## Empty / error states

- **No rows** (a fresh verifier with no closed reviews yet): render the table chrome with one body row text `No decisions yet.`
- **5xx** → render chrome + body row `Couldn't load history.` and a top banner with `Retry`.
- **401/403** → redirect to verifier sign-in / "Insufficient permissions" empty.

## Audit-ledger correspondence

Each row in `/decided` corresponds 1:1 with an immutable audit ledger row:

- `decision === 'approved'` → `review.approve` ledger row.
- `decision === 'rejected'` → `review.reject` ledger row.
- `decision === 'withdrawn'` → `review.withdraw` ledger row.
- `decision === 'archived'` → `review.archive` ledger row + paired `resource.archive` on the target.

Production should surface `auditId` in the detail drawer so verifiers can pivot to the canonical audit record.

## Cross-portal cross-references

- A row here corresponds to a previously-`/queue` row that the same `id` is no longer in.
- Sovereign-side oversight (`modules/sovereign/incidents`) may reference the same review id when the decision triggered an incident escalation.
- Provider-side `/submissions` sees the matching row with `status === 'approved' | 'rejected'`.

## Accessibility

- StatusPill colour MUST be paired with the displayed status word.
- The Verifier column is muted text — production should ensure ≥4.5:1 contrast.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
