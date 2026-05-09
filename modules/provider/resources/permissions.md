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

# Provider · Resources module — Permissions and access

## Surface classification

The Resources route is **authenticated** and **role-gated** (`provider`). Reading the catalogue requires `provider`. Editing or publishing is privileged and lives behind the planned detail route or the `/publish` wizard.

## Required roles

To reach `portals/provider.html#/resources`:

- The session must hold the `provider` role bound to the active provider's `providerId`.
- MFA mandatory.
- Session lifetime defaults to `8h`.

To act on resources:

- Listing is `provider` (read-only).
- `Publish resource` (header → `/publish`) requires `provider` + scope `publish:write`.
- Detail-page edit / archive / withdraw flows (planned) require `provider` + scope `publish:write`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `My resources` | `provider` | Sidebar gated by portal entry. |
| `Publish resource` (header) | `provider` + `publish:write` | Initiates the 5-step wizard at `/publish`. |
| DataTable rows | `provider` | Non-interactive on this page in v0.4. |
| Status pill render | `provider` | Cosmetic; reflects upstream status. |
| Performance metric cells | `provider` | Aggregate from this provider's traffic only; never cross-provider. |

## Cross-provider isolation (critical)

A `provider` of `eduMu` cannot see `anthropic.com`'s resources, even though both sets share the canonical `Resource` shape in admin. Production MUST scope every query by `providerId` derived from the session — NEVER from URL or request body.

## Sensitive cell handling

- **`slug`, `kind`, `version`, `sov`, `updated`** — non-sensitive metadata; render verbatim.
- **`usage`, `latency`, `errors`** — aggregate metrics from this provider's traffic only. Do NOT include per-caller breakdowns on the list response.
- **`status`** — display verbatim. The prototype enum (`verified | review | experimental | isolated | archived | draft`) is the canonical persisted value.

## Audit obligations

The list view is **read-only** and writes nothing to the audit ledger. State-changing actions on linked routes are documented in their own modules:

- `/publish` wizard submit → `resource.publish` (in `modules/provider/publish`).
- Detail edit (planned) → `resource.update`.
- Archive / withdraw (planned) → `resource.archive` / `resource.withdraw`.
- Admin-initiated isolation → `resource.isolate` (in `modules/admin/resources`).

## Negative cases

- **Authenticated, no `provider`:** 403 server-side; SPA renders "You don't have provider access" empty state with a `Go to your portal` CTA.
- **Provider with `status === 'isolated'`:** the list still renders but the `Publish resource` button is disabled with tooltip `Provider account isolated. Contact support.`
- **Provider with `status === 'review'`:** the list renders empty until first publish; the `Publish resource` button is disabled with tooltip `Provider verification pending.`
- **Stale session:** 401 forces sign-out.

## Data residency

- Rows are tenant-scoped via session-derived `providerId`.
- A resource published to multiple sovereign tenants (e.g. an external Tier-3 frontier model) creates one independent `ProviderResource` per tenant; cross-tenant deduplication is **not** implied.
- Performance metrics are aggregated server-side and never include per-user PII.
