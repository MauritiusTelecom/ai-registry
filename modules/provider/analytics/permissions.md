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

# Provider · Analytics module — Permissions and access

## Surface classification

The Analytics route is **authenticated**, **role-gated** (`provider`), and **read-only**. There are no write actions on this page.

## Required roles

To reach `portals/provider.html#/analytics`:

- The session must hold the `provider` role bound to the active provider's `providerId`.
- MFA mandatory.

All endpoints are read-only. No additional scope is required beyond `provider`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Analytics` | `provider` | Sidebar gated by portal entry. |
| StatCard counters | `provider` | Aggregate; no PII. |
| Daily traffic chart | `provider` | Aggregate; no PII. |
| Window selector (production) | `provider` | Cosmetic; refetch only. |

## Cross-provider isolation (critical)

A `provider` of `eduMu` cannot see `anthropic.com`'s analytics. Production MUST scope every query by `providerId` from the session — NEVER from URL or request body.

## Sensitive data handling

- **Aggregate metrics only** — this page never surfaces per-caller IPs, per-user identifiers, or any data that could re-identify a registry consumer.
- **`p95Latency`** — already aggregate; no per-resource breakdown on this page.
- **`errorRate`** — already aggregate; no per-error breakdown.
- Production drill-down endpoints (`/calls`, `/latency`, `/errors`) must continue to redact callers; per-caller breakdowns are an admin-only surface (out of scope here).

## Audit obligations

The Analytics route is read-only and writes nothing to the audit ledger. Telemetry events listed in `events.json` are UX signals, not ledger entries.

## Negative cases

- **Authenticated, no `provider`:** 403 server-side; SPA renders "You don't have provider access" empty state.
- **Provider with `status === 'isolated'`:** the page renders but every endpoint returns sentinel-zeroed values; the SPA shows a banner explaining the isolation. Drill-downs return 403.
- **Provider with `status === 'review'`:** the page renders empty (no traffic yet); no banner needed.
- **Stale session:** 401 forces sign-out.

## Data residency

- Metrics are aggregated server-side and tenant-scoped via session-derived `providerId`.
- 30-day windows are computed at request time over the tenant's own time-series database.
- Cross-tenant analytics replication is **not** implied by v0.4. If a sovereign tenant publishes the same external resource as another tenant (e.g. `anthropic.com` resources in MU vs FR), each tenant sees only its own slice of the traffic.

## Read-only seats

- A `provider` with scope `publish:read` only (no `publish:write`) has full read access to this page; the absence of any write action means the read-only state has no visible difference from a write-capable seat.
