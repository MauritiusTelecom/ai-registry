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

# Sovereign · Sectors module — Permissions and access

## Surface classification

The Sectors route is **authenticated**, **role-gated** (`sovereign`), and **read-only**.

## Required roles

To reach `portals/sovereign.html#/sectors`:

- The session must hold the `sovereign` role bound to the active sovereign authority.
- MFA mandatory.

All endpoints are read-only.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Sectors` | `sovereign` | Sidebar gated by portal entry. |
| Sector cards | `sovereign` | Aggregate counts; no PII. |
| Card click (production) | `sovereign` | Navigates to `/catalog?sector=…`. |
| Per-sector series endpoint | `sovereign` | Aggregate; no PII. |

## Cross-tenant isolation

- Sector counts and growth figures are scoped to the active sovereign tenant.
- Cross-tenant aggregation is **not** performed at the sectors layer.

## Sensitive data handling

- Aggregate counts only — no per-resource details on this page.
- The growth percentage is a comparison of two 30-day windows; production must compute server-side and surface only the display string.

## Audit obligations

The Sectors route is read-only and writes nothing to the audit ledger.

## Negative cases

- **Authenticated, no `sovereign`:** 403 server-side; SPA renders "You don't have sovereign access" empty state.
- **Authority mismatch:** 403 with detail `Authority mismatch.`
- **Stale session:** 401 forces sign-out.

## Data residency

- Sector aggregates are computed in the tenant region from the local catalogue.
- The sector taxonomy is shared across the registry (curated in `airegistry-specs/shared/`); the counts are tenant-specific.
