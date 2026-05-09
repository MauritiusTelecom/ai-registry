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

# Sovereign · Incidents module — Permissions and access

## Surface classification

The Incidents route is **authenticated**, **role-gated** (`sovereign`), and **read-only**. Sovereign operators consume incidents elevated by admin/provider; they do not create or close incidents from this surface.

## Required roles

To reach `portals/sovereign.html#/incidents`:

- The session must hold the `sovereign` role bound to the active sovereign authority.
- MFA mandatory.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Incidents` | `sovereign` | Sidebar gated by portal entry. |
| Sidebar badge | `sovereign` | Driven by `openCount` from list endpoint. |
| DataTable rows | `sovereign` | Read-only. |
| Detail drawer (production) | `sovereign` | Read-only timeline + cross-links. |

## Sensitive value handling

- **`target`** is a resource slug; not sensitive.
- **`kind`** is operator-curated free-form prose; production should run the same DLP scan applied to admin / provider incident bodies before surfacing.
- The detail drawer (production) cross-links to admin `Flag` and provider `Incident` records but does NOT echo their full bodies — only summary metadata. The sovereign role has READ access to those cross-links; clicking through opens the corresponding admin / provider record in a new tab if the user holds those roles.

## Audit obligations

- Reading the Incidents page writes nothing to the audit ledger.
- Sovereign-side comments / decisions on the planned detail route write `sovereign.incident.commented` / `sovereign.incident.resolved`.

## Negative cases

- **Authenticated, no `sovereign`:** 403 server-side.
- **Authority mismatch:** 403 with detail `Authority mismatch.`
- **Stale session:** 401 forces sign-out.

## Read-only invariants

- The sovereign portal MUST NOT offer `Raise incident` or `Resolve incident` affordances on this page. Closing a sovereign-side incident is a separate action from closing the underlying provider/admin record.

## Data residency

- Incident rows are tenant-scoped via session-derived authority.
- Cross-tenant incident sharing is **not** implied by v0.4. A health-sector PHI incident in MU does NOT propagate to other sovereign tenants automatically.
