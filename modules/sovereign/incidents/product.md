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

# Sovereign · Incidents module — National-impact incidents

## Purpose

Specify the **`/incidents` route** of the Sovereign portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists the national-impact incidents currently under sovereign oversight — the small set of incidents elevated to the sovereign authority because they touch PHI, cross-border policy, or frontier-model reclassification.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/sovereign.html` |
| Route table | `portals/sovereign-app.jsx` (`'/incidents'` → `SOV_PAGES.SovIncidents`) |
| Page component (`SovIncidents`) | `portals/sovereign-pages.jsx` |
| Mock incidents (`SOV_INC`) | `portals/sovereign-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Sovereign`
- `PortalShell` overrides:
  - `currentTitle="Incidents"`
  - `breadcrumb=["Sovereign", "Governance", "Incidents"]`
  - Active sidebar item: `Incidents` (`path: "/incidents"`, badge `2` from sidebar definition).

## Route body — vertical layout (`SovIncidents`)

1. **PageHeader** (no actions row)
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Incidents`
- **Subtitle:** `National-impact incidents under sovereign oversight.`
- **Actions row:** none. Sovereign operators read; admins / providers create incidents.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `id` | `ID` | 110 | `<span class="p-mono-val">{id}</span>` |
| `sector` | `Sector` | 130 | `<span class="p-tag">{sector}</span>` |
| `target` | `Target` | (auto) | `<span class="p-cell-strong">{target}</span>` |
| `kind` | `Kind` | (auto) | text in `var(--p-text-2)` |
| `severity` | `Severity` | 110 | `<span class="p-pill p-pill-isolated"><span class="p-pill-dot"></span>{severity}</span>` (hard-coded `p-pill-isolated` in v0.4) |
| `opened` | `Opened` | 120 | `<span class="p-mono-key">{opened}</span>` |

Rows bind to `S.incidents`. The table is **non-interactive** (no `onRowClick` passed).

## Severity pill — v0.4 vs production

The prototype hard-codes the severity pill class to `p-pill-isolated` (red) for every row, because all v0.4 mock incidents have `severity === 'high'`. Production must derive the class:

| `severity` | pill class |
|---|---|
| `high` | `p-pill p-pill-isolated` |
| `med` | `p-pill p-pill-pending` |
| `low` | `p-pill p-pill-draft` |

## Mock incidents — `SOV_INC`

Reproduce verbatim from `sovereign-data.jsx`:

| id | sector | target | kind | severity | opened |
|---|---|---|---|---|---|
| inc_910 | health | mcp/health-records | PHI gateway isolated | high | 2026-04-29 |
| inc_909 | cross-cutting | model/openai-gpt-6 | sovereignty re-classification | high | 2026-05-01 |

The badge `2` in the sidebar reflects the count of open incidents under sovereign oversight (matches: 2 open).

## Visual and motion

- The severity pill in v0.4 is uniformly red because both mock rows are `high`. Production must vary by severity.
- The `kind` column uses muted text (`var(--p-text-2)`) — distinct from a `p-tag` chip — to keep the free-form description readable as prose.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.

## Navigation behaviour

- The page has no header actions and no row clicks in v0.4.
- Production may add row click → drawer with the incident timeline and cross-links to the originating provider's incident record (`modules/provider/incidents`).

## Out of scope on this page

- Incident creation — providers create incidents via `modules/provider/incidents`; admins can also raise on behalf of providers.
- Per-incident triage actions (escalate / resolve / reopen) — those live on the planned per-incident detail route.
- Cross-border policy review — overlaps with `pol_egress` (`modules/sovereign/policies`); sovereign operators may chain into that policy from this page in production.

## Difference vs admin/flags and provider/incidents

For implementers familiar with similar tables:

| Concern | Admin /flags | Provider /incidents | Sovereign /incidents |
|---|---|---|---|
| Header primary action | `Raise flag` | `Report incident` | (none) |
| Source | DLP / safety / policy flags | Reliability / eval incidents | Subset elevated to sovereign |
| Columns | Flag, Target, Kind, Severity, Raised by, Raised, Status | ID, Resource, Kind, Severity, Opened, Status | ID, Sector, Target, Kind, Severity, Opened |
| Status pill | yes | yes | NO (replaced with severity-only emphasis) |
| Sector column | no | no | yes |
| Audit ledger action | `flag.*` | `incident.*` | (read-only — sovereign reads admin/provider events) |
