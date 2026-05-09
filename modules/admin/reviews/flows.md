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

# Admin · Reviews module — Flows

## Routing

- Route lives at `/reviews` of the admin portal hash router.
- Activated when sidebar item `Review queue` is clicked (anchor `href="#/reviews"`).
- Sidebar badge (`14` in v0.4 prototype) is hard-coded; production must compute from `total` returned by `GET /admin/reviews`.
- Active match: exact `'/reviews'` OR `path.startsWith('/reviews/')`.

## Initial render

1. `AdminApp` resolves `path === '/reviews'` → renders `<AdminReviews/>`.
2. `AdminReviews` reads `A.reviews` directly (no local state in prototype).
3. `useCountUp` (1600ms) animates each StatCard counter on mount.
4. `DataTable` renders all 4 mock rows synchronously in document order (no sort).
5. Production: emit `admin.reviews.viewed` after first paint.

## StatCard interaction

- Cards are **not** clickable in the prototype.
- Production may upgrade them to filter shortcuts: clicking `Sovereignty` would set `stage = 'sovereignty'` (server-side filter via `?stage=` query parameter). If implemented, surface a hover ring and emit a new `admin.reviews.statcard.clicked` event.

## Header action

### Flow 1 — New review

- Click → no-op stub in prototype.
- Production: open a small modal that captures `target` (resource picker), `stage` (radio), `priority` (radio). On submit → POST `/admin/reviews`. New review lands with `assigned='unassigned'` and is appended to the queue without page reload.
- Emit `admin.reviews.action.new_review.clicked`.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Review detail` route ships:

- Row click → `navigate(/reviews/{id})`.
- Detail page surfaces full submission, prior decisions, and `Approve / Reject / Withdraw` buttons.
- Each button on the detail page calls `POST /admin/reviews/{id}/decision` with `decision` and `body` (≥12 chars). On success the SPA returns to `/reviews` and removes the row from the table.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on visibility change AND on push events `review.created`, `review.assigned`, `review.decided` from a tenant-scoped WebSocket.

## Empty / error states

- **No rows** → render the table chrome with one body row text `Queue is empty. Submissions appear here as they arrive.`
- **5xx** → render chrome + body row `Couldn't load reviews. Try again.` and a top banner with `Retry`.
- **401/403** → redirect to admin sign-in / "Insufficient permissions" empty.

## Accessibility

- StatCards expose counters as `role="status"` (live regions).
- Priority pill colour MUST be paired with the priority text (already true in source); screen readers should hear `priority high` / `priority med`.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
