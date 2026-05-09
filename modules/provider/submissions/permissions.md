<!--
 Copyright 2026 rakesh.khoodeeram

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except compliance with the License.
 You may obtain a copy of the License at

     https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
-->

# Provider · Submissions module — Permissions and access

## Surface classification

The Submissions route is **authenticated** and **role-gated** (`provider`). Reading the list requires `provider` (any scope). Withdrawing an open submission requires `provider` + `publish:write`.

## Required roles

To reach `portals/provider.html#/submissions`:

- The session must hold the `provider` role bound to the active provider's `providerId`.
- MFA mandatory.

To act on submissions (production endpoints):

- `GET /provider/submissions` → `provider`.
- `GET /provider/submissions/{id}` → `provider`.
- `POST /provider/submissions/{id}/withdraw` → `provider` + scope `publish:write`.

## Per-element gating

| UI element | Required role / scope | Notes |
|------------|------------------------|-------|
| Sidebar item `Submissions` | `provider` | Sidebar gated by portal entry. |
| Sidebar badge | `provider` | Driven by `openCount` from list endpoint. |
| DataTable rows | `provider` | Non-interactive on this page in v0.4. |
| Withdraw action (production detail) | `provider` + `publish:write` | Reason ≥12 chars; rejected with 409 if submission is terminal. |
| Resubmit action (production detail) | `provider` + `publish:write` | Navigates to `/publish` pre-filled. |

## Cross-provider isolation

A `provider` of `eduMu` cannot see `anthropic.com`'s submissions. Production MUST scope every query by `providerId` from the session. Submissions reference resource slugs that are tenant-unique; an attacker that submits a slug another provider already owns would be rejected at publish time.

## Sensitive data handling

- **`target`** — composite resource slug + optional version. Not sensitive but identifies the resource under review.
- **Decision history** (detail endpoint) — includes reviewer email and free-form comment body. Respect tenant `audit.actor.redact` policy if enabled.
- **Withdrawal `reason`** — free-form. Stored verbatim in the audit ledger; production must run the same DLP scan as on resource bodies.

## Audit obligations

- `POST /provider/submissions/{id}/withdraw` → `submission.withdrawn` (capturing `reason`).
- The verifier portal's `Decide review` flow writes `review.approve | review.reject | review.withdraw` paired with the matching `submission.<status>_changed` row.
- Reading the list / detail does NOT write to the ledger.

## Negative cases

- **Authenticated, no `provider`:** 403 server-side; SPA renders "You don't have provider access" empty state.
- **Withdraw on terminal submission:** 409 with `Problem` body `Submission already closed.` UI MUST refresh the row.
- **`provider` without `publish:write` clicks Withdraw:** UI should pre-disable the button with a tooltip; if the call goes through anyway, server returns 403.
- **Stale session:** 401 forces sign-out.

## Data residency

- Submission rows are tenant-scoped via session-derived `providerId`.
- A submission whose target is a Tier-3 external model (e.g. `model/anthropic-sonnet-7`) belongs to the local sovereign tenant; cross-tenant fan-out is **not** implied.
- Decision histories are tenant-scoped; reviewer comments do not leak across tenants even when the same resource is published in multiple sovereign tenants.
