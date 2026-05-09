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

# Sovereign · Dashboard module — Sovereign operations

## Purpose

Specify the **default sovereign-ops landing route** (`/`) of the Sovereign portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This is the strategic / cross-tenant view shown to sovereign-ops users (e.g. Ministry of Finance) who oversee the whole national catalogue rather than a single provider's slice.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/sovereign.html` |
| Route table, sidebar nav, command palette | `portals/sovereign-app.jsx` |
| Page composition (`SovDashboard`, `TopologyCard`, `HeatmapCard`, `RiskTimelineCard`) | `portals/sovereign-pages.jsx` |
| Mock data bound to dashboard widgets | `portals/sovereign-data.jsx` |
| Shared shell | `portal-shell.jsx` |
| Portal design tokens, gradients, motion | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Sovereign`
- `PortalShell` props (from `sovereign-app.jsx`):
  - `role="sovereign"`
  - `portalLabel="Sovereign Ops"`
  - `portalIcon="globe"`
  - `currentTitle="Dashboard"`
  - `breadcrumb=["Sovereign", "Dashboard"]`

## Sidebar (`navItems`, in order)

1. `Dashboard` — icon `home`, path `/`
2. **Divider** label `National view`
3. `Catalog` — icon `layers`, path `/catalog`
4. `Topology` — icon `flow`, path `/topology`
5. `Sectors` — icon `database`, path `/sectors`
6. **Divider** label `Governance`
7. `Risk` — icon `activity`, path `/risk`
8. `Policies` — icon `shield`, path `/policies`
9. `Incidents` — icon `flag`, path `/incidents`, badge `2`
10. **Divider** label `Programmes`
11. `Regional partners` — icon `globe`, path `/partners`
12. `Reports` — icon `doc`, path `/reports`
13. `Settings` — icon `settings`, path `/settings`

## Command palette (⌘K) — sovereign entries

`COMMANDS` in `sovereign-app.jsx` is `NAV.filter(n => n.path).map(...)` plus:

- Go to:
  - `Public site` → `../Sovereign AI Registry.html`
  - `Admin portal` → `admin.html`

There is NO `Actions` section in the command palette for sovereign — the role is observational rather than write-driven.

## Dashboard route — vertical layout (`SovDashboard`)

1. **PageHeader**
2. **StatCard grid** — 4 cards in `p-grid p-grid-4`, bottom margin 20
3. **Topology row** — single full-width `TopologyCard` (`p-grid` with `gridTemplateColumns: '1fr', gap: 16, marginBottom: 16`)
4. **Two-column split** — `p-grid p-grid-2` with `HeatmapCard` (left) + `RiskTimelineCard` (right)

## Section copy and UI — PageHeader

- **Title:** `Sovereign operations`
- **Subtitle:** `Mauritius Ministry of Finance — strategic view across the registry.`  
  Production: templated as `${authorityName} — strategic view across the registry.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="arrow-up-right"`): `Open national report`

## Section copy and UI — StatCard grid

| Label | Value | Delta | Tone | Sub | Icon |
|---|---|---|---|---|---|
| Sovereign resources | `48` | `+5` | `pos` | `Tier-1` | `shield` |
| Cross-border calls | `94k` | `+18%` | `neu` | `Tier-3` | `globe` |
| Risk index | `27` | `-4` | `pos` | `vs last week` | `activity` |
| Open incidents | `2` | `+1` | `neg` | `critical` | `flag` |

The Risk index card uses `pos` tone for a NEGATIVE delta (lower risk is better) — same inversion pattern as `provider/analytics`'s p95 latency.

## Section copy and UI — TopologyCard

- **Card title:** `Resource topology`
- **Card sub:** `agent → mcp / tool / external model`
- **Legend row** (mono, 11px, colour `var(--p-text-3)`, gap 14), four items each with an 8×8 round dot:
  - Dot `rgb(var(--primary-rgb))` + label `agent`
  - Dot `rgb(var(--secondary-rgb))` + label `mcp`
  - Dot `rgb(var(--tertiary-rgb))` + label `tool`
  - Dot `#f59e0b` (amber) + label `external`

Inline SVG (`viewBox 0 0 720 320`):

- **Edges**: 6 quadratic-bezier paths with stroke `var(--p-border-strong)`, stroke-width `1.2`, mid-control point lifted 20px above the straight line.
- **Nodes**: 11 circles, each with:
  - Outer circle r=8 at `opacity 0.18` for halo
  - Inner circle r=4 at `opacity 1` for the dot
  - Label `text` to the right (x+10, y+4), `IBM Plex Mono`, 11px, `fill var(--p-text-2)`
