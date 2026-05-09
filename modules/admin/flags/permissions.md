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

# Admin · Flags module — Permissions and access

## Surface classification

The Flags route is **authenticated** and **role-gated** (`admin`). Reading the queue and raising new flags both require `admin`. Resolving requires `admin` plus optional verifier delegation.

## Required roles

To reach `portals/admin.html#/flags`:

- The session must hold the `admin` role for the active sovereign tenant.
- MFA mandatory.

To act on a flag (production endpoints):

- `POST /admin/flags` (`Raise flag`) → `admin`.
- `POST /admin/flags/{id}/escalate` → `admin`.
- `POST /admin/flags/{id}/resolve` → `admin`. Tenants MAY further restrict to `verifier` per `Settings → Verifier delegation`.
- `POST /admin/flags/{id}/reopen` → `admin`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Flags & incidents` | `admin` | Sidebar gated by portal entry. |
| Sidebar badge | `admin` | Driven by `openCount` from list endpoint. |
| `Raise flag` (header) | `admin` | Initiates write. |
| DataTable rows | `admin` | Non-interactive on this page in v0.4. |
| Triage actions (production) | `admin` (+ `verifier` for resolve) | Surfaced on planned detail route. |

## Sensitive cell handling

- **`raisedBy`** values are either email addresses (e.g. `sanjay@review.mu`) or `auto/<rule>` system identifiers. Display verbatim. Respect tenant-level `audit.actor.redact` policy when applicable.
- **`target`** is the resource slug under suspicion; not sensitive but cross-references the resource catalogue.
- **`kind`** values may name internal rules (`auto/dlp`, `auto/eval`, `auto/license-scan`); production must NOT leak rule internals to non-admin actors.

## Audit obligations

Every state-changing call writes to the audit ledger with the parent `traceId`:

- POST `/admin/flags` → `flag.create`
- POST `/admin/flags/{id}/escalate` → `flag.escalate` (with `reviewId` if provided)
- POST `/admin/flags/{id}/resolve` → `flag.resolve` (capturing `body`)
- POST `/admin/flags/{id}/reopen` → `flag.reopen` (capturing `body`)
- A `severity === 'high'` flag creation also writes `pagerduty.dispatch` (best-effort) once the integration acknowledges.

## Negative cases

- **Authenticated, no `admin`:** 403 server-side; SPA renders "You don't have admin access" empty state.
- **Stale session:** 401 forces sign-out.
- **Resolve a flag that is already `resolved`:** 409 with `Problem` body `Flag is already resolved.` UI MUST refresh the row.
- **Reopen a flag that is `open` or `review`:** 409 with `Problem` body `Flag is not resolved.`
- **Body shorter than 12 characters on resolve / reopen:** 400 with field error; UI keeps modal open and shows the validation message.

## Data residency

- Flag rows are tenant-scoped via session-derived `tenantId`.
- A flag with `target` referencing a Tier-3 external model still belongs to the local sovereign tenant; cross-tenant fan-out is **not** implied.
- PagerDuty dispatch payload MUST NOT include the flag `body` (which may contain sensitive context) — only `id`, `target`, `severity`, and a short summary.
