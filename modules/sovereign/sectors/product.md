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

# Sovereign · Sectors module — Coverage & growth

## Purpose

Specify the **`/sectors` route** of the Sovereign portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page surfaces coverage and 30-day growth across the six Mauritian government sectors (Education, Finance, Health, Trade, Logistics, Agriculture).

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/sovereign.html` |
| Route table | `portals/sovereign-app.jsx` (`'/sectors'` → `SOV_PAGES.SovSectors`) |
| Page component (`SovSectors`) | `portals/sovereign-pages.jsx` |
| Mock sectors (`SOV_SECTORS`) | `portals/sovereign-data.jsx` |
| Shared shell (`PageHeader`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Sovereign`
- `PortalShell` overrides:
  - `currentTitle="Sectors"`
  - `breadcrumb=["Sovereign", "National", "Sectors"]`
  - Active sidebar item: `Sectors` (`path: "/sectors"`).

## Route body — vertical layout (`SovSectors`)

1. **PageHeader** (no actions row)
2. **Card grid** — `p-grid p-grid-3` of 6 cards, one per sector

There are **no StatCards** and **no DataTable** on this page in v0.4. The cards themselves play the StatCard-with-extras role.

## Section copy and UI — PageHeader

- **Title:** `Sectors`
- **Subtitle:** `Coverage and growth across Mauritian government sectors.`
- **Actions row:** none.

## Section copy and UI — Sector card

Each card is a `p-card` with two blocks:

1. **Card head** (`p-card-head`, flex row, space-between, baseline aligned):
   - **Left**: stacked title + sub
     - Title (`p-card-title`): `s.name` (e.g. `Education`)
     - Sub (`p-card-sub`): `s.tier` (e.g. `Tier-1` / `Restricted`)
   - **Right**: `<span class="p-mono-val" style="fontSize: 22">{s.count}</span>` — large mono number.
2. **Growth row** (`p-row` with `justifyContent: 'space-between'`):
   - Left: `<span class="p-mono-key">growth (30d)</span>`
   - Right: `<span class="mono" style={{ color: '#10b981', fontSize: 12 }}>{s.growth}</span>` — mono green growth string.

The growth value is rendered in **green regardless of sign** in v0.4. Production should colour-code: `+` green (`#10b981`), `0%` muted (`var(--p-text-3)`), `-` red (`#ef4444`).

## Mock sectors — `SOV_SECTORS`

Reproduce verbatim from `sovereign-data.jsx`. Six rows:

| name | count | tier | growth |
|---|---:|---|---|
| Education | 4 | Tier-1 | +12% |
| Finance | 3 | Tier-1 | +8% |
| Health | 1 | Restricted | 0% |
| Trade | 2 | Tier-1 | +4% |
| Logistics | 2 | Tier-1 | +22% |
| Agriculture | 2 | Tier-1 | +6% |

`Health` has tier `Restricted` (NOT `Tier-1`) because the active health resource is isolated. `0%` growth is intentional — health is locked while the DPIA review continues.

## Visual and motion

- Card head font sizes: title is the standard `p-card-title`; sub is `p-card-sub`. The right-side big number is `p-mono-val` at `fontSize: 22`.
- Growth value is `IBM Plex Mono` 12px, hard-coded green `#10b981` in v0.4. Production must vary by sign.
- Cards inherit the standard `p-card` gradient border and hover lift treatment.
- The 3-column grid collapses to single-column at narrow widths (per shared `p-grid-3` rules).

## Navigation behaviour

- Cards are **not clickable** in v0.4. Production may upgrade them to navigate to `/catalog?sector={name.toLowerCase()}` so operators can drill in. If implemented, surface a hover ring and emit `sovereign.sectors.card.clicked` with the sector name.

## Out of scope on this page

- Per-sector growth chart (production may add a small sparkline to each card).
- Per-resource breakdown — that's the `/catalog` route filtered by sector.
- Cross-sector concentration metrics — out of scope for v0.4.
