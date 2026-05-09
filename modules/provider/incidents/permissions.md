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

# Provider · Incidents module — Permissions and access

## Surface classification

The Incidents route is **authenticated** and **role-gated** (`provider`). Reading the list and reporting an incident require `provider`. Investigating, resolving, reopening, and toggling public visibility are privileged actions; `Public` toggle additionally requires the provider org `owner` role.

## Required roles

To reach `portals/provider.html#/incidents`:

- The session must hold the `provider` role bound to the active provider's `providerId`.
- MFA mandatory.

To act on incidents (production endpoints):

- `POST /provider/incidents` (`Report incident`) → `provider`.
- `POST /provider/incidents/{id}/investigate` → `provider`.
- `POST /provider/incidents/{id}/resolve` → `provider` + scope `publish:write` (closing carries weight).
- `POST /provider/incidents/{id}/reopen` → `provider` + scope `publish:write`.
- `POST /provider/incidents/{id}/public` → `provider` + role `owner` of the provider org.

## Per-element gating

| UI element | Required role / scope | Notes |
|------------|------------------------|-------|
| Sidebar item `Incidents` | `provider` | Sidebar gated by portal entry. |
| Sidebar badge | `provider` | Driven by `openCount` from list endpoint. |
| `Report incident` (header) | `provider` | Initiates write; any provider seat may report. |
| DataTable rows | `provider` | Non-interactive on this page in v0.4. |
| Investigate / Resolve / Reopen actions (production detail) | `provider` + `publish:write` | Surfaced on planned detail route. |
| `Public` toggle (production detail) | `provider` + `owner` | Lets the public profile / status page show this incident. |

## Cross-provider isolation

A `provider` of `eduMu` cannot see `anthropic.com`'s incidents. Production MUST scope every query by `providerId` from the session — NEVER from URL or request body.

## Sensitive data handling

- **Incident `body`** (created on report / investigate / resolve / reopen) — free-form. Treat as confidential by default; the public profile only shows `kind`, `severity`, `opened`, `resolved` timestamps when `public === true`. The body NEVER goes public.
- **`resource`** is a slug; not sensitive but identifies the resource under stress.
- **Auto-detection rule body** is internal — not surfaced to the provider verbatim. The `kind` taxonomy is the safe summary.

## Audit obligations

Every state-changing call writes to the audit ledger with the parent `traceId`:

- POST `/provider/incidents` → `incident.create` (with `kind`, `severity`, `public` flag).
- POST `/provider/incidents/{id}/investigate` → `incident.investigate`.
- POST `/provider/incidents/{id}/resolve` → `incident.resolve` (capturing the postmortem `body`).
- POST `/provider/incidents/{id}/reopen` → `incident.reopen` (capturing `body`).
- POST `/provider/incidents/{id}/public` → `incident.public_changed` (capturing prior and new value).
- A `severity === 'high'` create also triggers `pagerduty.dispatch` (best-effort, in the audit ledger only after acknowledgement).

## Negative cases

- **Authenticated, no `provider`:** 403 server-side; SPA renders "You don't have provider access" empty state.
- **Resolve with `body.length < 12`:** 400 with field error; UI keeps the modal open.
- **Resolve when already resolved:** 409; UI MUST refresh the row.
- **Reopen when not resolved:** 409.
- **Public toggle without `owner`:** 403; UI should pre-disable the toggle.
- **Provider with `status === 'isolated'`:** all writes return 403 with the standard isolation message; reads still work.

## Data residency

- Incident rows are tenant-scoped via session-derived `providerId`.
- The `Public` toggle exposes a curated subset (kind, severity, opened, resolved) on the public profile / status page; the body NEVER leaves the tenant.
- PagerDuty dispatch payload (severity high) MUST NOT include the incident body — only id, resource, severity, and a short summary.
