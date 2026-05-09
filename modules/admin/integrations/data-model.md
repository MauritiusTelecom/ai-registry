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

# Admin · Integrations module — Data model

## Integration

Mirrors `ADMIN_INTEGRATIONS[i]` in `portals/admin-data.jsx`.

```ts
type Integration = {
  id: string;          // "int_<slug>"; opaque server-issued
  name: string;        // display name including operator/channel where relevant
  kind: 'identity' | 'notify' | 'security' | 'observability' | 'storage' | string;
  status: 'connected' | 'degraded' | 'disconnected' | 'revoked';
  lastSync: string;    // server-formatted display string ("3m ago", "2h ago", "47m ago", "live")
};
```

### Field semantics

- **`kind`** — coarse category that drives downstream wiring:
  - `identity` — IdP / SSO providers (e.g. `gov.mu` OIDC).
  - `notify` — outgoing notification channels (Slack, PagerDuty, email).
  - `security` — DLP / vulnerability / license scanners.
  - `observability` — metrics + logs (Grafana / Prom, OpenTelemetry).
  - `storage` — bulk archives (S3, GCS, on-prem buckets).
- **`status`** — runtime health, polled from the integration's own health endpoint or last-success timestamp:
  - `connected` — healthy.
  - `degraded` — partially functional (some calls failing, last success >5m ago for non-`live` kinds).
  - `disconnected` — not currently reachable / credential expired.
  - `revoked` — operator revoked the integration; persisted but not polled.
- **`lastSync`** — display string only. The literal `live` is a sentinel for kinds that maintain a continuous stream (e.g. Grafana / Prom scrape). All other values are relative time strings produced by the server.

### v0.4 mock corpus (6 rows)

| id | name | kind | status | lastSync |
|---|---|---|---|---|
| int_oidc_govmu | gov.mu SSO (OIDC) | identity | connected | 3m ago |
| int_slack_ops | Slack — #air-ops | notify | connected | 12m ago |
| int_pagerduty | PagerDuty | notify | connected | 2h ago |
| int_dlp_scan | DLP scanner | security | connected | 1m ago |
| int_grafana | Grafana / Prom | observability | connected | live |
| int_s3_audit | S3 audit archive | storage | degraded | 47m ago |

## Authoritative response shape (production)

```ts
type AdminIntegrationsResponse = {
  rows: Integration[];
  total: number;
  byKind: Record<Integration['kind'], number>;  // for future StatCard / filter use
  generatedAt: string;
};
```

## Constraints / invariants

- `id` is unique per tenant.
- A `kind === 'identity'` integration with `status === 'connected'` is required for the portal to be usable; the `gov.mu SSO (OIDC)` row is the v0.4 default.
- A `kind === 'storage'` integration MUST be present and `connected` for the audit log archive policy (`pol_audit_retention`) to be enforceable. If the only storage integration moves to `degraded` or worse, the dashboard MUST surface a banner.
- `kind === 'notify'` integrations MAY be zero in count; production must not page on missing notify integrations (silent fallback to email).
- An integration with `status === 'revoked'` is retained as an immutable record (so audit can reference past dispatches); UI cards display them with the muted StatusPill.

## Reference data on this page

- **StatusPill mapping (display-only):** `connected` → `verified`, anything else → `pending`. Persisted value is the integration-native enum.
- **`lastSync` sentinel:** the literal string `live` is reserved for streaming integrations.
