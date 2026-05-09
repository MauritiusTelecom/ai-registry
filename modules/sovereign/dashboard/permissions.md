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

# Sovereign · Dashboard module — Permissions and access

## Surface classification

The sovereign dashboard is **authenticated**, **role-gated** (`sovereign`), and **read-only**. It is the default landing page of the Sovereign portal and must never be served to unauthenticated visitors or to authenticated users without the `sovereign` role.

## Required roles

To reach `portals/sovereign.html` and route `/`:

- The session must hold the **`sovereign`** role bound to a specific tenant authority (scope: a domain or authority identifier such as `finance.gov.mu`).
- A user with multiple roles must have selected the sovereign portal via:
  - Direct URL (`portals/sovereign.html`),
  - Public site `User menu → Switch role → Sovereign Ops`,
  - Command palette `Go to → Sovereign portal` from another portal.

## Authentication binding

Production:

- Sovereign role is asserted by the IdP (`gov.mu OIDC`) and bound to a specific authority scope.
- MFA is mandatory.
- Session lifetime defaults to `8h`.

Prototype:

- Default mock user on the sovereign portal is `Marie Laurent` (`marie@finance.gov.mu`, role `sovereign`, scope `finance.gov.mu`).
- The dashboard's PageHeader subtitle in the prototype is hard-coded to `Mauritius Ministry of Finance — strategic view across the registry.`; production must replace with the **active sovereign authority's display name** drawn from the session.

## Per-element gating

| UI element | Required role(s) | Notes |
|------------|------------------|-------|
| Sidebar item `Dashboard` | `sovereign` | Sidebar gated by portal entry. |
| Sidebar items `Catalog`, `Topology`, `Sectors`, `Risk`, `Policies`, `Incidents`, `Partners`, `Reports`, `Settings` | `sovereign` | All read-only on the sovereign portal. |
| `Open national report` button | `sovereign` | Read-only nav. |
| StatCard counters | `sovereign` | Aggregate; no per-caller data. |
| Topology widget | `sovereign` | Slug-level only; no per-caller data. |
| Heatmap widget | `sovereign` | Aggregate counts; no per-caller data. |
| Risk timeline | `sovereign` | Composite scores only; methodology is documented separately. |

## Read-only invariants the UI must respect

- The sovereign portal is observational by design. The dashboard MUST NOT offer write actions.
- Cross-tenant data DOES NOT leak: the topology, heatmap, and risk widgets are scoped to the active sovereign tenant (`finance.gov.mu` in the v0.4 mock), not "all sovereigns globally".
- Cross-border calls (Tier-3) are aggregated server-side and only the count + delta are surfaced; the per-call destinations are not on this page.

## Negative cases

- **Authenticated, no `sovereign`:** the dashboard MUST 403 server-side and the SPA MUST render a "You don't have sovereign access" empty state with a `Go to your portal` CTA.
- **Sovereign role with insufficient scope** (e.g. a sovereign of `health.gov.mu` viewing a finance-scoped dashboard): 403 with detail `Authority mismatch.`
- **Stale session:** 401 forces sign-out.

## Audit obligations

The dashboard route is read-only and writes nothing to the audit ledger. Sovereign-driven actions on linked routes (e.g. publishing a national report) write their own audit rows in their respective modules.

## Data residency

- All four data domains (summary, topology, heatmap, risk) are tenant-scoped via session-derived authority.
- Cross-tenant aggregation is **not** performed at the dashboard layer.
- The national report PDF is signed and dated; production must serve from the tenant's region with `Content-Disposition: attachment` and `Cache-Control: no-store`.
