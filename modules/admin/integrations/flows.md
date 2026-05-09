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

# Admin · Integrations module — Flows

## Routing

- Route lives at `/integrations` of the admin portal hash router.
- Activated when sidebar item `Integrations` is clicked (anchor `href="#/integrations"`).
- Active match: exact `'/integrations'` OR `path.startsWith('/integrations/')`.

## Initial render

1. `AdminApp` resolves `path === '/integrations'` → renders `<AdminIntegrations/>`.
2. `AdminIntegrations` reads `A.integrations` directly (no local state in prototype).
3. Card grid (`p-grid p-grid-3`) paints synchronously with all 6 mock cards in document order.
4. Production: emit `admin.integrations.viewed` after first paint, including `connectedCount` and `degradedCount` so dashboards can surface health.

## Header action

### Flow 1 — Add integration

- Click → no-op stub in prototype.
- Production: open a categorised picker modal listing supported integrations grouped by `kind` (Identity / Notify / Security / Observability / Storage). On selection, open a per-integration setup wizard that captures the kind-specific config (OIDC issuer URL + client id + client secret, Slack webhook + channel, etc.). On submit → POST `/admin/integrations`. New integration lands with `status='disconnected'`; first successful sync flips it to `connected`.
- Emit `admin.integrations.action.add_integration.clicked` on the button click and `admin.integrations.integration.tested` on the post-create smoke test.

## Per-card action flows

### Flow 2 — Configure

- Click → no-op stub in prototype.
- Production: open a right-anchored drawer (220ms slide). The drawer surfaces:
  - Read-only header with name, kind, status, last sync.
  - Tabs: `Connection`, `Mapping`, `Audit`. The default tab is `Connection`.
  - `Connection` shows non-secret config fields (e.g. issuer URL); secret fields render as `<set>` with masked length and a `Rotate` button.
  - `Mapping` (kind-specific): for `notify` kinds this lets the operator route different action namespaces to different channels (e.g. `flag.create.severity-high` → `#air-incidents`).
  - `Audit` is a thin embed of `GET /admin/integrations/{id}/logs` (last 100 lines).
  - Footer actions: `Save` (PATCH), `Test connection` (POST `/test`), `Revoke` (POST `/revoke`, requires `reason`).
- Emit `admin.integrations.card.configure.clicked` on click; the drawer's own actions emit `admin.integrations.integration.tested` and `admin.integrations.integration.revoked`.

### Flow 3 — Logs

- Click → no-op stub in prototype.
- Production: navigate to a per-integration log view at `/integrations/{id}/logs` (or open a drawer; tenant choice). Stream uses `GET /admin/integrations/{id}/logs` with optional polling.
- Emit `admin.integrations.card.logs.clicked`.

## Status mapping refresh

- The prototype computes the StatusPill from `i.status` at render time; no live polling.
- Production-recommended:
  - Long-poll or WebSocket-subscribe to `integrations.status_changed` events.
  - On a `connected → degraded` transition, the card's StatusPill flips from `verified` to `pending` and a subtle 200ms cross-fade plays.
  - On a `degraded → connected` recovery, fire a non-intrusive toast `${name} recovered` and return the card to `verified`.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on visibility change AND on push events `integration.created`, `integration.updated`, `integration.status_changed`, `integration.revoked`.
- The dashboard's `Open flags` and any future `Health` rail share the integration health signal; both must stay in sync.

## Empty / error states

- **No rows** → render the page with one full-width card: title `No integrations connected.`, sub `Identity, notify, security, observability and storage providers will appear here once connected.`, primary CTA `Add integration`. (This is a degenerate state — production tenants always have at least an identity integration.)
- **5xx** → render PageHeader + a single full-width error card: `Couldn't load integrations.`, `Retry` button.
- **401/403** → redirect to admin sign-in / "Insufficient permissions" empty.
- **Critical-kind degraded:**
  - `kind === 'identity'` degraded → top-of-portal banner `Sign-in may be unreliable — investigate gov.mu SSO.`
  - `kind === 'storage'` degraded → top-of-page banner on `/audit` `Audit archive degraded — verify retention policy.` (Cross-link not enforced in v0.4 prototype.)

## Accessibility

- StatusPill colour MUST be paired with the displayed status word (already true in source).
- Card action buttons use `size="sm"`; ensure tap target is ≥40×40 dp on touch devices (production requirement).
- Card title and sub form a stack; production should mark the title as `<h3>` with the sub as a sibling so screen readers traverse cleanly.
