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

# Admin · Resources module — Registry resources browse

## Purpose

Specify the **`/resources` route** of the Admin portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page is the administrator's primary surface for browsing, filtering and inspecting every resource registered with the sovereign AI registry — MCP servers, agents, models, and tools.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/admin.html` |
| Route table | `portals/admin-app.jsx` (`'/resources'` → `ADMIN_PAGES.AdminResources`) |
| Page component (`AdminResources`, `ResourceDrawer`) | `portals/admin-pages.jsx` |
| Mock catalogue (`ADMIN_RESOURCES`) | `portals/admin-data.jsx` |
| Shared shell (`PageHeader`, `FilterBar`, `DataTable`, `Drawer`, `StatusPill`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens, layout, gradients, motion | `portal-styles.css` |
| Reference enums (status, kinds, sovereignty, regions, risk) | `portals/reference-data.jsx`, `portals/reference-table.jsx` |

## Document title and shell

- HTML `<title>`: `AI Registry · Admin`
- Same `PortalShell` props as dashboard except:
  - `currentTitle="Resources"`
  - `breadcrumb=["Admin", "Registry", "Resources"]`
  - Active sidebar item: `Resources` (`path: "/resources"`).

## Route body — vertical layout (`AdminResources` in `admin-pages.jsx`)

1. **PageHeader**
2. **FilterBar** — single horizontal row, sticky-top within content
3. **DataTable** — full-width, scrolls vertically
4. **ResourceDrawer** — right-side slide-in, only mounted when a row is clicked

## Section copy and UI — PageHeader

- **Title:** `Resources`
- **Subtitle (templated):** `${A.resources.length} registry entries · MCP servers, agents, models and tools.`  
  In the prototype with the v0.4 mock data this resolves to `15 registry entries · MCP servers, agents, models and tools.`
- **Actions row:**
  - Secondary button (`Btn variant="secondary" icon="arrow-up-right"`): `Export CSV`
  - Primary button (`Btn variant="primary" icon="plus"`): `New resource`

## Section copy and UI — FilterBar

`FilterBar` is the shared shell component that lays out children in a single row with `gap`, soft border, and small inner padding. The order of the children is **mandatory**:

1. **Search input** (`<input class="p-input">`)
   - Placeholder: `Search slug or provider…`
   - Bound to local state `q` via `setQ`.
   - Inline style: `minWidth: 280`.
2. **Kind select** (`<select class="p-input p-select">`) — bound to `kind`:
   - Default: `all`
   - Options (label · value):
     - `All kinds` · `all`
     - `MCP servers` · `mcp-server`
     - `Agents` · `agent`
     - `Models` · `model`
     - `Tools` · `tool`
3. **Status select** (`<select class="p-input p-select">`) — bound to `status`:
   - Default: `all`
   - Options (label · value):
     - `Any status` · `all`
     - `Verified` · `verified`
     - `In review` · `review`
     - `Experimental` · `experimental`
     - `Isolated` · `isolated`
     - `Archived` · `archived`
4. **Result counter** (right-aligned, `marginLeft: 'auto'`, mono, 11px, colour `var(--p-text-3)`):
   - Format: `${filtered.length} of ${A.resources.length}`
   - Example: `3 of 15`

## Section copy and UI — Filter logic

Filter is applied client-side via `useMemo` keyed on `[q, kind, status]`. The function `r =>` is exact:

```js
if (q && !(r.slug.includes(q) || r.provider.toLowerCase().includes(q.toLowerCase()))) return false;
if (kind !== 'all' && r.kind !== kind) return false;
if (status !== 'all' && r.status !== status) return false;
return true;
```

Notes for production:

- `r.slug.includes(q)` is **case-sensitive** in the prototype (no `.toLowerCase()`); production should match this behaviour to avoid surprising drift, OR explicitly upgrade to case-insensitive search and version the change in the spec.
- `r.provider` comparison is case-insensitive (both sides lowercased).

## Section copy and UI — DataTable

Columns rendered in this exact order:

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `slug` | `Resource` | (auto) | Two-line stack: top `slug` (strong); bottom `${kind} · ${provider}` (`p-cell-meta`) |
| `status` | `Status` | 120 | `<StatusPill status={r.status}/>` |
| `sov` | `Sovereignty` | 130 | `<span class="p-tag">{sov}</span>` |
| `region` | `Region` | 130 | `<span class="p-mono-key">{region}</span>` |
| `risk` | `Risk` | 90 | mono 11px uppercase letter-spacing `.08em`; colour `#ef4444` for `high`, `#f59e0b` for `med`, `#10b981` for `low` |
| `usage` | `30d` | 80 | `<span class="p-mono-val">{usage}</span>` |
| `updated` | `Updated` | 110 | `<span class="p-mono-key">{updated}</span>` |

Rows are bound to `filtered`. `onRowClick={setRow}` opens the drawer.

## Section copy and UI — ResourceDrawer

Mounted via `<Drawer>` only when `row` is truthy. The drawer is right-anchored, full-height, width `var(--p-drawer-w)` from `portal-styles.css`.

Header:
- Title: `row.slug` (e.g. `mcp/edu-curriculum`)
- Sub: `${row.kind.toUpperCase()} · ${row.id}` (e.g. `MCP-SERVER · res_001`)

Body grid (`gap: 18`):

1. **Status / tag row** (`p-row` with `flexWrap: 'wrap', gap: 6`):
   - `<StatusPill status={row.status}/>`
   - `<span class="p-tag">{row.sov}</span>` (e.g. `Tier-1`)
   - `<span class="p-tag">{row.region}</span>` (e.g. `MU`)
   - `<span class="p-tag" style={color: …}>risk · {row.risk}</span>` colour same map as table cell.
2. **Description card** (`p-card` with `background: var(--p-input)`, `padding: 14`):
   - Sub label: `Description`
   - Body line: `row.desc`
3. **Provenance list** (`p-list-bare`):
   - Each row is a `p-row` with `justifyContent: 'space-between'`.
   - Pairs (label `p-mono-key` · value `p-mono-val`):
     - `provider` · `row.provider`
     - `last updated` · `row.updated`
     - `30d usage` · `row.usage`
     - `resource id` · `row.id`
4. **Action row** (`p-row` with `gap: 8`):
   - Primary button (`icon="check"`): `Re-verify`
   - Secondary button (`icon="edit"`): `Edit`
   - Ghost button (`icon="flag"`): `Raise flag`
   - Danger button (`icon="trash"`): `Isolate`

## Mock catalogue — `ADMIN_RESOURCES`

Reproduce the 15 rows in `admin-data.jsx` verbatim. Field shapes are documented in `data-model.md`. Slugs in v0.4 (do not paraphrase): `mcp/edu-curriculum`, `agent/cargo-tracker`, `model/legal-fr-mu`, `mcp/health-records`, `agent/treasury-bot`, `tool/ocr-creole`, `model/anthropic-sonnet-7`, `mcp/maritime-zones`, `agent/sugarcane-yield`, `tool/translate-mfe`, `mcp/customs-tariff`, `agent/citizen-helpdesk`, `model/openai-gpt-6`, `tool/satimg-classify`, `mcp/elections-stats`.

## Visual and motion

- Table row hover uses `var(--p-row-hover)`; clickable rows show `cursor: pointer` and a 1px focus ring on keyboard activation.
- StatusPill colours and dot animation defined globally in `portal-styles.css` keyed by `status` value.
- Drawer enters with a 220ms ease-out slide from the right (`transform: translateX(100%)` → `0`); the backdrop fades in over the same duration. Closing reverses both.
- The `risk` cell is **colour-only** semantically; production must include an icon or aria-label so screen readers can convey severity (the prototype is colour-only).

## Navigation behaviour from this page

- `Export CSV` (header secondary): no-op stub in prototype; production triggers `GET /admin/resources/export.csv` and downloads.
- `New resource` (header primary): navigates to a creation flow (out of scope here).
- Row click: opens `ResourceDrawer` for that row; closing the drawer (via X, backdrop click, or `Esc`) sets `row` to `null` and unmounts the drawer.
- Drawer action buttons (`Re-verify`, `Edit`, `Raise flag`, `Isolate`): no-op stubs in the prototype. Production must wire these to the corresponding backend actions; spec for those endpoints lives in `api.yaml`.

## Out of scope on this page

- Resource creation wizard (separate route).
- Provider detail (`#/providers`).
- Audit notarisation of changes (handled at write time, surfaced in `#/audit`).
