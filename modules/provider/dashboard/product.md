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

# Provider · Dashboard module — Provider portal landing

## Purpose

Specify the **default provider landing route** (`/`) of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

Each provider tenant gets a personalised dashboard. The prototype is staged for the `eduMu` provider (Mauritius Ministry of Education); production must template the title and bio per active provider.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table, sidebar nav, command palette | `portals/provider-app.jsx` |
| Page composition (`ProvDashboard`, `UsageChart`) | `portals/provider-pages.jsx` |
| Mock data bound to dashboard widgets | `portals/provider-data.jsx` |
| Shared shell (Sidebar, Header, StatCard, StatusPill, DataTable, PageHeader, Btn, PIcon) | `portal-shell.jsx` |
| Portal design tokens, layout, gradients, motion | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` props (from `provider-app.jsx`):
  - `role="provider"`
  - `portalLabel="Provider"`
  - `portalIcon="layers"`
  - `currentTitle="Dashboard"`
  - `breadcrumb=["Provider", "Dashboard"]`
  - `activeMatch` — root `/` matches `/` or `''`; other paths match exact or `startsWith(path + '/')`.

## Sidebar (`navItems`, in order)

1. `Dashboard` — icon `home`, path `/`
2. **Divider** label `Publishing`
3. `My resources` — icon `layers`, path `/resources`
4. `Publish` — icon `plus`, path `/publish`
5. `Submissions` — icon `inbox`, path `/submissions`, badge `2`
6. **Divider** label `Observe`
7. `Analytics` — icon `activity`, path `/analytics`
8. `Incidents` — icon `flag`, path `/incidents`, badge `1`
9. **Divider** label `Organisation`
10. `API keys` — icon `key`, path `/keys`
11. `Team` — icon `users`, path `/team`
12. `Billing` — icon `database`, path `/billing`
13. `Docs` — icon `doc`, path `/docs`
14. `Settings` — icon `settings`, path `/settings`

### Sidebar footer

- Pulsing green status dot + heading `All systems nominal` + mono sub `99.97% · 90d SLO` (shared shell footer; identical to admin).

## Command palette (⌘K) — provider entries

`COMMANDS` in `provider-app.jsx` is `NAV.filter(n => n.path).map(...)` plus:

- Actions:
  - `Publish a resource` — icon `plus`, path `/publish`
  - `Create API key` — icon `key`, path `/keys`
  - `Report incident` — icon `flag`, path `/incidents`
- Go to:
  - `Public site` → `../Sovereign AI Registry.html`
  - `Admin portal` → `admin.html`

## Dashboard route — vertical layout (`ProvDashboard`)

1. **PageHeader**
2. **StatCard grid** — 4 cards in `p-grid p-grid-4`, bottom margin 20
3. **Two-column row** — `gridTemplateColumns: '2fr 1fr'`, gap default, bottom margin 20
   - Left card: `Weekly traffic` bar chart
   - Right card: `Open submissions` summary

There is no `Recent activity` table on this page (unlike admin dashboard); audit history for the provider lives at `/incidents` and the public audit log.

## Section copy and UI — PageHeader

- **Title:** `eduMu — Provider portal` (templated as `${providerName} — Provider portal`)
- **Subtitle:** `Publish, monitor and iterate on resources you provide to the registry.`
- **Actions row:**
  - Secondary button (`Btn variant="secondary" icon="arrow-up-right"`): `View public profile`
  - Primary button (`Btn variant="primary" icon="plus"`): `Publish resource`

## Section copy and UI — StatCard grid

| Label | Value | Delta | Tone | Sub | Icon |
|---|---|---|---|---|---|
| Resources live | `3` | `+1` | `pos` | `published` | `layers` |
| Calls (7d) | `21.5k` | `+12%` | `pos` | `vs last 7d` | `activity` |
| Uptime | `99.97%` | `0` | `neu` | `90d` | `pulse` |
| Open submissions | `2` | `+1` | `neu` | `in review` | `check` |

`deltaTone="neu"` produces the muted default colour (no green / no red).

## Section copy and UI — Weekly traffic chart

Card header:

- **Title:** `Weekly traffic`
- **Sub:** `calls per resource kind`
- **Legend row** (mono, 11px, colour `var(--p-text-3)`, gap 14), three items each with an 8×8 **square** swatch (`borderRadius: 2`, NOT round — different from admin dashboard's chart legend):
  - Swatch `var(--primary)` + label `mcp`
  - Swatch `var(--secondary)` + label `tool`
  - Swatch `var(--tertiary)` + label `agent`

Chart body — `UsageChart` (inline SVG):

- viewBox `0 0 720 220`, width `100%`, height `220`
- Padding 26 (NOT 24 — different from admin dashboard)
- `days = P.usage` (length 7 in v0.4)
- `maxV = 2500`
- Bar width: `(W - pad*2) / days.length / 3 - 4`
- Five horizontal grid lines `stroke="var(--p-border)"`, `strokeWidth=0.8`, `strokeDasharray="2 4"`
- Each day group renders three bars left-to-right:
  - `mcp` — colour `rgb(var(--primary-rgb))`, height proportional to `d.mcp / maxV`
  - `tool` — colour `rgb(var(--secondary-rgb))`, height proportional to `d.tool / maxV`
  - `agent` — colour `rgb(var(--tertiary-rgb))`, height proportional to `d.agent * 6 / maxV` (note the `× 6` multiplier so the small `agent` numbers remain visible alongside the much larger `mcp` / `tool` bars)
- Each bar has `rx=2` (rounded corners).
- Day label centred below each group: `text` `IBM Plex Mono`, `fontSize 10`, `fill var(--p-text-3)`, value `d.day` (e.g. `Mon`).

## Section copy and UI — Open submissions card

- **Card title:** `Open submissions`
- **Right link** (class `p-link`): `All` → `#/submissions`  
  (Note: NOT `See all` — different from admin dashboard's flags card.)
- Body: vertical flex stack, gap 10. Lists submissions where `s.status !== 'approved'`, taken from `PROV_DATA.subs`. No `slice` — the prototype shows ALL non-approved rows.
- Each row:
  - Strong line: `s.target` (e.g. `tool/lesson-search`)
  - Meta line (`p-cell-meta`): `${stage} · ${age}` (e.g. `sovereignty · 4h`)
  - Right: `<StatusPill status={s.status}/>` (raw status: `pending`, `review`, `approved`)
  - Each row has 8px vertical padding and a 1px `var(--p-border-soft)` bottom border.

In v0.4 the open-submissions list shows:

1. `tool/lesson-search` — `sovereignty · 4h` — pill `pending`
2. `agent/curriculum-tutor v0.4.0` — `safety · 1d` — pill `review`

(`mcp/edu-curriculum v3.2.0` is excluded because its status is `approved`.)

## Visual and motion

- StatCards animate via `useCountUp` (1600ms ease-out cubic) on first paint; `21.5k`, `99.97%` and similar string-with-suffix values render as static text (the count-up only animates the numeric portion).
- Chart bars have no entrance animation in the prototype; production may add a 300ms grow-in but must keep idle state identical.
- Card layout matches the admin dashboard for the split row (`gridTemplateColumns: '2fr 1fr'`) and shares the same gradient border treatment.
- No `Reveal` wrapper: cards appear on the same paint as the shell.

## Navigation behaviour from this page

- `View public profile` (header secondary): no-op stub in prototype. Production opens the provider's public profile (e.g. `https://airegistry.mu/providers/eduMu`) in a new tab.
- `Publish resource` (header primary): navigates to `#/publish` and starts the 5-step wizard.
- `All` link on the Open submissions card: navigates to `#/submissions`.
- Submission rows are **non-interactive** in the prototype (no row click handler).

## Out of scope on this page

- Detailed analytics (lives at `#/analytics`).
- Submission detail / decision view.
- Resource detail drawer (lives at `#/resources` once the row click handler ships).
- Per-resource latency / error breakdowns.

## Differences vs admin dashboard

For implementers familiar with the admin dashboard module:

| Concern | Admin dashboard | Provider dashboard |
|---|---|---|
| Title | `Sovereign control plane` | `${providerName} — Provider portal` |
| Header secondary action | `Open status page` | `View public profile` |
| Header primary action | `Onboard provider` | `Publish resource` |
| StatCard 3 tone | `neg` (more pending = bad) | `neu` (delta is informational) |
| Right card | Open flags | Open submissions |
| Right card right link label | `See all` | `All` |
| Chart kind | Multi-series line/area | Multi-series grouped bar |
| Chart legend swatch shape | Round 8×8 | Square 8×8 (`borderRadius: 2`) |
| Bottom row | Recent activity DataTable | (none) |