- Colour map (`colorFor`):
  - `agent` → `rgb(var(--primary-rgb))`
  - `mcp` → `rgb(var(--secondary-rgb))`
  - `tool` → `rgb(var(--tertiary-rgb))`
  - `model-ext` → `#f59e0b`

The 11 mock nodes (id, x, y, kind):

| id | x | y | kind |
|---|---|---|---|
| curriculum-tutor | 120 | 80 | agent |
| edu-curriculum | 290 | 50 | mcp |
| translate-mfe | 290 | 130 | tool |
| treasury-bot | 120 | 200 | agent |
| customs-tariff | 290 | 220 | mcp |
| cargo-tracker | 120 | 280 | agent |
| maritime-zones | 290 | 290 | mcp |
| citizen-helpdesk | 480 | 100 | agent |
| anthropic-sonnet-7 | 620 | 180 | model-ext |
| sugarcane-yield | 480 | 240 | agent |
| satimg-classify | 620 | 280 | tool |

Edges (6): curriculum-tutor↔edu-curriculum, curriculum-tutor↔translate-mfe, treasury-bot↔customs-tariff, cargo-tracker↔maritime-zones, citizen-helpdesk↔anthropic-sonnet-7, sugarcane-yield↔satimg-classify.

## Section copy and UI — HeatmapCard

- **Card title:** `Sector × tier coverage`  
  (note Unicode multiplication sign `×` U+00D7, NOT lowercase `x`)
- **Card sub:** `resource counts`
- **Grid layout:** 5-column CSS grid `60px repeat(4, 1fr)`, gap 4, `marginTop: 8`.
- **Header row**: blank cell + 4 tier headers (`T-1 | T-2 | T-3 | Restr.`), all mono 10px uppercase letter-spacing `.1em`.
- **Body rows** (6 sectors × 4 tier cells, total 24):
  - Sector label cell: mono 11px, `var(--p-text-2)`, vertically centered.
  - Value cell: aspect ratio 2:1, border-radius 4, 1px border `var(--p-border)`. Background:
    - If `v === 0`: `var(--p-input)`, foreground `var(--p-text-3)` rendering literal `·`
    - If `v > 0`: `rgba(var(--primary-rgb), 0.15 + (v/max)*0.6)`, foreground `#fff` rendering the integer count

Mock data (6×4):

| Sector | T-1 | T-2 | T-3 | Restr. |
|---|---|---|---|---|
| Edu | 4 | 1 | 0 | 0 |
| Fin | 3 | 0 | 0 | 0 |
| Health | 0 | 0 | 0 | 1 |
| Trade | 2 | 0 | 0 | 0 |
| Log | 2 | 1 | 0 | 0 |
| Agri | 2 | 0 | 0 | 0 |

`max = 4` is used for the alpha gradient.

## Section copy and UI — RiskTimelineCard

- **Card title:** `Sovereign risk index`
- **Card sub:** `composite · weekly · lower is better`
- **Right-side big number** (`p-mono-val`, fontSize 22): the most recent week's score (`27` in v0.4)
- **Inline SVG** (`viewBox 0 0 720 220`, padding 30):
  - 5 horizontal grid lines `stroke var(--p-border)`, dash `2 4`, width `0.8`.
  - Filled area path under the line, `fill rgb(var(--primary-rgb))`, `opacity 0.15`.
  - Stroke path `stroke rgb(var(--primary-rgb))`, width `1.8`, round cap.
  - Per-week dots r=3, same primary colour. Day label below each dot in mono 10px `var(--p-text-3)`.
- y-axis ceiling `max = 50`.

Mock data (5 weekly scores from `SOV_RISK`):

| day | score |
|---|---|
| Apr 09 | 22 |
| Apr 16 | 19 |
| Apr 23 | 24 |
| Apr 30 | 31 |
| May 07 | 27 |

## Visual and motion

- StatCards animate via `useCountUp` (1600ms ease-out cubic) on first paint where the value is purely numeric. Compound display strings like `94k` render as static text.
- Topology nodes have NO entrance animation in v0.4; production may add a 300ms staggered fade-in.
- Risk timeline path has NO draw-in animation in v0.4; production may add an SVG `path-length` reveal of 800ms.
- Heatmap cells render synchronously; cells with `v > 0` glow via the alpha gradient. Production may add a hover tooltip showing the exact count.

## Navigation behaviour

- `Open national report` (header primary): no-op stub. Production opens `/reports` (or directly to the latest national report PDF — tenant choice).
- Topology / Heatmap / Risk widgets are NOT clickable on the dashboard. Production may upgrade them to link to `/topology`, `/sectors`, `/risk` respectively.

## Out of scope on this page

- Per-incident detail (lives at `/incidents`).
- Per-resource catalog browse (lives at `/catalog`).
- Risk drill-down by sector (lives at `/risk` and `/sectors`).
