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

# Provider · Submissions module — Flows

## Routing

- Route lives at `/submissions` of the provider portal hash router.
- Activated when sidebar item `Submissions` is clicked, when the dashboard's `Open submissions` card right link `All` is clicked, or via command palette.
- Sidebar badge (`2` in v0.4 prototype) reflects `count(status IN ('pending','review'))`. Production must compute from the live counters on the list response.
- Active match: exact `'/submissions'` OR `path.startsWith('/submissions/')`.

## Initial render

1. `App` resolves `path === '/submissions'` → renders `<ProvSubmissions/>`.
2. `ProvSubmissions` reads `P.subs` directly (no local state in prototype).
3. `DataTable` paints synchronously with all 3 mock rows in document order.
4. Production: emit `provider.submissions.viewed` after first paint, including `openCount`.

## Status mapping is display-only

The prototype renders the StatusPill via inline ternaries in the column renderer. Production must NOT persist the mapped visual; the canonical enum lives on `Submission.status` and reviewers / dashboards consume it directly.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Submission detail` route ships:

- Row click → `navigate(/submissions/{id})`.
- Detail page surfaces:
  - The submission header (id, target, current stage, submitted date).
  - Decision history: ordered list of reviewer comments (date, reviewer email, decision, body).
  - Cross-link to the resource detail (`/resources/{resourceId}`).
  - Actions:
    - `Withdraw` (only if `status IN ('pending', 'review')`): opens confirmation dialog requiring `reason ≥12 chars`; POSTs `/provider/submissions/{id}/withdraw`. On success the row updates with `status === 'withdrawn'` and `age === 'closed'`.
    - `Resubmit` (only if `status IN ('rejected', 'withdrawn')`): navigates to `/publish` with the slug + version pre-filled and the prior decision body referenced.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to provider-scoped WebSocket events: `submission.created`, `submission.assigned`, `submission.decided`, `submission.stage_advanced`.
  - On a `pending → review → approved` progression, the SPA can show a subtle row highlight; sidebar badge re-computes.

## Empty / error states

- **No rows** (a brand-new provider): render the table chrome with one body row text `No submissions yet. Publish a resource to get started.` plus a CTA `Publish resource` linking to `#/publish`.
- **5xx** → render chrome + body row `Couldn't load submissions.` and a top banner with `Retry`.
- **401/403** → redirect to provider sign-in / "Insufficient permissions" empty.

## Edge cases

- **Submission whose target resource was deleted** — surface the row with the original `target` string but production should suffix `(deleted)` so reviewers and providers see the historical record.
- **Submission whose reviewer left the org** — the decision history retains the reviewer's email at decision time even if their account is later revoked; this is a property of the audit ledger, not this view.
- **Two submissions for the same target with overlapping stages** — production must order rows by `submitted` desc; the same target can appear twice if a prior submission was rejected and then resubmitted.

## Accessibility

- Stage tag colour is uniform; no colour cues to convey meaning.
- StatusPill MUST pair colour with the displayed status word (always true in source).
- The sentinel `closed` in the `age` column must read accessibly; production should add `aria-label="closed (terminal)"` on cells where the parent row's `status` is terminal.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
