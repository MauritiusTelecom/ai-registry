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

# Admin · Dashboard module — Sovereign control plane

## Purpose

Specify the **default admin landing route** (`/`) of the Admin portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This is the "Sovereign control plane" overview shown to administrators immediately after sign-in.

## Source of truth (prototype)

Implementation must follow these files under `airegistry-prototype/claudedesign/`:

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/admin.html` |
| Route table, sidebar nav, command palette | `portals/admin-app.jsx` |
| Page composition (`AdminDashboard`, `DashboardChart`) | `portals/admin-pages.jsx` |
| Mock data bound to dashboard widgets | `portals/admin-data.jsx` |
| Shell (Sidebar, Header, Topbar, Drawer, StatCard, StatusPill, DataTable, PageHeader, FilterBar, EmptyState, Btn, PIcon, palettes, theme, router) | `portal-shell.jsx` |
| Portal design tokens, layout, gradients, motion | `portal-styles.css` |
| Reference data tables (status, kinds, sovereignty) | `portals/reference-data.jsx`, `portals/reference-table.jsx` |

## Document title and fonts

- HTML `<title>`: `AI Registry · Admin`
- Google Fonts: IBM Plex Sans (300/400/500/600) + IBM Plex Mono (400/500/600)
- Body font stack inherited from `portal-styles.css`.

## Shell (rendered around all admin routes, including dashboard)

`portals/admin-app.jsx` mounts `<PortalShell>` with these props:

- `role="admin"`
- `portalLabel="Admin"`
- `portalIcon="shield"`
- `navItems` — see Sidebar below
- `commandItems` — see Command palette below
- `currentTitle="Dashboard"`
- `breadcrumb=["Admin", "Dashboard"]`
- `activeMatch` — function: root path `/` matches `/` or `''`; other paths match exact or `startsWith(path + '/')`.

### Sidebar (`navItems`, in order)

1. `Dashboard` — icon `home`, path `/`
2. **Divider** label `Registry`
3. `Resources` — icon `layers`, path `/resources`
4. `Providers` — icon `users`, path `/providers`
5. **Divider** label `Governance`
6. `Review queue` — icon `check`, path `/reviews`, badge `14`
7. `Flags & incidents` — icon `flag`, path `/flags`, badge `3`
8. `Policies` — icon `shield`, path `/policies`
9. **Divider** label `Operations`
10. `Users & roles` — icon `user`, path `/users`
11. `Audit log` — icon `audit`, path `/audit`
12. `Integrations` — icon `cpu`, path `/integrations`
13. `Settings` — icon `settings`, path `/settings`

### Sidebar branding & footer

- Logo mark + name `AI Registry`
- Sub line: shield icon (size 10) + `Admin`
- Foot status: pulsing green dot + heading `All systems nominal` + mono sub `99.97% · 90d SLO`

### Header / Topbar

- Breadcrumb: `Admin / Dashboard`
- Title row text: `Dashboard`
- Right side controls (per `portal-shell.jsx` `Header`):
  - **Command palette** trigger (search icon + ⌘K hint)
  - **Palette switcher** (palette icon, opens dropdown listing `Sovereign`, `Pacific`, `Coral`, `Solar`)
  - **Notifications** (bell icon with unread count)
  - **Theme toggle** (sun/moon)
  - **User menu** opens dropdown; default user is `John Reyes` / `john@gov.mu` / role `admin`. Includes role switcher (`Administrator`, `Provider`, `Verifier`, `Sovereign Ops`) and `Log out`.

### Command palette (⌘K) — admin entries

Pages section: Dashboard, Resources, Providers, Review queue, Flags & incidents, Policies, Users & roles, Audit log, Integrations, Settings.

Actions section:
- `Onboard new provider` — icon `plus`, hint `⌘⇧P`, path `/providers`
- `New resource` — icon `plus`, path `/resources`
- `Raise flag` — icon `flag`, path `/flags`
- `Verify audit integrity` — icon `audit`, path `/audit`

Resources section:
- `mcp/edu-curriculum` — icon `database`, hint `Tier-1`
- `agent/cargo-tracker` — icon `agent`, hint `Tier-1`
- `model/legal-fr-mu` — icon `cpu`, hint `review`

Providers section:
- `eduMu` — icon `users`, hint `sovereign`
- `anthropic.com` — icon `users`, hint `external`

Go to section:
- `Public site` → `../Sovereign AI Registry.html`
- `Provider portal` → `../Sovereign AI Registry.html#/portal/provider`
- `Verifier portal` → `../Sovereign AI Registry.html#/portal/verifier`
- `Sovereign portal` → `../Sovereign AI Registry.html#/portal/sovereign`

