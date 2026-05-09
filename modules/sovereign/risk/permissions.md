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

# Sovereign · Risk module — Permissions and access

## Surface classification

The Risk route is **authenticated**, **role-gated** (`sovereign`), and **read-only**.

## Required roles

To reach `portals/sovereign.html#/risk`:

- The session must hold the `sovereign` role bound to the active sovereign authority.
- MFA mandatory.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Risk` | `sovereign` | Sidebar gated by portal entry. |
| RiskTimelineCard | `sovereign` | Aggregate composite score; no PII. |
| HeatmapCard | `sovereign` | Aggregate sector × tier counts; no PII. |
| Per-week drill-down (production) | `sovereign` | Lists contributing factors; surfaces no per-caller data. |

## Cross-tenant isolation

- Risk scores and heatmap counts are scoped to the active sovereign tenant.

## Sensitive data handling

- Composite scores are unitless aggregates; methodology is published in `airegistry-specs/governance/`.
- Per-week drill-downs surface contributor categories (`incident`, `policy-violation`, `flag`, `review-backlog`, `cross-border`) and weights, NEVER per-row contents.
- The heatmap MUST never reveal individual resource ids; only counts per `(sector, tier)` cell.

## Audit obligations

- Reading the Risk page writes nothing to the audit ledger.
- Methodology changes (admin-side, out of scope here) write `risk.methodology.changed` and advance `methodologyVersion`.

## Negative cases

- **Authenticated, no `sovereign`:** 403 server-side.
- **Authority mismatch:** 403 with detail `Authority mismatch.`
- **Stale session:** 401 forces sign-out.

## Data residency

- Risk computations happen in the tenant region from local incident, policy, flag, and review data.
- Cross-tenant risk aggregation is **not** performed at the sovereign level.
