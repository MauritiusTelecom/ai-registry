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

# Sovereign · Reports module — Permissions and access

## Surface classification

The Reports route is **authenticated**, **role-gated** (`sovereign`), and **read + download**. Sovereign operators cannot author or publish reports from this surface in v0.4 — those happen through a separate authoring flow (out of scope here).

## Required roles

To reach `portals/sovereign.html#/reports`:

- The session must hold the `sovereign` role bound to the active sovereign authority.
- MFA mandatory.

To download a report PDF:

- `GET /sovereign/reports/{id}/file.pdf` requires `sovereign`. Sensitive reports (e.g. health sector audit) MAY require `sovereign` + scope `global`; production tenants pick.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Reports` | `sovereign` | Sidebar gated by portal entry. |
| Card head + meta | `sovereign` | Public-curated metadata. |
| `View` button | `sovereign` | Opens signed URL in new tab. |
| `Download` button | `sovereign` (+ `global` for sensitive reports) | Streams PDF with `Content-Disposition: attachment`. |

## Sensitive value handling

- **Report PDFs** are tenant-confidential by default. Some reports (e.g. health sector audits) MAY contain sensitive content; production must mark such reports with a `sensitivity` flag and gate `Download` accordingly.
- **Signed URLs** for the PDF have short TTL (≤5 minutes); production must regenerate on each `View` click.
- **Cache-Control** on PDF responses: `no-store` — never cached at the edge or by intermediaries.

## Audit obligations

- Reading the Reports page writes nothing to the audit ledger.
- `Download` events write `report.downloaded` capturing actor, report id, and timestamp.
- Report publication (out of scope here) writes `report.published`.

## Negative cases

- **Authenticated, no `sovereign`:** 403 server-side; SPA renders "You don't have sovereign access" empty state.
- **Authority mismatch:** 403 with detail `Authority mismatch.`
- **Report withdrawn after publication:** 410 Gone with `Problem` body explaining the withdrawal.
- **Stale signed URL (TTL expired):** 403 from object storage; SPA refetches the URL and retries once.

## Read-only invariants

- The sovereign portal MUST NOT offer `Publish report` or `Edit report` affordances on this page. Authoring lives in a separate workflow.

## Data residency

- Report PDFs are stored in the tenant region.
- Cross-tenant report sharing is **not** implied by v0.4. Each sovereign maintains its own report archive.
- Public mirroring of select reports (e.g. quarterly sovereignty reviews) goes through the public site's separate publication endpoint, not this admin surface.
