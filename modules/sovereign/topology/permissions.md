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

# Sovereign · Topology module — Permissions and access

## Surface classification

The Topology route is **authenticated**, **role-gated** (`sovereign`), and **read-only**.

## Required roles

To reach `portals/sovereign.html#/topology`:

- The session must hold the `sovereign` role bound to the active sovereign authority.
- MFA mandatory.

All endpoints are read-only.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Topology` | `sovereign` | Sidebar gated by portal entry. |
| TopologyCard | `sovereign` | Aggregate; no PII. |
| Dependencies DataTable | `sovereign` | Aggregate; no PII. |

## Cross-tenant isolation

- The graph and table are scoped to the active sovereign tenant. A sovereign of `finance.gov.mu` cannot see the topology of `health.gov.mu`.
- External Tier-3 model nodes (e.g. `model/anthropic-sonnet-7`) appear because the local tenant calls them, NOT because they belong to another tenant.

## Sensitive data handling

- Per-call payloads are NEVER surfaced — only the existence of the `(src → dst)` relationship.
- Production may surface aggregate `count` per edge over the topology window; that count is non-sensitive.
- Per-caller / per-user identifiers are NEVER on this page.

## Audit obligations

The Topology route is read-only and writes nothing to the audit ledger.

## Negative cases

- **Authenticated, no `sovereign`:** 403 server-side; SPA renders "You don't have sovereign access" empty state.
- **Authority mismatch:** 403 with detail `Authority mismatch.`
- **Stale session:** 401 forces sign-out.

## Data residency

- Topology aggregates are computed in the tenant region from the local call log.
- Cross-border traffic to Tier-3 providers (e.g. `anthropic.com`) appears as `model-call` edges; the call payload itself is governed by `pol_egress_default` (admin's policy module). The topology does not reveal payload contents.
