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

# Sovereign · Catalog module — National catalog

## Purpose

Specify the **`/catalog` route** of the Sovereign portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page surfaces every registry entry across the active sovereign tenant's national operations, with sovereignty tier, region, sector, 30-day usage, and a risk classification.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/sovereign.html` |
| Route table | `portals/sovereign-app.jsx` (`'/catalog'` → `SOV_PAGES.SovCatalog`) |
| Page component (`SovCatalog`) | `portals/sovereign-pages.jsx` |
| Mock catalog (`SOV_CATALOG`) | `portals/sovereign-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Sovereign`
- `PortalShell` overrides:
  - `currentTitle="Catalog"`
  - `breadcrumb=["Sovereign", "National", "Catalog"]`
  - Active sidebar item: `Catalog` (`path: "/catalog"`).

## Route body — vertical layout (`SovCatalog`)

1. **PageHeader** (no actions row)
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `National catalog`
- **Subtitle:** `All registry entries across Mauritian sovereign operations.`  
  Production: templated as `All registry entries across ${jurisdictionName} sovereign operations.`
- **Actions row:** none.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `slug` | `Resource` | (auto) | `<span class="p-cell-strong">{slug}</span>` |
| `kind` | `Kind` | 130 | `<span class="p-tag">{kind}</span>` |
| `tier` | `Tier` | 110 | `<span class="p-tag">{tier}</span>` |
| `region` | `Region` | 110 | `<span class="p-mono-key">{region}</span>` |
| `sectors` | `Sector` | 130 | text in `var(--p-text-2)` |
| `usage` | `30d` | 80 | `<span class="p-mono-val">{usage}</span>` |
| `risk` | `Risk` | 80 | mono 11px; `risk.toUpperCase()`; colour: high `#ef4444`, med `#f59e0b`, low `#10b981` |

Rows bind to `S.catalog`. The table is **non-interactive** (no `onRowClick`).

The `Risk` cell uppercases the value (`HIGH / MED / LOW`) at render time. Production must keep the uppercasing.

## Mock catalog — `SOV_CATALOG`

Reproduce verbatim from `sovereign-data.jsx`. Note this is a **subset** of the full registry (admin's `/resources` lists 15 rows; sovereign's catalog lists 6 — only the entries relevant to the active sovereign tenant):

| id | slug | kind | tier | region | usage | risk | sectors |
|---|---|---|---|---|---|---|---|
| res_001 | mcp/edu-curriculum | mcp-server | Tier-1 | MU | 12.4k | low | education |
| res_002 | agent/cargo-tracker | agent | Tier-1 | MU | 4.2k | low | logistics |
| res_005 | agent/treasury-bot | agent | Tier-1 | MU | 880 | low | finance |
| res_007 | model/anthropic-sonnet-7 | model | Tier-3 | GLOBAL | 94.0k | med | cross-cutting |
| res_011 | mcp/customs-tariff | mcp-server | Tier-1 | MU | 3.4k | low | trade |
| res_013 | model/openai-gpt-6 | model | Tier-3 | GLOBAL | — | high | cross-cutting |

The `sectors` field on this page is a **single string** (e.g. `education`, `cross-cutting`), not a comma-separated list — production may extend to multi-sector once the data model supports it, but for v0.4 the column holds one sector per resource.

## Visual and motion

- The `Risk` cell is colour-paired with the uppercase letter text — accessible without colour.
- Other cells use the standard tone tokens.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.

## Navigation behaviour

- Row click: not bound on this page; planned for production once a per-resource detail (sovereign-scoped) route ships. Recommended target: a drawer that surfaces tier classification reasoning, sector mapping, and last DPIA outcome.

## Out of scope on this page

- Filtering / search (planned).
- Per-resource sovereign actions (e.g. tier change, isolation override).
- Cross-sector aggregation (lives at `/sectors`).
