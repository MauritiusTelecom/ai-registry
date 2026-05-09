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

# Provider · Dashboard module — Flows

## Routing (hash, scoped to provider portal)

- HTML entry: `portals/provider.html`. The provider portal owns its own hash router (`PRouterProvider`) with `defaultPath="/"`.
- Empty hash → `/` → renders `ProvDashboard`.
- `usePRouter().navigate(p)` writes `window.location.hash = p`.
- On `hashchange`: route updates and `window.scrollTo({ top: 0 })` resets scroll.

## Initial render

1. Babel processes `portal-shell.jsx` → `provider-data.jsx` → `provider-pages.jsx` → `provider-app.jsx` in document order.
2. `ReactDOM.createRoot(...).render(<App/>)` mounts.
3. Wrappers: `<PThemeProvider>` → `<PPaletteProvider>` → `<PRouterProvider defaultPath="/">` → `<App/>`.
4. Theme + palette read from `localStorage` keys `air-theme` and `air-pal` (shared with admin).
5. `App` resolves `path` → `ROUTES["/"]` → `<ProvDashboard/>` inside `<PortalShell role="provider" .../>`.
6. PortalShell mounts `Sidebar`, `Header`, content slot.
7. `ProvDashboard` renders synchronously from in-memory `PROV_DATA`. Production: hit `GET /provider/dashboard` and surface a skeleton during fetch.
8. Fire telemetry event `provider.dashboard.viewed` once data has materialised.

## Top-bar interactions

These mirror the admin portal (same `Header` from `portal-shell.jsx`) — command palette, theme toggle, palette switcher, notifications, user menu. The user menu's role switcher offers all roles the user holds; the default mock user on the provider portal is `Aisha Chen` (`aisha@anthropic.com`, role `provider`).

Behaviour identical to the admin dashboard's top bar — see `modules/admin/dashboard/flows.md` for the canonical description.

## Dashboard-specific flows

### Flow 1 — `View public profile` button

- **Source:** PageHeader actions row, secondary button.
- **Prototype behaviour:** No-op stub.
- **Production behaviour:** open new tab to `https://airegistry.mu/providers/${providerSlug}` (the public registry profile of this provider).

### Flow 2 — `Publish resource` button

- **Source:** PageHeader actions row, primary button.
- **Prototype behaviour:** No-op stub (no `onClick` handler in source).
- **Production behaviour:** `navigate('/publish')` and start the 5-step wizard (`modules/provider/publish`). The same primary action exists in the sidebar (`Publish` item) and command palette (`Publish a resource` action).

### Flow 3 — `All` link (Open submissions card)

- **Source:** Card header right link `p-link`.
- **Behaviour:** anchor `href="#/submissions"`. Browser sets hash → `PRouterProvider` `hashchange` listener fires → renders `ProvSubmissions`.

### Flow 4 — Submission row render

- **Source:** Open submissions card body.
- **Behaviour:** for each submission in `subs.filter(s => s.status !== 'approved')`, render a row. **No `slice`** — all matching rows are shown (in v0.4 there are 2 such rows; if a tenant has many, the card grows vertically and may need scroll).
- **Production recommendation:** cap at 5 rows on the dashboard with an `Open all (N more)` footer link; emit `provider.dashboard.submission_row.viewed` per rendered row.

### Flow 5 — Auto-refresh

- **Prototype:** none.
- **Production-recommended:** poll `GET /provider/dashboard` every 60s when `document.visibilityState === 'visible'`; pause on hidden; resume on `visibilitychange`. Use SWR caching keyed by route + providerId.
- Submission rows MAY also push via WebSocket (`submission.status_changed`) so the card reflects review-board decisions without waiting for poll.

## StatCard interaction

- StatCards are **not** clickable in the prototype. Production may upgrade `Open submissions` to navigate to `#/submissions` on click; if implemented, surface a hover ring and emit `provider.dashboard.statcard.clicked` with the chosen card key.

## Error and empty states

- **401 / 403 from `/provider/dashboard`** — redirect to provider sign-in (or "Insufficient permissions" empty state if authenticated as non-provider).
- **5xx or network failure** — render the same shell, replace each card body with an error block: title `Couldn't load`, sub `Try again` button. Fire `provider.dashboard.error` telemetry.
- **Empty `usage`** (a brand-new provider) — render the chart card with a single body line `No traffic yet. Publish your first resource to start seeing usage.` plus a CTA `Publish resource` linking to `#/publish`.
- **Empty `openSubmissions`** — render the right card with header and body line `No open submissions. Quiet day.`

## Keyboard shortcuts active on this page

| Combo | Behaviour |
|-------|-----------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `Esc` | Close any open dropdown / palette |
| `g d` (chord) | Navigate to dashboard (`/`) — optional, future enhancement |
| `g p` (chord) | Navigate to publish (`/publish`) — optional, future enhancement |
| `g r` (chord) | Navigate to resources (`/resources`) — optional, future enhancement |
