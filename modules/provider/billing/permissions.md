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

# Provider · Billing module — Permissions and access

## Surface classification

The Billing route is **authenticated** and **role-gated** (`provider`). Reading statements requires `provider`. Disputing or downloading invoices requires `provider` + role `owner`.

## Required roles

To reach `portals/provider.html#/billing`:

- The session must hold the `provider` role bound to the active provider's `providerId`.
- MFA mandatory.

To act on statements (production endpoints):

- `GET /provider/billing` → `provider`.
- `GET /provider/billing/{periodIso}` → `provider`.
- `GET /provider/billing/{periodIso}/invoice.pdf` → `provider` + `owner`.
- `POST /provider/billing/{periodIso}/dispute` → `provider` + `owner`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Billing` | `provider` | Sidebar gated by portal entry. |
| DataTable rows | `provider` | Visible to all provider seats; non-interactive in v0.4. |
| Download invoice (production detail) | `provider` + `owner` | PDF carries cost figures and bank details. |
| Dispute action (production detail) | `provider` + `owner` | Mutates billing state. |

## Sensitive data handling

- **`amount`** with `tier !== 'Sovereign'` is commercially sensitive; not surfaced beyond the provider tenant.
- **Invoice PDF** — signed and dated; contains the tenant's billing address. Treat as confidential; downloads MUST be served with `Content-Disposition: attachment` and `Cache-Control: no-store`.
- **Bank details (for paid tiers)** — never returned by the JSON endpoints; live only inside the PDF behind the owner-gated download.

## Audit obligations

- `GET /provider/billing/{periodIso}/invoice.pdf` (200) → `billing.invoice.downloaded`.
- `POST /provider/billing/{periodIso}/dispute` → `billing.statement.disputed` (capturing `reason`).
- Statement issuance is system-driven and writes `billing.statement.issued` (NOT user-driven; no UI emits it).

## Negative cases

- **Authenticated, no `provider`:** 403 server-side; SPA renders "You don't have provider access" empty state.
- **`provider` without `owner` clicks Download / Dispute:** UI MAY surface the action but submit returns 403; preferred UX is to disable up-front with tooltip.
- **Download invoice for sovereign-tier statement:** 404 with detail `Sovereign-tier statements have no invoice.` UI must surface this clearly (the prototype's `Sovereign` rows should not display a Download button at all).
- **Stale session:** 401 forces sign-out.

## Data residency

- Statements are tenant-scoped via session-derived `providerId`.
- Invoice PDFs are stored in the tenant's region; the download endpoint serves directly from that region with no caching at the edge.
- Currency codes follow the tenant's onboarding choice; production rejects multi-currency on a single tenant.
