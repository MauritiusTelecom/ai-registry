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

# Admin · Integrations module — Connected providers

## Purpose

Specify the **`/integrations` route** of the Admin portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every external provider the registry depends on — identity (SSO), notification channels, security scanners, observability, and storage — with health and last-sync state.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/admin.html` |
| Route table | `portals/admin-app.jsx` (`'/integrations'` → `ADMIN_PAGES.AdminIntegrations`) |
| Page component (`AdminIntegrations`) | `portals/admin-pages.jsx` |
| Mock integrations (`ADMIN_INTEGRATIONS`) | `portals/admin-data.jsx` |
| Shared shell (`PageHeader`, `StatusPill`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Admin`
- `PortalShell` overrides:
  - `currentTitle="Integrations"`
  - `breadcrumb=["Admin", "Operations", "Integrations"]`
  - Active sidebar item: `Integrations` (`path: "/integrations"`).

## Route body — vertical layout (`AdminIntegrations`)

1. **PageHeader**
2. **Card grid** — `p-grid p-grid-3` of one card per integration

This page does NOT use a `DataTable` — it uses a 3-column responsive card grid.

## Section copy and UI — PageHeader

- **Title:** `Integrations`
- **Subtitle:** `Identity, observability, notifications and storage providers.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `Add integration`

## Section copy and UI — Integration card

Each card is a `p-card`. Internal layout:

1. **Card header** (`p-card-head`, flex row, space-between, baseline aligned):
   - **Left**: stacked title + sub
     - Title (`p-card-title`): `i.name`
     - Sub (`p-card-sub`): `i.kind`
   - **Right**: `<StatusPill status={cls}/>` where `cls = i.status === 'connected' ? 'verified' : 'pending'`
2. **Sync row** (`p-row` with `justifyContent: 'space-between'`, `marginTop: 4`):
   - Left: `<span class="p-mono-key">last sync</span>`
   - Right: `<span class="p-mono-val">{i.lastSync}</span>`
3. **Divider** (`p-divider`)
4. **Action row** (`p-row` with `gap: 8`):
   - `Btn variant="secondary" size="sm" icon="settings"`: `Configure`
   - `Btn variant="ghost" size="sm" icon="arrow-up-right"`: `Logs`

The card's outer container has the same gradient border treatment as other `p-card` instances elsewhere in the portal.

## Status mapping (integration status → StatusPill)

The intrinsic `status` field uses `connected | degraded | disconnected | revoked`; the StatusPill rendered uses two visuals only. Mapping (one-way, display only):

| Integration `status` | StatusPill visual |
|---|---|
| `connected` | `verified` |
| `degraded`, `disconnected`, `revoked`, anything else | `pending` |

Production MUST persist the canonical `connected / degraded / disconnected / revoked` value; the UI mapping is purely visual. A future revision MAY introduce a third visual (`failed`) for `disconnected`/`revoked`; until then they ride the `pending` visual.

## Mock integrations — `ADMIN_INTEGRATIONS`

Reproduce verbatim from `admin-data.jsx`:

| id | name | kind | status | lastSync |
|---|---|---|---|---|
| int_oidc_govmu | gov.mu SSO (OIDC) | identity | connected | 3m ago |
| int_slack_ops | Slack — #air-ops | notify | connected | 12m ago |
| int_pagerduty | PagerDuty | notify | connected | 2h ago |
| int_dlp_scan | DLP scanner | security | connected | 1m ago |
| int_grafana | Grafana / Prom | observability | connected | live |
| int_s3_audit | S3 audit archive | storage | degraded | 47m ago |

The `lastSync` field is a display string (`live` is a sentinel meaning "real-time stream"; the others are relative time strings produced by the server).

## Visual and motion

- The `live` `lastSync` value MAY animate with a slow-pulse dot prefix in production (recommended); the prototype shows the literal text `live`.
- StatusPill colours per global token map.
- Card hover: subtle lift (translateY 1px) and brighter gradient border, per `portal-styles.css`.
- Action buttons use `size="sm"` — smaller padding than default; production must keep the size tokenised (do not eyeball reduce).

## Navigation behaviour

- `Add integration` (header primary): no-op stub in prototype. Production opens an integration picker (categorised list of supported integrations), then a per-integration setup wizard.
- `Configure` (per card secondary): no-op stub. Production opens a side drawer with the integration's settings (auth credentials, scopes, mapping rules).
- `Logs` (per card ghost): no-op stub. Production navigates to a per-integration log view (filtered by `integrationId`).

## Out of scope on this page

- Per-integration setup wizard.
- Live log tail.
- Webhook signing key rotation.
