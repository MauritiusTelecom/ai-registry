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

# Admin · Providers module — Flows

## Routing

- Route lives at `/providers` of the admin portal hash router.
- Activated when sidebar item `Providers` is clicked (anchor `href="#/providers"`).
- Active match: exact `'/providers'` OR `path.startsWith('/providers/')`.

## Initial render

1. `AdminApp` resolves `path === '/providers'` → renders `<AdminProviders/>`.
2. `useState` initialises `q=''`, `kind='all'`.
3. `filtered` is computed inline on render (no `useMemo` in prototype; production should add memoisation if list grows).
4. PageHeader, StatCard grid, FilterBar, DataTable paint synchronously.
5. StatCard counters animate via `useCountUp` (1600ms ease-out cubic) as cards mount.
6. Production: emit `admin.providers.viewed` after first paint.

## Filter flows

### Flow 1 — Search

- User types in the input. State `q` updates per keystroke.
- Filter recomputes synchronously: `(!q || p.name.toLowerCase().includes(q.toLowerCase()))`.
- Only `name` is searched, not `domain` — production must preserve this to avoid surprising matches.
- The right-aligned chip text re-renders with `${filtered.length} entities`.

### Flow 2 — Kind select

- User picks one of `All kinds | Sovereign | Regional | Private | External`.
- StatCard counters do **not** change (they show the unfiltered totals).
- Table rows reduce to those matching the kind AND the search term.

## StatCard interaction

- StatCards are **not** clickable in the prototype (no `onClick`). Production may upgrade them to filter shortcuts: clicking `Sovereign` would set `kind = 'sovereign'`. If implemented, surface this affordance with a hover ring; emit a new event `admin.providers.statcard.clicked` with the chosen `kind`.

## Header action flows

### Flow 3 — Onboarding queue

- Click → no-op stub in prototype.
- Production: `navigate('/providers/onboarding')` and render the queue board (kanban: docs → contact → sovereignty → ready). Spec for that board is out of scope here.
- Emit `admin.providers.action.onboarding_queue.clicked`.

### Flow 4 — Add provider

- Click → no-op stub in prototype.
- Production: open a creation modal or `navigate('/providers/new')`. On submit → POST `/admin/providers`. New provider lands with `status='review'`, MUST go through onboarding → verification before becoming `verified`.
- Emit `admin.providers.action.add_provider.clicked`.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on visibility change and on `provider.*` audit events from a WebSocket subscription. Counters re-animate only if a count changed.

## Error states

- 401/403 → redirect / "Insufficient permissions" empty.
- 5xx → render the page chrome with a single body row `Couldn't load providers.` and a banner `Retry` button.

## Accessibility

- StatCards expose their counters as `role="status"` (live regions) so screen readers announce changes after refetch.
- Table rows use `role="row"`. Because rows are non-interactive on this page (no `onRowClick`), the cursor stays default and `tabindex` is **not** set to `0`. Production must NOT trap keyboard focus on table rows here.
