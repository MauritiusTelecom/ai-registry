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

# Verifier · Red-team module — Permissions and access

## Surface classification

The Red-team route is **authenticated**, **role-gated** (`verifier`), and **write-capable** via creation and triage actions.

## Required roles

To reach `portals/verifier.html#/redteam`:

- The session must hold the `verifier` role bound to a verifier scope.
- MFA mandatory.

To act on findings (production endpoints):

- `POST /verifier/redteam` (`New finding`) → `verifier`.
- `POST /verifier/redteam/{id}/review` → `verifier`.
- `POST /verifier/redteam/{id}/resolve` → `verifier` + `sovereignty-board` (closing a finding is collegium-only).
- `POST /verifier/redteam/{id}/reopen` → `verifier` + `sovereignty-board`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Red-team` | `verifier` | Sidebar gated by portal entry. |
| Sidebar badge | `verifier` | Driven by `openCount` from list endpoint. |
| `New finding` (header) | `verifier` | Initiates write. |
| DataTable rows | `verifier` | Visible to all collegium members. |
| Triage actions (production drawer) | `verifier` (review) / `verifier` + `sovereignty-board` (resolve / reopen) | |
| Finding body / reproduction (drawer) | `verifier` + `sovereignty-board` | High-severity reproductions are collegium-internal until disclosure. |

## Sensitive value handling

- **Vector prose** (free-form attack vector description) is operationally sensitive — surfaceable to verifier seats in the collegium but never publicly until disclosure.
- **Body / reproduction steps** (drawer payload) MUST be treated as confidential at rest and in transit.
- **Public disclosure** (high-severity findings) follows a 90-day clock; production must surface the timer in the drawer and respect any embargo set on the finding.
- DLP scans MUST run on the `body` field at submission time.

## Audit obligations

Every state-changing call writes to the audit ledger with the parent `traceId`:

- POST `/verifier/redteam` → `redteam.create`
- POST `/verifier/redteam/{id}/review` → `redteam.review`
- POST `/verifier/redteam/{id}/resolve` → `redteam.resolve` (capturing mitigation `body`)
- POST `/verifier/redteam/{id}/reopen` → `redteam.reopen` (capturing `body`)
- High-severity create also writes `pagerduty.dispatch` (best-effort) once the integration acknowledges.

## Negative cases

- **Authenticated, no `verifier`:** 403 server-side.
- **Resolve / reopen without `sovereignty-board`:** 403 with detail `Collegium membership required.`
- **Resolve a finding already resolved:** 409.
- **Reopen a finding not in resolved:** 409.
- **Stale session:** 401 forces sign-out.

## Disclosure timer

- High-severity findings start a 90-day clock at creation.
- The clock pauses when status moves to `review` (or `resolved`).
- Findings still `open` past 90 days are eligible for public disclosure; production must NOT auto-publish — disclosure requires an explicit collegium decision.

## Data residency

- Findings are tenant-scoped via session-derived authority.
- Cross-tenant red-team coordination (e.g. if `model/openai-gpt-6` has a finding in MU and FR) is informational only — the rows remain in their respective tenants.
- Public disclosure (when it happens) goes through the public site's separate publication endpoint, NOT this admin surface.
