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

# Verifier · Queue module — Permissions and access

## Surface classification

The Queue route is **authenticated**, **role-gated** (`verifier`), and **write-capable** via the planned decision drawer.

## Required roles

To reach `portals/verifier.html#/queue`:

- The session must hold the `verifier` role bound to a verifier scope (e.g. `sovereignty-board`).
- MFA mandatory.

To decide a review (production endpoint):

- `POST /verifier/queue/{id}/decision` requires `verifier` AND the actor MUST be `assigned` to that review (or be a delegated escalation reviewer per `Settings → Verifier delegation` admin setting).

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Open reviews` | `verifier` | Sidebar gated by portal entry. |
| Sidebar badge | `verifier` | Driven by row count. |
| DataTable rows | `verifier` | Visible to any verifier seat in the active collegium. |
| Decision drawer (production) | `verifier` + `assigned == actor` | Decisions require alignment between the actor and the review's `assigned` field. |
| Approve / Reject / Withdraw buttons | `verifier` + `assigned == actor` | UI MUST hide these if the actor is not the assignee. |

## Sensitive value handling

- The list response (`GET /verifier/queue`) does NOT include the submission body — only the queue metadata. The body is fetched on row open via `GET /verifier/queue/{id}`.
- The submission body MAY contain sensitive content (proprietary methodology, model configuration). Production must:
  - Treat the body as confidential at rest.
  - Run the same DLP scan that admin uses on resource bodies.
  - Never log the body in telemetry.

## Audit obligations

- Reading the queue writes nothing to the audit ledger.
- POST `/verifier/queue/{id}/decision` writes one of:
  - `review.approve`
  - `review.reject`
  - `review.withdraw`

  The decision row captures: actor, review id, target slug, body (≥12 chars), and a paired `resource.status_changed` row on the target.

## Negative cases

- **Authenticated, no `verifier`:** 403 server-side; SPA renders "You don't have verifier access" empty state.
- **Verifier not assigned to the row:** 403 with detail `You are not the assigned reviewer.` Production UI MUST hide the decision buttons up-front.
- **Body shorter than 12 characters:** 400 with field error.
- **Stale session:** 401 forces sign-out.

## Read-only invariants for non-assignees

- A verifier seat that is NOT assigned to a row can READ the row metadata + drawer body but MUST NOT be able to decide. The UI MUST visibly indicate the read-only state ("You're not the assigned reviewer for this submission.").

## Data residency

- Queue rows are tenant-scoped via session-derived authority.
- Submission bodies are stored in the tenant region; cross-region replication is not implied.
- Decision audit rows are written to the canonical sovereign tenant's ledger.
