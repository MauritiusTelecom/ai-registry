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

# Verifier · Dashboard module — Flows

## Routing (hash, scoped to verifier portal)

- HTML entry: `portals/verifier.html`. The verifier portal owns its own hash router (`PRouterProvider`) with `defaultPath="/"`.
- Empty hash → `/` → renders `VerDashboard`.
- `usePRouter().navigate(p)` writes `window.location.hash = p`.
- On `hashchange`: route updates and `window.scrollTo({ top: 0 })`.

## Initial render

1. Babel processes `portal-shell.jsx` → `verifier-data.jsx` → `verifier-pages.jsx` → `verifier-app.jsx`.
2. `ReactDOM.createRoot(...).render(<App/>)` mounts.
3. Wrappers: `<PThemeProvider>` → `<PPaletteProvider>` → `<PRouterProvider defaultPath="/">` → `<App/>`.
4. App resolves `path` → `ROUTES["/"]` → `<VerDashboard/>` inside `<PortalShell role="verifier" .../>`.
5. Dashboard renders synchronously from in-memory `VER_DATA`. Production: hit `GET /verifier/dashboard` and surface a skeleton during fetch.
6. Fire `verifier.dashboard.viewed` once data has materialised.

## Top-bar interactions

Same shell as admin / provider / sovereign portals. Default mock user on the verifier portal is `Sanjay Boodhoo` (`sanjay@review.mu`, role `verifier`, scope `sovereignty-board`).

## Dashboard-specific flows

### Flow 1 — `Open next in queue` button

- **Source:** PageHeader actions row, primary button.
- **Prototype:** No-op stub (no onClick handler in source).
- **Production:** `navigate('/queue')` and select the first row of the queue (open its detail drawer immediately). The "next in queue" semantics use the SLA-breached row first if any, otherwise the highest-priority row.
- Emit `verifier.dashboard.action.open_next.clicked`.

### Flow 2 — `See all` (Top of queue card)

- **Source:** Card head right link `p-link`.
- **Behaviour:** anchor `href="#/queue"`. Browser sets hash → router renders `VerQueue`.
- Emit `verifier.dashboard.queue.see_all.clicked`.

### Flow 3 — Queue row render with SLA colour-code

- For each row in `slice(0, 4)`, render a DataTable row.
- The `Age` cell colour-codes red `#ef4444` when `r.age.endsWith('d') && parseInt(r.age) > 4`.
- Emit `verifier.dashboard.queue.row.viewed` with `reviewId`, `stage`, `age`, and `slaBreached` (boolean).
- Rows are non-interactive on the dashboard preview; the prototype passes `onRowClick={() => {}}` only on `/queue` itself.

### Flow 4 — Active red-team row render

- For each `r` in `redteam.filter(r => r.status !== 'resolved')`, render a row.
- Severity pill: `p-pill-isolated` for `high`, `p-pill-pending` otherwise.
- Rows are non-interactive on the dashboard.
- Emit `verifier.dashboard.redteam.row.viewed`.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Poll `GET /verifier/dashboard` every 60s when document is visible.
  - Subscribe to tenant-scoped WebSocket events: `review.queued`, `review.decided`, `redteam.opened`, `redteam.resolved`. Sidebar badges and StatCards stay in sync.

## Error and empty states

- **401/403 from `/verifier/dashboard`**: redirect to verifier sign-in / "Insufficient permissions" empty.
- **5xx**: render the same shell, replace each card body with `Couldn't load`. Top banner with `Retry`.
- **Empty queue (`V.queue.length === 0`)**: render the Top of queue card with body line `Queue is clear. Nothing to review.`
- **Empty active red-team**: render the Active red-team card with body line `No active red-team findings.`

## Keyboard shortcuts active on this page

| Combo | Behaviour |
|---|---|
| `⌘K` / `Ctrl+K` | Open command palette |
| `Esc` | Close any open dropdown / palette |
| `g d` | Navigate to dashboard (`/`) — production future |
| `g q` | Navigate to queue (`/queue`) — production future |
| `g r` | Navigate to red-team (`/redteam`) — production future |
| `n` | Open next in queue (production-only) |
