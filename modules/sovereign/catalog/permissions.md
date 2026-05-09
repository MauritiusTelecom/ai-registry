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

# Sovereign · Catalog module — Permissions and access

## Surface classification

The Catalog route is **authenticated**, **role-gated** (`sovereign`), and **read-only**. There are no write actions anywhere on this page.

## Required roles

To reach `portals/sovereign.html#/catalog`:

- The session must hold the `sovereign` role bound to a specific authority scope (e.g. `finance.gov.mu`).
- MFA mandatory.

All endpoints are read-only. No additional scope is required beyond `sovereign`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Catalog` | `sovereign` | Sidebar gated by portal entry. |
| DataTable rows | `sovereign` | Visible to any sovereign seat in the tenant. |

## Read-only invariants

- The sovereign portal NEVER mutates resources. The catalog list is observational only.
- Tier or risk reclassifications happen in the admin / verifier portals; this page surfaces the result.

## Sensitive cell handling

- Aggregate counts and tier / region metadata are not sensitive.
- The `risk` cell colour-code is paired with text — accessible without colour.
- The drawer (production) may surface DPIA outcomes; that flow MUST respect the same `audit.actor.redact` policy as admin.

## Audit obligations

The Catalog route writes nothing to the audit ledger. Telemetry events listed in `events.json` are UX signals.

## Negative cases

- **Authenticated, no `sovereign`:** 403 server-side; SPA renders "You don't have sovereign access" empty state.
- **Sovereign role with mismatched authority scope:** 403 with detail `Authority mismatch.`
- **Stale session:** 401 forces sign-out.

## Data residency

- Catalog rows are tenant-scoped via session-derived authority.
- Cross-tenant aggregation is **not** performed at the catalog layer.
- The `id` and `slug` are the same canonical identifiers used by admin / provider; cross-portal links are by id, not by an exposed external id.
