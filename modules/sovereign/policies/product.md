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

# Sovereign · Policies module — National sovereignty policies

## Purpose

Specify the **`/policies` route** of the Sovereign portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists the national-level sovereignty policies enforced via the registry — egress, PII handling, DPIA, and similar. It is the sovereign-ops view of policy state; the admin portal's `/policies` route at `modules/admin/policies` is the operational surface where policies are authored.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/sovereign.html` |
| Route table | `portals/sovereign-app.jsx` (`'/policies'` → `SOV_PAGES.SovPolicies`) |
| Page component (`SovPolicies`) | `portals/sovereign-pages.jsx` |
| Mock policies (`SOV_POLICIES`) | `portals/sovereign-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Sovereign`
- `PortalShell` overrides:
  - `currentTitle="Policies"`
  - `breadcrumb=["Sovereign", "Governance", "Policies"]`
  - Active sidebar item: `Policies` (`path: "/policies"`).

## Route body — vertical layout (`SovPolicies`)

1. **PageHeader** (no actions row)
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Sovereignty policies`
- **Subtitle:** `National policies enforced via the registry.`
- **Actions row:** none. Policy authoring lives on the admin portal.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `name` | `Policy` | (auto) | `<span class="p-cell-strong">{name}</span>` |
| `scope` | `Scope` | 130 | `<span class="p-tag">{scope}</span>` |
| `enforced` | `Enforced` | 110 | mono 11px letter-spacing `.1em` colour `#10b981` rendering literal `YES` |
| `updated` | `Updated` | 130 | `<span class="p-mono-key">{updated}</span>` |

Rows bind to `S.policies`. The table is **non-interactive** (no `onRowClick` passed).

The `Enforced` cell is hard-coded to `YES` in v0.4 (all v0.4 mock policies are enforced). Production must:

- When `enforced === true`: render `YES` in green `#10b981`.
- When `enforced === false`: render `NO` in muted `var(--p-text-3)`.

## Mock policies — `SOV_POLICIES`

Reproduce verbatim from `sovereign-data.jsx`:

| id | name | scope | enforced | updated |
|---|---|---|---|---|
| pol_egress | Egress to non-MU jurisdictions | Tier-3 | true | 2026-05-07 |
| pol_pii | PII handling — Mauritian DPA | all | true | 2026-04-22 |
| pol_dpia | DPIA required | restricted | true | 2026-03-09 |

The em dash in `PII handling — Mauritian DPA` is Unicode em dash U+2014.

## Visual and motion

- The `Enforced` cell colour-pairs with the literal text — accessible without colour.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.
- Cross-reference admin's `/policies` (`modules/admin/policies`) for the canonical Policy shape; the sovereign view is a curated subset.

## Navigation behaviour

- The page has no header actions and no row clicks in v0.4.
- Production may add a `View on admin policies` link per row (only visible to operators with both `sovereign` and `admin` roles), navigating to `admin.html#/policies`.

## Out of scope on this page

- Policy authoring (lives on admin's `/policies`).
- Policy version history (planned).
- Per-policy violation count — production may surface as a fifth column once the planned `policy.violation` aggregate is available.

## Difference vs admin/policies

For implementers familiar with the admin module:

| Concern | Admin /policies | Sovereign /policies |
|---|---|---|
| Header primary action | `New policy` | (none) |
| Columns | Policy, Scope, Version, Updated, Enforced | Policy, Scope, Enforced, Updated |
| Enforced rendering | uppercase YES/NO with colour map | uppercase YES (hard-coded green in v0.4); production same map |
| Source of truth | admin authors policies | sovereign reads them |
| Row count | 5 (full registry) | 3 (sovereign-relevant subset) |
