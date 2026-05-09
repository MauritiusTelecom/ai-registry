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

# Admin · Policies module — Permissions and access

## Surface classification

The Policies route is **authenticated** and **role-gated** (`admin`). Reading the catalogue requires `admin`. Publishing or toggling enforcement of a policy is a privileged write that production may further gate to `admin` + scope `global` (a sovereignty-board-level role) per `Settings → Sovereignty defaults`.

## Required roles

To reach `portals/admin.html#/policies`:

- The session must hold the `admin` role for the active sovereign tenant.
- MFA mandatory.

To act on policies (production endpoints):

- `POST /admin/policies` (`New policy`) → `admin` + scope `global`.
- `POST /admin/policies/{id}/versions` → `admin` + scope `global`.
- `POST /admin/policies/{id}/enforce` → `admin` + scope `global`.
- `GET /admin/policies/{id}/versions` → `admin` (read-only).

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Policies` | `admin` | Sidebar gated by portal entry. |
| `New policy` (header) | `admin` + scope `global` | Production may surface a tooltip "Requires sovereignty-board role" if scope insufficient. |
| DataTable rows | `admin` | Non-interactive on this page in v0.4. |
| Policy authoring (production) | `admin` + scope `global` | Lives on planned create / detail routes. |
| Enforcement toggle (production) | `admin` + scope `global` | Subject to 24h shadow guard. |

## Sensitive cell handling

- **`name`, `scope`, `version`, `updated`** — non-sensitive metadata; render verbatim.
- **`enforced`** — boolean; UI maps to `YES` / `NO`. The literal letters are part of the spec; do not localise without versioning.
- The policy **body** (Rego/CEL source) is NOT surfaced on this list page. Production must NOT include it in the list response payload (large blob; surface only in the detail / version endpoints).

## Audit obligations

Every state-changing call writes to the audit ledger:

- POST `/admin/policies` → `policy.create`
- POST `/admin/policies/{id}/versions` → `policy.publish` (capturing version, hash, publisher)
- POST `/admin/policies/{id}/enforce` → `policy.enforcement_changed` (capturing prior and new `enforced`, plus `body` reason)
- Each policy violation captured by the policy decision point writes `policy.violation` (system-generated, surfaced on `/audit` and aggregated on the dashboard StatCard `Policy violations`).

## Negative cases

- **Authenticated, no `admin`:** 403 server-side; SPA renders "You don't have admin access" empty state.
- **`admin` without scope `global` clicks `New policy`:** UI MAY surface the modal but submit MUST fail with 403; better UX is to disable the button with a tooltip explaining the missing scope.
- **`enforced=true` rejected by 24h shadow guard:** 422 with detail `Policy version must run in shadow mode for at least 24 hours before enforcement.` UI keeps the toggle off and surfaces the message inline.

## Data residency

- Policy rows are tenant-scoped via session-derived `tenantId`.
- Cross-tenant policy import / export is **not** implied by v0.4. If implemented, it MUST go through the same `policy.create` audit path and version stays at `v1.0` of the local copy.
- Policy bodies may reference internal identifiers; production MUST NOT cross-link a policy body to another tenant's resource ids.