## Dashboard route — vertical layout (`AdminDashboard` in `admin-pages.jsx`)

1. **PageHeader**
2. **StatCard grid** — 4 cards in `p-grid p-grid-4`, bottom margin 20
3. **Two-column row** — `gridTemplateColumns: '2fr 1fr'`, gap default, bottom margin 20
   - Left card: `Submissions over time` chart
   - Right card: `Open flags` summary
4. **Recent activity card** — full-width, holds `DataTable` with last 6 audit rows

## Section copy and UI — PageHeader

- **Title:** `Sovereign control plane`
- **Subtitle:** `Admin overview of the registry — providers, resources, reviews and policy enforcement at a glance.`
- **Actions row:**
  - Secondary button (`Btn variant="secondary" icon="arrow-up-right"`): `Open status page`
  - Primary button (`Btn variant="primary" icon="plus"`): `Onboard provider`

## Section copy and UI — StatCard grid

Four cards rendered in order. Each `StatCard` has `label`, `value`, optional `delta`, `deltaTone` (`pos`/`neg`/`neutral`), `sub`, `icon`.

| Label | Value | Delta | Tone | Sub | Icon |
|---|---|---|---|---|---|
| Resources | `412` | `+18` | `pos` | `last 7 days` | `layers` |
| Providers | `64` | `+2` | `pos` | `onboarded` | `users` |
| Pending reviews | `14` | `+3` | `neg` | `queue` | `check` |
| Policy violations | `2` | `-4` | `pos` | `this week` | `shield` |

## Section copy and UI — Submissions over time chart

Card header:
- **Title:** `Submissions over time`
- **Sub:** `last 60 days · provider, sovereign, external`
- **Legend row** (mono, 11px, colour `var(--p-text-3)`), three items each with an 8×8 round dot:
  - Dot `var(--primary)` + label `provider`
  - Dot `var(--secondary)` + label `sovereign`
  - Dot `var(--tertiary)` + label `external`

Chart body — `DashboardChart` (inline SVG):
- viewBox `0 0 720 220`, width `100%`, height `220`
- Padding 24, days `60`, max y-value `22`
- Five horizontal grid lines `stroke="var(--p-border)"`, `strokeWidth=0.8`, `strokeDasharray="2 4"`
- Three series rendered back-to-front: tertiary, secondary, primary
  - Series A (primary): `8 + sin(i/4)*3 + i/8 + rand*1.2`
  - Series B (secondary): `4 + cos(i/5)*2 + i/12 + rand*0.8`
  - Series C (tertiary): `2 + sin(i/3)*1.5 + i/15 + rand*0.6`
- Each series draws a stroke path (`strokeWidth 1.6`, round caps/joins) plus a closed fill area using the same colour at `opacity 0.08`.

## Section copy and UI — Open flags card

- **Card title:** `Open flags`
- **Right link** (class `p-link`): `See all` → `#/flags`
- Body: vertical flex stack, gap 10. Lists up to **4 flags** with `status !== 'resolved'`, taken from `ADMIN_DATA.flags`.
- Each row:
  - Strong line: flag `target` (e.g. `mcp/health-records`)
  - Meta line (`p-cell-meta`): `{kind} · raised {raised}` (e.g. `data-leak-risk · raised 2026-05-06`)
  - Right pill: `p-pill` with severity styling
    - `high` → class suffix `isolated` (red)
    - `med` → class suffix `pending` (amber)
    - `low` → class suffix `draft`
  - Each row has a 1px `var(--p-border-soft)` bottom border and 8px vertical padding

Reproduce flag rows verbatim from `ADMIN_FLAGS` in `admin-data.jsx`. As of v0.4 the open flags shown are:

1. `mcp/health-records` — `data-leak-risk · raised 2026-05-06` — severity `high`
2. `model/openai-gpt-6` — `sovereignty · raised 2026-05-04` — severity `med`
3. `agent/citizen-helpdesk` — `hallucination-rate · raised 2026-05-02` — severity `med`

