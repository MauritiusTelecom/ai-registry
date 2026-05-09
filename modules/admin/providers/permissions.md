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

# Admin · Providers module — Permissions and access

## Surface classification

The Providers route is **authenticated**, **role-gated** (`admin`), and **write-capable** via header actions. It surfaces tenant-scoped provider records.

## Required roles

To reach `portals/admin.html#/providers`:

- The session must hold the `admin` role for the active sovereign tenant.
- MFA is mandatory.
- Session lifetime defaults to `8h`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Providers` | `admin` | Sidebar gated by portal entry. |
| `Onboarding queue` (header) | `admin` | Read-only nav. |
| `Add provider` (header) | `admin` | Production may further gate to `admin` + scope `global`. |
| FilterBar inputs | `admin` | Cosmetic / query only. |
| StatCard counters | `admin` | Aggregate; no PII. |
| DataTable rows | `admin` | Non-interactive on this page. |
| Provider verify (POST `/verify`) | `admin` | Production-only, no UI on this page; surfaced via `Onboarding queue` board. |
| Provider isolate (POST `/isolate`) | `admin` | Production-only, no UI on this page; cascades to all resources of this provider. |

## Sensitive cell handling

- **`primary` (contact name)** is human-identifiable. Display as authored. Respect `audit.actor.redact` policy if enabled (the field is not redacted by default; production must wire the policy explicitly).
- **`domain`** is not sensitive but identifies the canonical web entity; presentation is verbatim.
- **External providers** (e.g. `anthropic.com`, `openai.com`) display verbatim; production must NOT obscure the domain.

## Negative cases

- **Authenticated, no `admin`:** 403 server-side; SPA renders "You don't have admin access" empty state.
- **Stale session:** 401 forces sign-out.
- **Concurrent edit conflict on PATCH:** 409 with latest `Provider` body; UI MUST prompt re-fetch.
- **Cascade conflict on isolate:** if a resource cascade fails, server MUST roll back the provider isolation transactionally; UI shows error toast `Couldn't isolate provider — try again.`

## Audit obligations

Every state-changing call writes to the audit ledger:

- POST `/admin/providers` → `provider.create`
- PATCH `/admin/providers/{id}` → `provider.update`
- POST `/admin/providers/{id}/verify` → `provider.verify`
- POST `/admin/providers/{id}/isolate` → `provider.isolate` (with `reason`)
- Cascaded resource isolation → one `resource.isolate` row per affected resource, all sharing the parent `traceId`.

## Data residency

- Provider rows are tenant-scoped via session-derived `tenantId`.
- An external provider (e.g. `anthropic.com`) is registered separately under each sovereign tenant; cross-tenant deduplication is **not** implied at the catalogue layer.
