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

# Verifier · Decided module — Permissions and access

## Surface classification

The Decided route is **authenticated**, **role-gated** (`verifier`), and **read-only**. Decisions are immutable; the page never mutates state.

## Required roles

To reach `portals/verifier.html#/decided`:

- The session must hold the `verifier` role bound to a verifier scope.
- MFA mandatory.

All endpoints are read-only.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Decided` | `verifier` | Sidebar gated by portal entry. |
| DataTable rows | `verifier` | Visible to any verifier seat in the active collegium. |
| Decision detail drawer (production) | `verifier` | Read-only; surfaces the decision body and audit cross-link. |

## Sensitive value handling

- The decision body (≥12 chars) and the original submission body are returned ONLY by `GET /verifier/decided/{id}` (drawer payload). The list response does NOT include them.
- Verifier emails are surfaced in muted text. Respect tenant `audit.actor.redact` policy.
- Cross-link to the audit ledger row (`auditId`) is an opaque id; production must NOT echo the ledger row's full body unless the actor also has `admin` role.

## Audit obligations

Reading the Decided page writes nothing to the audit ledger. The decisions THEMSELVES are already in the ledger; this page just surfaces them.

## Read-only invariants

- Decisions are IMMUTABLE. The verifier portal MUST NOT offer `Reopen` or `Edit` affordances on this page under any role.
- Corrections to a decision require a NEW review (filed through admin's `/reviews` `New review` action) and a paired `review.amend` audit row; the original `/decided` row stays as-is.

## Negative cases

- **Authenticated, no `verifier`:** 403 server-side.
- **Authority mismatch:** 403 with detail `Authority mismatch.`
- **Stale session:** 401 forces sign-out.

## Data residency

- Rows are tenant-scoped via session-derived authority + verifier scope.
- The list defaults to the current verifier's own decisions; production may add a `verifier=all` toggle for collegium-wide history.
- Audit ledger rows referenced by `auditId` live in the tenant region.
