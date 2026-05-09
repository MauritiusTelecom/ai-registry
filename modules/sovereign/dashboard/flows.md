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

# Sovereign · Dashboard module — Flows

## Routing

- HTML entry: `portals/sovereign.html`. The sovereign portal owns its own hash router (`PRouterProvider`) with `defaultPath="/"`.
- Empty hash → `/` → renders `SovDashboard`.
- `usePRouter().navigate(p)` writes `window.location.hash = p`.
- On `hashchange`: route updates and `window.scrollTo({ top: 0 })`.

## Initial render

1. Babel processes `portal-shell.jsx` → `sovereign-data.jsx` → `sovereign-pages.jsx` → `sovereign-app.jsx`.
2. `ReactDOM.createRoot(...).render(<App/>)` mounts.
3. Wrappers: `<PThemeProvider>` → `<PPaletteProvider>` → `<PRouterProvider defaultPath="/">` → `<App/>`.
4. Theme + palette read from `localStorage` (shared with admin/provider).
5. `App` resolves `path` → `ROUTES["/"]` → `<SovDashboard/>` inside `<PortalShell role="sovereign" .../>`.
6. Dashboard renders synchronously from in-memory `SOV_DATA`. Production: hit `GET /sovereign/dashboard` and surface a skeleton during fetch.
7. Fire telemetry event `sovereign.dashboard.viewed` once data has materialised.

## Top-bar interactions

Same as admin / provider portals — command palette (⌘K), theme toggle, palette switcher, notifications, user menu. The default mock user on the sovereign portal is `Marie Laurent` (`marie@finance.gov.mu`, role `sovereign`).

## Dashboard-specific flows

### Flow 1 — `Open national report` button

- **Source:** PageHeader actions row, primary button.
- **Prototype behaviour:** No-op stub.
- **Production behaviour:**
  - GET `/sovereign/national-report` → returns the latest report metadata + signed PDF URL.
  - SPA opens the signed URL in a new tab. Fallback: `navigate('/reports')` to the full reports list.
- Emit `sovereign.dashboard.action.open_national_report.clicked`.

### Flow 2 — Topology widget

- **Prototype behaviour:** static SVG, no interactivity.
- **Production-recommended:**
  - Hover a node → tooltip with full slug, kind, region, last-7d call volume.
  - Click a node → `navigate('/topology?focus={node.id}')`.
  - Hover an edge → tooltip showing call count over the topology window.

### Flow 3 — Heatmap widget

- **Prototype behaviour:** static cells.
- **Production-recommended:**
  - Hover a cell → tooltip with full sector + tier label and count.
  - Click a cell → `navigate('/catalog?sector={sector}&tier={tier}')`.

### Flow 4 — Risk timeline widget

- **Prototype behaviour:** static SVG.
- **Production-recommended:**
  - Hover a point → tooltip with full week + score + delta vs prior.
  - Click a point → `navigate('/risk?week={day}')`.

### Flow 5 — Auto-refresh

- **Prototype:** none.
- **Production-recommended:**
  - Poll `GET /sovereign/dashboard` every 60s when document is visible.
  - Subscribe to tenant-scoped WebSocket events: `incident.opened` (refreshes the StatCard), `risk.weekly_recomputed` (refreshes the timeline), `topology.changed` (refreshes the graph if a node was added/removed).

## Error and empty states

- **401 / 403 from `/sovereign/dashboard`** — redirect to sovereign sign-in (or "Insufficient permissions" empty state if authenticated as non-sovereign).
- **5xx or network failure** — render the same shell, replace each card body with an error block: title `Couldn't load`, sub `Try again` button.
- **Empty `topology.nodes`** (a brand-new sovereign tenant) — render the topology card with body line `No inter-resource calls in the topology window. Onboard providers and start traffic to populate this view.`
- **Empty `heatmap.data`** — render the heatmap with all dot placeholders (`·` cells); cap row sums at zero.
- **Empty `risk` array** — render the risk card with body line `No risk history yet — first weekly score arrives at the end of the cycle.`

## Cross-portal behaviour

- The sovereign portal is observational; it does not host write actions on the dashboard.
- When the operator clicks `Switch role → Admin` (top-bar user menu), the SPA navigates to the admin portal. The sovereign session token must carry the admin role for this to work; otherwise the admin portal's gate triggers a sign-out.

## Keyboard shortcuts active on this page

| Combo | Behaviour |
|-------|-----------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `Esc` | Close any open dropdown / palette |
| `g d` (chord) | Navigate to dashboard (`/`) — optional, future enhancement |
| `g c` (chord) | Navigate to catalog (`/catalog`) — optional |
| `g t` (chord) | Navigate to topology (`/topology`) — optional |
