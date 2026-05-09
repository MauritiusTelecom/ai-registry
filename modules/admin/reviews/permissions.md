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

# Admin · Reviews module — Permissions and access

## Surface classification

The Reviews route is **authenticated** and **role-gated**. Reading the queue requires `admin`. Writing a decision (in production) additionally requires `verifier`.

## Required roles

To reach `portals/admin.html#/reviews`:

- The session must hold the `admin` role for the active sovereign tenant.
- MFA mandatory.

To act on a review (production-only endpoints):

- `POST /admin/reviews/{id}/assign` → `admin` (changing assignee).
- `POST /admin/reviews/{id}/decision` → `verifier` AND the actor MUST equal `assigned` (or be a delegated escalation reviewer per `Settings → Verifier delegation`).
- `POST /admin/reviews` (`New review`) → `admin`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Review queue` | `admin` | Sidebar gated by portal entry. |
| Sidebar badge | `admin` | Driven by `total` from list endpoint. |
| `New review` (header) | `admin` | Initiates write. |
| StatCard counters | `admin` | Aggregate; no PII. |
| DataTable rows | `admin` | Non-interactive on this page in v0.4. |
| Decision endpoints (production) | `verifier` + `assigned == actor` | Not exposed on this page; lives on the planned detail route. |

## Sensitive cell handling

- **`assigned`** values are reviewer email addresses (e.g. `sanjay@review.mu`). Display as authored. Respect `audit.actor.redact` policy if enabled.
- **`target`** is the resource slug; not sensitive but identifies the resource under scrutiny.

## Audit obligations

Every state-changing call writes to the audit ledger with the parent `traceId`:

- POST `/admin/reviews` → `review.create`
- POST `/admin/reviews/{id}/assign` → `review.assign` (capturing both prior and new `assigned`)
- POST `/admin/reviews/{id}/decision` →
  - `review.approve` if `decision === 'approve'`
  - `review.reject`  if `decision === 'reject'`
  - `review.withdraw` if `decision === 'withdraw'`
- Each decision MUST also write a paired status change on the target resource (e.g. `resource.status_changed` from `review` → `verified` on approve).

## Negative cases

- **Authenticated, no `admin`:** 403 server-side; SPA renders "You don't have admin access" empty state.
- **Stale session:** 401 forces sign-out.
- **Decide without being assigned:** 403 with `Problem` body `You are not the assigned reviewer.` Production UI MUST hide the decision buttons in this case to avoid wasted clicks.
- **Decide with `body.length < 12`:** 400 with field error; UI keeps the modal open and shows the validation message.

## Data residency

- Review rows are tenant-scoped via session-derived `tenantId`.
- A target resource that crosses sovereign tenants (e.g. a Tier-3 external model) creates one independent `Review` per tenant; cross-tenant deduplication is **not** implied.
