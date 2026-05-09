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

# Admin · Dashboard module — Flows

Flows describe **observable behaviour** of the prototype (`airegistry-prototype/claudedesign/portals/`) so the production admin dashboard can match it without altering motion or interaction feel.

## Routing (hash, scoped to admin portal)

- The admin portal's HTML entry is `portals/admin.html`. Each portal owns its own hash router (`PRouterProvider`) with `defaultPath="/"`.
- Empty hash on first load resolves to `/` → renders `AdminDashboard`.
- `usePRouter().navigate(p)` writes `window.location.hash = p` (no leading `#/` prefix; hash will be `#/`, `#/resources`, etc., because the value already includes a leading `/`).
- On `hashchange`: `setPath(...)` runs and `window.scrollTo({ top: 0 })` resets scroll.

## Initial render flow

1. Babel processes `portal-shell.jsx` → `admin-data.jsx` → `admin-pages.jsx` → `admin-app.jsx` in document order.
2. `ReactDOM.createRoot(...).render(<Root/>)` mounts.
3. `Root` wraps `<PThemeProvider>` → `<PPaletteProvider>` → `<PRouterProvider defaultPath="/">` → `<AdminApp/>`.
4. `<PThemeProvider>` reads `localStorage["air-theme"]` (or system pref) and writes `data-theme` to `<html>`.
5. `<PPaletteProvider>` reads `localStorage["air-pal"]` (or `0`) and writes `--primary-rgb`/`--secondary-rgb`/`--tertiary-rgb` plus computed `--primary`/`--secondary`/`--tertiary` to `<html>` style.
6. `AdminApp` resolves `path` → `ROUTES["/"]` → `<AdminDashboard/>` inside `<PortalShell role="admin" .../>`.
7. PortalShell mounts `Sidebar`, `Header`, content slot, `Drawer` placeholder, `CommandPalette` placeholder.
8. `AdminDashboard` renders synchronously from in-memory `ADMIN_DATA` (no async fetch in prototype). Production must hit `GET /admin/dashboard` (see `api.yaml`) and surface a skeleton state during fetch.
9. Fire telemetry event `admin.dashboard.viewed` once data has materialised.

## Top-bar interactions (shell-owned but reachable from dashboard)

These live in `Header` (`portal-shell.jsx`). They are global, but described here because they are present on the dashboard.

### Command palette (⌘K)

- Trigger: `Cmd/Ctrl+K` keyboard shortcut OR clicking the search trigger in the top bar.
- Behaviour: opens a modal with sectioned list (Pages, Actions, Resources, Providers, Go to). Filtering is fuzzy on `label` and `hint`.
- On selection: items with `path` invoke `navigate(path)`; items with `href` open in a new tab via `window.open(href, '_blank')`.

### Theme toggle

- Cycles `dark` ↔ `light`.
- Persists to `localStorage["air-theme"]`.
- Sets `data-theme` on `documentElement`.
- Triggers CSS theme transition (240ms).

### Palette switcher

- Cycles index `0..3` with explicit selection from dropdown.
- Persists to `localStorage["air-pal"]`.
- Recomputes `--primary-*`, `--secondary-*`, `--tertiary-*` custom properties in-place. No reload.

### Notifications

- Bell badge shows `count(notifs WHERE unread)`.
- Click opens dropdown listing the four mock notifications (`review`, `alert`, `audit`, `system`).
- Marking-as-read flips `unread` locally; production must POST to `/notifications/{id}/read`.

### User menu

- Opens dropdown with: avatar, name, email, role badge, `Switch role` submenu, `Log out`.
- Default user is `John Reyes` (`john@gov.mu`, role `admin`).
- `Switch role` lists the four roles (Administrator, Provider, Verifier, Sovereign Ops); each item navigates to that role's portal entry (`Sovereign AI Registry.html#/portal/{role}`) — this is a SPA-style swap in the prototype.
- `Log out` clears auth state in browser memory and redirects to public site.

## Dashboard-specific flows

### Flow 1 — `Open status page` button

- **Source:** PageHeader actions row, secondary button.
- **Prototype behaviour:** No-op stub.
- **Production behaviour:** open new tab to `https://status.air.gov.mu` (default; configurable via `Settings → Branding → Status page`).

### Flow 2 — `Onboard provider` button

- **Source:** PageHeader actions row, primary button.
- **Prototype behaviour:** No-op stub.
- **Production behaviour:** `navigate('/providers')` and pre-open the onboarding wizard. Spec for that wizard lives in `modules/admin/providers`.

### Flow 3 — `See all` (Open flags card)

- **Source:** Card header right link `p-link`.
- **Behaviour:** anchor `href="#/flags"`. Browser sets hash → `PRouterProvider` `hashchange` listener fires → renders `AdminFlags`.

### Flow 4 — `Open audit log` (Recent activity card)

- **Source:** Card header right link `p-link`.
- **Behaviour:** anchor `href="#/audit"`. Same hash flow as Flow 3.

### Flow 5 — Flag row render

- **Source:** Open flags card body.
- **Behaviour:** for each flag in `flags.filter(f => f.status !== 'resolved').slice(0, 4)`, render a row. Rows are **non-interactive** in the prototype (no click handler attached). Specs for clickable rows in production live in `modules/admin/flags`.

### Flow 6 — Audit row render

- **Source:** Recent activity card body.
- **Behaviour:** for each row in `audit.slice(0, 6)`, render a `DataTable` row. `DataTable` does not invoke `onRowClick` because the dashboard does not pass it. Implementations MUST NOT add a click handler on this page.

### Flow 7 — Auto-refresh

- **Prototype behaviour:** none. Data is bound once at mount.
- **Production behaviour (recommended):** poll `GET /admin/dashboard` every 60s when the document is visible (`document.visibilityState === 'visible'`); stop polling when hidden; resume on `visibilitychange`. Use stale-while-revalidate caching keyed by route.

## Error and empty states

The prototype does not render error states because data is local. Production must handle:

- **401 / 403 from `/admin/dashboard`** — redirect to admin sign-in (or "Insufficient permissions" empty state if authenticated as non-admin).
- **5xx or network failure** — render the same shell, replace each card body with an error block: title `Couldn't load`, sub `Try again` button. Fire `admin.dashboard.error` telemetry.
- **Empty `openFlags`** — the right card MUST still render with header and a body line `No open flags.` (no separator, no pill).
- **Empty `recentActivity`** — render the empty `DataTable` with column headers and a body row `No recent activity. The audit ledger is sealed.`

## Keyboard shortcuts active on this page

| Combo | Behaviour |
|-------|-----------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `Esc` | Close any open dropdown / palette / drawer |
| `g d` (chord) | Navigate to dashboard (`/`) — optional, future enhancement |
| `g r` (chord) | Navigate to resources (`/resources`) — optional, future enhancement |
