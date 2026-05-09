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

# Provider · Analytics module — Data model

## ProviderAnalyticsSummary (StatCard grid)

Three cards bind to a single summary object scoped to the active provider tenant.

```ts
type ProviderAnalyticsSummary = {
  calls30d:       string;     // compact display, e.g. "94.2k"
  calls30dDelta:  string;     // signed percent, e.g. "+18%"
  p95Latency:     string;     // server-formatted with unit suffix, e.g. "142ms"
  p95LatencyDelta: string;    // signed ms, e.g. "-8ms" (NEGATIVE = improvement)
  errorRate:      string;     // formatted with % suffix, e.g. "0.04%"
  errorRateDelta: string;     // signed string, e.g. "0", "+0.02%", "-0.01%"
};
```

Tone mapping (product-defined; the UI MUST follow these rules, NOT a sign-based default):

- `calls30dDelta` positive = `pos`, negative = `neg`.
- `p95LatencyDelta` **negative** = `pos` (lower latency is better); positive = `neg`.
- `errorRateDelta` zero = `neu`; negative = `pos`; positive = `neg`.

Display defaults rendered in the prototype:

| Field | Value |
|-------|-------|
| `calls30d` | `94.2k` |
| `calls30dDelta` | `+18%` |
| `p95Latency` | `142ms` |
| `p95LatencyDelta` | `-8ms` |
| `errorRate` | `0.04%` |
| `errorRateDelta` | `0` |

## UsageSeries (chart card)

Identical shape to the dashboard's `UsageSeries` (see `modules/provider/dashboard/data-model.md`). The prototype reuses `PROV_DATA.usage` (length 7); production should serve a 30-day window when this route is active to match the `Calls (30d)` StatCard semantics.

```ts
type UsageDay = {
  day: string;       // 7-day form: 'Mon'..'Sun'; 30-day form: ISO date 'YYYY-MM-DD'
  mcp:   number;
  tool:  number;
  agent: number;
};
type UsageSeries = UsageDay[];   // length 7 (v0.4 prototype) or length 30 (production)
```

Display rules (do not change):

- Bar order per day: `mcp` → `tool` → `agent`.
- Colour mapping: `mcp` → `var(--primary)`, `tool` → `var(--secondary)`, `agent` → `var(--tertiary)`.
- Agent height MUST be multiplied by 6.
- y-axis ceiling `maxV = 2500` for the 7-day mock; production must dynamically scale for 30-day windows so the largest bar still fits within ~80% of card height.

## Authoritative response shape (production)

```ts
type ProviderAnalyticsResponse = {
  summary: ProviderAnalyticsSummary;
  usage:   UsageSeries;          // 30-day in production
  generatedAt: string;
};
```

Granular endpoints (planned):

- `GET /provider/analytics/calls?window=30d&groupBy=day|kind|resource` for traffic explorer.
- `GET /provider/analytics/latency?window=30d&percentile=95|99` for latency drill-down.
- `GET /provider/analytics/errors?window=30d&groupBy=resource` for error breakdown.

## Constraints / invariants

- All metrics are aggregates of this provider's own resources. No cross-provider visibility.
- The 30d window is rolling, computed at request time; production should cache for 60s server-side.
- p95 latency is computed across all resources weighted by call volume (NOT a simple mean of per-resource p95s). Production must document the methodology in `airegistry-specs/governance/`.
- Error rate is `(failed_calls / total_calls)` over the same 30d window.

## Reference data on this page

- **Icon palette:** `activity` (calls), `pulse` (latency), `zap` (errors).
- **Tone tokens:** `pos` (green), `neu` (muted), `neg` (red) — defined in `portal-styles.css` as `--p-pos`, `--p-text-3`, `--p-neg`.
