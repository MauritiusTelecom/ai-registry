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

# Verifier · Queue module — Flows

## Routing

- Route lives at `/queue` of the verifier portal hash router.
- Activated via:
  - Sidebar `Open reviews` (anchor `href="#/queue"`).
  - Dashboard's `Open next in queue` primary button.
  - Dashboard's `See all` link in the Top of queue card.
  - Command palette `Open next in queue` action.
- Sidebar badge (`5` in v0.4) reflects the row count. Production must compute live.
- Active match: exact `'/queue'` OR `path.startsWith('/queue/')`.

## Initial render

1. App resolves `path === '/queue'` → renders `<VerQueue/>`.
2. VerQueue reads `V.queue` directly (no local state in prototype).
3. DataTable paints synchronously with all 5 mock rows in document order.
4. Production: emit `verifier.queue.viewed` after first paint with `totalCount`, `highPriority` (count of `priority === 'high'`), and `slaBreached` (count of `parseInt(age) > 4`).

## Row interaction (production)

The prototype DataTable passes `onRowClick={() => {}}` (no-op stub). Once the decision drawer ships:

- Row click → drawer (right-anchored, 220ms slide).
- Drawer surfaces:
  - The full submission body (sovereignty, evaluation, safety details from `/verifier/queue/{id}`).
  - Attached eval run ids (cross-link to `/runs?run=…`).
  - Attached red-team finding ids (cross-link to `/redteam?id=…`).
  - Decision controls: `Approve` (primary), `Reject` (danger), `Withdraw` (ghost), with a body field requiring ≥12 chars.
- On submit:
  - POST `/verifier/queue/{id}/decision` with `decision` and `body`.
  - On 200: drawer closes, row drops out of the queue, sidebar badge decrements, dashboard StatCards update (via WebSocket push).
  - On 400/422: keep the drawer open with field errors.
- Emit `verifier.queue.row.opened` on click; `verifier.queue.review.decided` on success.

## Filter flows (production)

- v0.4 has no filters.
- Production-recommended filter bar above the table with:
  - Stage segmented control (`All | sovereignty | evaluation | safety`).
  - Priority segmented control (`All | high | med | low`).
  - Free-text search bound to `?q=`.
  - Provider autocomplete bound to `?provider=`.
- Each change refetches with the new query params.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `review.queued`, `review.assigned`, `review.decided`, `review.priority_changed`. The list re-renders on each event with a subtle highlight on the changed row.

## Empty / error states

- **Empty queue**: render the table chrome with one body row text `Queue is clear. Nothing to review.`
- **5xx**: render chrome + body row `Couldn't load queue.` and a top banner with `Retry`.
- **401/403**: redirect to verifier sign-in / "Insufficient permissions" empty.

## SLA awareness

- The dashboard preview colour-codes `Age` red when `parseInt(age) > 4`. This page does NOT colour-code in v0.4 source.
- Production-recommended: apply the same colour rule on this page for consistency. Threshold remains `> 4` days.
- Production must also surface a banner at the top when **any** row is SLA-breached: `${n} review(s) breached the 4-day SLA.`

## Cross-portal cross-references

- Each `id` here corresponds to an `id` in admin's `/reviews` (`modules/admin/reviews`). Sovereign `/incidents` and provider `/submissions` may reference the same id depending on how the review was raised.
- Decision history (after closing) lives at `/decided` (`modules/verifier/decided`).

## Accessibility

- Priority pill colour MUST be paired with the priority word (already true in source).
- The Target stack (strong over meta) provides both the slug and `${kind} · ${provider}` context — production should ensure tab order traverses cleanly.
- Table rows are non-interactive in v0.4 (the no-op stub doesn't trigger anything); do NOT set `tabindex="0"` until the decision drawer ships.
