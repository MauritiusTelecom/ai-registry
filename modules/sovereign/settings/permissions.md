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

# Sovereign · Settings module — Permissions and access

## Surface classification

The Settings route is **authenticated**, **role-gated** (`sovereign`), and **write-capable** (single PATCH endpoint).

## Required roles

To reach `portals/sovereign.html#/settings`:

- The session must hold the `sovereign` role bound to the active sovereign authority.
- MFA mandatory.

To save settings:

- `PATCH /sovereign/settings` requires `sovereign` + scope `global` (the sovereignty-board level). Non-board sovereign seats can read but not save.
- An `Authority` change (security-sensitive, governance-locked) additionally requires second-actor approval (4-eyes); production tenants pick.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Settings` | `sovereign` | Sidebar gated by portal entry. |
| Operator field | `sovereign` (read), `sovereign` + `global` (save) | |
| Authority field | `sovereign` (read), `sovereign` + `global` + 4-eyes (save) | Confirmation dialog required. |
| Reporting cadence field | `sovereign` (read), `sovereign` + `global` (save) | |

## Sensitive value handling

- **`operator`** — operator name; surfaces in audit ledger entries from this seat. Production validates that the new name belongs to a current sovereign-role user.
- **`authority`** — display label that appears on the public site, dashboard, and national reports. Treat as governance-published content; production should require the 4-eyes flow.
- **`reportingCadence`** — operational schedule; not sensitive but affects when national reports surface publicly.

## Audit obligations

Every PATCH writes a row to the immutable audit ledger with the parent `traceId`:

- `PATCH /sovereign/settings` → one of `sovereign.settings.<field>.changed` per dirty field (e.g. `sovereign.settings.cadence.changed`).
- An `authority` change additionally writes `sovereign.authority.changed` capturing prior + new value AND the second-actor approver.

## Negative cases

- **Authenticated, no `sovereign`:** 403 server-side.
- **`sovereign` without `global` scope edits a field:** save returns 403; preferred UX is to disable inputs up-front with a tooltip `Sovereignty-board role required to change settings.`
- **`operator` change to a non-sovereign-user email:** 422 with detail `Operator must be a current sovereign-role user.`
- **Concurrent save (409):** SPA surfaces a banner `Settings changed by ${updatedBy}. Reload to see the latest.`

## Data residency

- Profile is tenant-scoped; one row per sovereign tenant.
- Cross-tenant settings replication is **not** implied.
- The `authority` label is allowed to contain non-ASCII characters (e.g. "République de Maurice") — production must handle UTF-8 round-trip cleanly.
