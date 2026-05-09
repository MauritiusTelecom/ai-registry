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

# Sovereign · Policies module — Flows

## Routing

- Route lives at `/policies` of the sovereign portal hash router.
- Activated via sidebar `Policies` (anchor `href="#/policies"`) or command palette.
- Active match: exact `'/policies'` OR `path.startsWith('/policies/')`.

## Initial render

1. App resolves `path === '/policies'` → renders `<SovPolicies/>`.
2. SovPolicies reads `S.policies` directly (no local state in prototype).
3. DataTable paints synchronously with all 3 mock rows in document order.
4. Production: emit `sovereign.policies.viewed` after first paint with `totalCount` and `enforcedCount`.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Policy detail (sovereign view)` route or drawer ships:

- Row click → drawer (right-anchored, 220ms slide).
- Drawer surfaces:
  - The active policy body (Rego/CEL source) — read-only.
  - Recent violations cross-link (`/audit?action=policy.violation&policyId=…`).
  - Version timeline (read-only; cross-links to admin's `/policies/{id}/versions`).

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `policy.published`, `policy.enforcement_changed`.

## Empty / error states

- **No rows** (no sovereign-relevant policies): render the table chrome with one body row text `No sovereignty policies configured. Ask an admin to define them.`
- **5xx**: render chrome + body row `Couldn't load policies.` and a top banner with `Retry`.
- **401/403**: redirect to sovereign sign-in / "Insufficient permissions" empty.

## Cross-portal cross-references

- Each row corresponds to a row in admin's `/policies` (`modules/admin/policies/`). Sovereign reads; admin authors.
- Policy violations from these rules surface in admin's `/audit` filtered on `policy.violation`.
- The Sovereign dashboard's `Risk index` StatCard derives partially from policy violations; this page is the operator's window into which policies are enforced.

## Accessibility

- The `Enforced` cell pairs colour with the literal `YES` text — accessible without colour.
- Mono columns (`Updated`) MUST keep contrast ≥4.5:1 against `--p-card-bg` in both themes.
- Em dash `—` (U+2014) in policy names is read as "em dash" by screen readers; production should consider replacing with a colon for ARIA labels.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
