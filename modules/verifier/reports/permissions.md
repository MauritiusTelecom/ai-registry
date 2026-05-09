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

# Verifier · Reports module — Permissions and access

## Surface classification

The Reports route is **authenticated**, **role-gated** (`verifier`), and **write-capable** via `Draft report` and `Sign`. Once signed, reports are immutable.

## Required roles

To reach `portals/verifier.html#/reports`:

- The session must hold the `verifier` role bound to a verifier scope.
- MFA mandatory.

To act on reports:

- `POST /verifier/reports` (`Draft report`) → `verifier`.
- `POST /verifier/reports/{id}/sign` → `verifier` + `sovereignty-board`.
- `GET /verifier/reports/{id}/file.pdf` → `verifier`. Embargoed reports return 403 until the embargo lifts.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Reports` | `verifier` | Sidebar gated by portal entry. |
| `Draft report` (header) | `verifier` | Any verifier seat may start a draft. |
| Report cards | `verifier` | Visible to all collegium members. |
| `View` (per card) | `verifier` | Opens signed URL in new tab. |
| `Download PDF` (per card) | `verifier` | Streams PDF with `Content-Disposition: attachment`. |
| Signed badge | (display only) | Renders when `r.signed === true`. |
| `Sign` (production drawer) | `verifier` + `sovereignty-board` | Adds the actor as a signer. |

## Sensitive value handling

- **Report PDFs** are public-facing post-signing — but during the draft phase they are collegium-internal. Production must enforce:
  - Drafts are visible only to `verifier` + `sovereignty-board`.
  - Signed (published) reports are visible to all `verifier` seats.
  - Public mirroring (separate flow) is gated by an explicit publication action.
- **Signed URLs** for the PDF have short TTL (≤5 minutes); production must regenerate on each `View`.
- **Cache-Control** on PDF responses: `no-store`.

## Audit obligations

Every state-changing call writes to the audit ledger with the parent `traceId`:

- POST `/verifier/reports` → `verifier.report.draft_created`
- POST `/verifier/reports/{id}/sign` → `verifier.report.signed` (capturing actor, key fingerprint)
- A signature that crosses the threshold flips `signed` to `true` and additionally writes `verifier.report.published`.
- `Download PDF` writes `verifier.report.downloaded` capturing actor + report id + timestamp.

## Negative cases

- **Authenticated, no `verifier`:** 403 server-side.
- **Sign without `sovereignty-board`:** 403 with detail `Collegium membership required to sign.`
- **Sign by an actor who already signed:** 409 `You have already signed this report.`
- **Download an embargoed report:** 403 with detail `Embargoed until ${embargoUntil}.`
- **Stale session:** 401 forces sign-out.

## Read-only invariants for signed reports

- A report with `signed === true` is IMMUTABLE. The verifier portal MUST NOT offer `Edit body` or `Re-sign` affordances under any role.
- Corrections require a NEW report (with a footer note pointing at the original); the original row stays as-is.

## Data residency

- Reports (draft + signed) are tenant-scoped via session-derived authority.
- PDF storage is in the tenant region.
- Public mirroring (signed reports only) goes through the public site's separate publication endpoint.