(`tool/ocr-creole` is excluded because its status is `resolved`.)

## Section copy and UI — Recent activity card

- **Card title:** `Recent activity`
- **Card sub:** `All actions are notarised in the audit ledger.`
- **Right link:** `Open audit log` → `#/audit`
- **Table:** `DataTable` with these columns and renderers:
  - `Time` — width 160; mono key style; binds `ts`
  - `Actor` — strong cell; binds `actor`
  - `Action` — mono value style; binds `action`
  - `Target` — mono value style; binds `target`
  - `Result` — width 100; renders `<StatusPill status={result === 'ok' ? 'verified' : 'failed'} />`
- **Rows:** first 6 of `ADMIN_DATA.audit`, exact strings from `ADMIN_AUDIT` in `admin-data.jsx`.

## Visual and motion (non-negotiable mirror)

Bind to existing CSS custom properties in `portal-styles.css`. Do **not** paraphrase tokens.

- **Theme:** `data-theme="dark"` (default) and `data-theme="light"` set on `documentElement`; key `air-theme` in `localStorage`. Theme transition: `background 240ms ease, color 240ms ease`.
- **Palette:** persisted at `localStorage` key `air-pal` (integer index 0..3). On change, `--primary-rgb`, `--secondary-rgb`, `--tertiary-rgb` and computed `--primary`, `--secondary`, `--tertiary` are written to `documentElement.style`. Palettes (id, label, primary RGB, secondary RGB, tertiary RGB):
  - `0` Sovereign — `59,130,246` / `6,182,212` / `168,85,247`
  - `1` Pacific — `20,184,166` / `52,211,153` / `14,165,233`
  - `2` Coral — `236,72,153` / `244,114,182` / `168,85,247`
  - `3` Solar — `245,158,11` / `251,191,36` / `239,68,68`
- **StatCard:** glass card with subtle gradient border via `var(--p-border-grad)`; value uses heavy weight; delta tone classes:
  - `pos` → green (`#10b981` / `var(--p-pos)`)
  - `neg` → red (`#ef4444` / `var(--p-neg)`)
  - `neutral` → muted text colour
- **DataTable:** sticky header row, hover row uses `var(--p-row-hover)`; click handler on row triggers `onRowClick`; mono cell style for IDs uses `var(--font-mono)`.
- **StatusPill:** discrete states `verified`, `pending`, `review`, `experimental`, `isolated`, `archived`, `active`, `draft`, `failed` (see `reference-data.jsx`). Each maps to its own dot colour and label.
- **Pulse:** sidebar foot status dot uses CSS `@keyframes pulse` (2.6s ease-in-out infinite) defined in portal CSS.
- **Card header:** `p-card-head` is flex row, space-between, baseline aligned. Right-side `p-link` uses `var(--primary)` text and underline-on-hover.
- **Density / spacing:** dashboard top section uses `p-grid p-grid-4` with default gap; nested `p-grid p-grid-2` with `gridTemplateColumns: '2fr 1fr'` for chart + flags row.
- **Motion intensity:** the dashboard does not use the home-page motion-intensity tweak. Reveal-on-scroll is **not** required for admin dashboard cards; they appear on mount.

## Navigation behaviour from this page

- Clicking `Open status page` (header secondary button) triggers an external status URL (placeholder; spec MUST point to `status.air.gov.mu` per Settings.Branding default). In prototype this is a no-op button.
- Clicking `Onboard provider` (header primary button) navigates to `#/providers` and opens onboarding flow (out of dashboard scope; dashboard handler is a no-op stub).
- Clicking `See all` on Open flags navigates to `#/flags`.
- Clicking `Open audit log` link navigates to `#/audit`.
- Clicking any audit row in the Recent activity table is **not bound to a row click handler** in the prototype dashboard (no `onRowClick` passed). Implementations MUST keep the row non-interactive on this page to avoid unintentional navigation.

## Out of scope on this page

- Flag detail view (lives at `#/flags`).
- Resource detail drawer (lives at `#/resources` via `ResourceDrawer`).
- Audit verification action (lives at `#/audit` header action `Verify integrity`).
- Provider onboarding wizard.
