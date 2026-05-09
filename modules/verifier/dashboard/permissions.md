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

# Verifier · Dashboard module — Permissions and access

## Surface classification

The verifier dashboard is **authenticated** and **role-gated** (`verifier`). It is the default landing page of the Verifier portal.

## Required roles

To reach `portals/verifier.html` and route `/`:

- The session must hold the **`verifier`** role bound to a verifier scope (e.g. `sovereignty-board`, or a tenant-specific verifier organisation).
- A user with multiple roles (e.g. `verifier` + `admin`) must have selected the verifier portal explicitly.

## Authentication binding

Production:

- Verifier role asserted by IdP claim. MFA mandatory.
- Session lifetime defaults to `8h`.

Prototype:

- Default mock user on the verifier portal is `Sanjay Boodhoo` (`sanjay@review.mu`, role `verifier`, scope `sovereignty-board`).

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Dashboard` | `verifier` | Sidebar gated by portal entry. |
| Sidebar items `Open reviews`, `Decided`, `Benchmarks`, `Eval runs`, `Red-team`, `Reports`, `Settings` | `verifier` | Each route has its own per-element gating; see those modules. |
| `Open next in queue` button | `verifier` | Initiates a navigation + row selection. |
| `See all` queue link | `verifier` | Read-only nav. |
| StatCard counters | `verifier` | Aggregate; no PII. |
| Top of queue rows | `verifier` | Identifying review id + provider; not PII. |
| Active red-team rows | `verifier` | Vector descriptions are operationally sensitive but not PII; respect tenant `audit.actor.redact` policy. |

## Sensitive data handling

- **Vector descriptions** in red-team findings (`r.vector`) MAY describe attack methodologies. Production should:
  - Run the same DLP scan that admin / provider use on their bodies.
  - Ensure they are visible only to verifier-role users (already gated).
  - Never echo to telemetry.

## Audit obligations

The dashboard route is read-only. State-changing actions on linked routes write to the audit ledger:

- Decision on `/queue` row → `review.approve | review.reject | review.withdraw`
- Run a benchmark on `/benchmarks` → `eval.run.started`
- Open / resolve a red-team finding on `/redteam` → `redteam.opened | redteam.resolved`
- Publish a verifier report on `/reports` → `verifier.report.published`

The dashboard itself writes nothing.

## Negative cases

- **Authenticated, no `verifier`:** dashboard MUST 403 server-side; SPA renders "You don't have verifier access" empty state.
- **Verifier with mismatched scope:** 403 with detail `Scope mismatch — review board membership required.`
- **Stale session:** 401 forces sign-out.

## Data residency

- All four data domains (summary, queueTop, activeRedteam, decision history surfaced via `/decided`) are scoped to the active verifier collegium / tenant.
- Cross-collegium visibility is **not** allowed by default; production may add federation between collegiums for joint reviews (out of scope here).
