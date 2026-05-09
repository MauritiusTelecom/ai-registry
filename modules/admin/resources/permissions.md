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

# Admin · Resources module — Permissions and access

## Surface classification

The Resources route is **authenticated**, **role-gated**, and **write-capable**. It must never be served to unauthenticated visitors or to authenticated users without the `admin` role.

## Required roles

To reach `portals/admin.html#/resources`:

- The session must hold the `admin` role for the active sovereign tenant.
- MFA is mandatory (per `Settings → Identity → MFA enforcement` default `All roles`).
- Session lifetime defaults to `8h`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Resources` | `admin` | Sidebar gated by portal entry. |
| `Export CSV` (header) | `admin` | Read-only export; respects current filters. |
| `New resource` (header) | `admin` | Initiates write flow; production may scope further to `admin` + scope `global`. |
| FilterBar inputs | `admin` | No write effect; cosmetic + query parameters. |
| DataTable rows | `admin` | Click opens read-only drawer. |
| Drawer body | `admin` | Read-only display of provenance. |
| Drawer action `Re-verify` | `admin` | Triggers verification job (write). |
| Drawer action `Edit` | `admin` | Modifies the resource record (write). |
| Drawer action `Raise flag` | `admin` | Creates a `Flag`; cross-references `modules/admin/flags`. |
| Drawer action `Isolate` | `admin` | Status change to `isolated`; mandatory `reason` ≥12 chars. |

## Sensitive cell handling

- **`actor` and `provider` columns** may surface email addresses; respect tenant-level `audit.actor.redact` policy when present.
- **`risk = high` rows** are not hidden but production may render them with a subtle ring around the row to draw attention; UI state never branches on `risk` for permission, only for visual emphasis.
- **`status = isolated` rows** remain visible to admins. Non-admin actors hit the page-level 403 long before they can see any row.

## Write-action obligations

Every write button in the drawer MUST:

1. Append a record to the immutable audit ledger (action namespace `resource.<verb>`):
   - `Re-verify` → `resource.reverify.requested`
   - `Edit` → `resource.update`
   - `Raise flag` → `flag.create` (target = the resource id)
   - `Isolate` → `resource.isolate` (with `reason`)
2. Surface a confirmation toast with the audit `id` for traceability.
3. Refresh the row in the local `filtered` set so the table reflects state immediately.

## Negative cases

- **Authenticated, no `admin`:** 403 server-side; SPA renders "You don't have admin access" empty state with `Go to your portal` CTA.
- **Stale session:** any endpoint returning 401 forces a sign-out.
- **Concurrent edit conflict:** PATCH returns 409 with a `Problem` body containing the latest `updated`. UI MUST re-fetch and prompt `Resource changed since you opened the drawer. Reload?`.

## Data residency

- Catalogue rows are tenant-scoped via session-derived `tenantId`.
- The CSV export endpoint MUST also enforce tenant scoping; an `admin` of one sovereign cannot enumerate another sovereign's catalogue.
- `region` and `sov` are display fields; permission decisions never depend on them.
