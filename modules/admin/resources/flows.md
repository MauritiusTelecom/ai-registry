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

# Admin · Resources module — Flows

Flows describe **observable behaviour** of the prototype `AdminResources` page so production can match motion and interaction feel.

## Routing

- Route lives at `/resources` of the admin portal hash router (`PRouterProvider`).
- Activated when sidebar item `Resources` is clicked (anchor `href="#/resources"`).
- Active match: exact `'/resources'` OR `path.startsWith('/resources/')`.

## Initial render

1. `AdminApp` resolves `path === '/resources'` → renders `<AdminResources/>`.
2. `useState` initialises `q=''`, `kind='all'`, `status='all'`, `row=null`.
3. `useMemo` computes `filtered` (initial pass returns all 15 mock rows).
4. `PageHeader`, `FilterBar`, `DataTable` paint synchronously.
5. `ResourceDrawer` does not mount until a row is clicked.
6. Production: emit `admin.resources.viewed` after first paint.

## Filter flows

### Flow 1 — Search

- User types in the search input. State `q` updates per keystroke.
- `filtered` recomputes via `useMemo`. No debounce in prototype.
- **Production recommendation:** debounce 250ms on `q` to avoid network thrash; emit `admin.resources.filtered` once per debounce.
- Counter `${filtered.length} of ${total}` updates in the FilterBar right slot.

### Flow 2 — Kind select

- User picks one of `All kinds | MCP servers | Agents | Models | Tools`.
- `kind` state updates immediately; `filtered` recomputes.
- Combined with `q` and `status` (logical AND).

### Flow 3 — Status select

- User picks one of `Any status | Verified | In review | Experimental | Isolated | Archived`.
- `status` state updates immediately; `filtered` recomputes.

### Flow 4 — Empty result

- If `filtered.length === 0`, `DataTable` renders the column header row plus a single full-span body row. Prototype default body line: `No rows.` (provided by shell).
- Production-recommended replacement when filters are non-default: `No resources match these filters. Clear filters or check the search term.`

## Row interaction

### Flow 5 — Row click → drawer

- Click on any `<tr>` in the DataTable triggers `onRowClick(row)` → `setRow(row)`.
- `<ResourceDrawer row={row}/>` mounts; backdrop fades in 220ms; panel slides in from the right 220ms ease-out.
- Body scroll on the parent is **not locked** in the prototype; production should lock body scroll while the drawer is open.
- Emit `admin.resources.row.clicked` and `admin.resources.drawer.opened`.

### Flow 6 — Drawer close

- Triggered by:
  - Clicking the backdrop
  - Clicking the X button in the drawer header
  - Pressing `Esc`
- `setRow(null)` → drawer panel and backdrop unmount with reverse 220ms transition.
- Emit `admin.resources.drawer.closed`.

## Drawer action flows (stubs in prototype)

Each action emits its respective `*.clicked` telemetry and triggers a backend call (see `api.yaml`). After success:

- `Re-verify` → POST `/admin/resources/{id}/reverify` → toast `Re-verification queued`. Drawer remains open; status pill does NOT change until the lifecycle worker reports back via WebSocket / poll.
- `Edit` → opens an inline form replacing the body grid (production); on save → PATCH and refresh row in `filtered`.
- `Raise flag` → opens a small modal capturing kind, severity, body. On submit → POST `/admin/resources/{id}/flags`. On success → toast `Flag raised`; drawer remains open.
- `Isolate` → confirmation dialog (`Are you sure?`); on confirm → POST `/admin/resources/{id}/isolate` with `reason` (≥12 chars). On success → status pill flips to `isolated` and row updates in `filtered`.

## Header action flows

### Flow 7 — Export CSV

- Click → GET `/admin/resources/export.csv` with current filter query string.
- Browser receives `Content-Disposition: attachment` and downloads.
- Emit `admin.resources.action.export_csv.clicked`.

### Flow 8 — New resource

- Click → navigate to a creation flow.
- Spec for the form lives outside this module (recommended path: `/resources/new`); for v0.4 this is a no-op stub.
- Emit `admin.resources.action.new_resource.clicked`.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch list every 60s when document is visible, or on `audit` event (e.g. resource status change pushed via WebSocket). Drawer should re-render if the open row's data changes upstream.

## Error states

- 401/403 from `/admin/resources` → redirect to admin sign-in / "Insufficient permissions" empty.
- 5xx → render the table chrome with a single body row `Couldn't load resources. Try again.` and a header banner with `Retry` button.

## Accessibility

- Table rows use `role="row"`, `tabindex="0"`. `Enter` opens the drawer just like a click.
- Drawer is rendered as `role="dialog"`, `aria-modal="true"`, with `aria-labelledby` pointing at the title.
- Risk cell colour MUST be paired with text. The prototype uses uppercase letter text (`HIGH/MED/LOW`); production should retain the text and add `aria-label` reading the severity word.
