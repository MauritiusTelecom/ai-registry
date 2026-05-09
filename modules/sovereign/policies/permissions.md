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

# Sovereign · Policies module — Permissions and access

## Surface classification

The Policies route is **authenticated**, **role-gated** (`sovereign`), and **read-only**.

## Required roles

To reach `portals/sovereign.html#/policies`:

- The session must hold the `sovereign` role bound to the active sovereign authority.
- MFA mandatory.

All endpoints are read-only. Policy authoring lives on the admin portal.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Policies` | `sovereign` | Sidebar gated by portal entry. |
| DataTable rows | `sovereign` | Read-only metadata. |
| Per-policy detail (production) | `sovereign` | Reveals the active body source for review only. |

## Cross-tenant isolation

- Policies listed here are scoped to the active sovereign tenant.
- Cross-tenant policy import / sharing is **not** implied by v0.4.

## Sensitive value handling

- The list response surfaces policy NAMES, scopes, and enforcement state. The policy BODY (Rego/CEL source) is NOT in the list payload — only in the per-policy detail (production-only) endpoint.
- Display of the body MUST NOT include any internal identifiers (e.g. tenant-internal codenames) without first running the same DLP scan used elsewhere.

## Audit obligations

- Reading the Policies page writes nothing to the audit ledger.
- Policy changes (admin-side) write `policy.create`, `policy.publish`, `policy.enforcement_changed` per `modules/admin/policies/permissions.md`.

## Negative cases

- **Authenticated, no `sovereign`:** 403 server-side; SPA renders "You don't have sovereign access" empty state.
- **Authority mismatch:** 403 with detail `Authority mismatch.`
- **Stale session:** 401 forces sign-out.

## Read-only invariants

- The sovereign portal MUST NOT offer any `Edit`, `Toggle enforcement`, or `Delete` affordance under any role on this page. Those actions are admin-only.
- A sovereign-board admin operating with both roles still uses the admin portal for changes.

## Data residency

- Policies are tenant-scoped via session-derived authority.
- Cross-tenant policy reuse is intentionally absent — each sovereign maintains its own catalogue.
