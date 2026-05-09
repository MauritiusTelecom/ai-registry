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

# Provider · API keys module — Flows

## Routing

- Route lives at `/keys` of the provider portal hash router.
- Activated via sidebar `API keys` (anchor `href="#/keys"`) or command palette `Create API key` action.
- Active match: exact `'/keys'` OR `path.startsWith('/keys/')`.

## Initial render

1. `App` resolves `path === '/keys'` → renders `<ProvKeys/>`.
2. `ProvKeys` reads `P.keys` directly (no local state in prototype).
3. `DataTable` paints synchronously with all 3 mock rows in document order.
4. Production: emit `provider.keys.viewed` after first paint.

## Header action

### Flow 1 — Create key (the only place a full secret is ever shown)

- Click → no-op stub in prototype.
- Production:
  1. SPA opens a modal capturing **Name**, **Scope** (multi-select over `publish:read`, `publish:write`), and optional **Expires** date.
  2. On submit → POST `/provider/keys` with the form body.
  3. Server returns `201` with `{ id, name, prefix, last4, scope, created, lastUsed: 'Never', fullSecret }`.
  4. The modal swaps to a "secret revealed" state showing:
     - `${prefix}${fullSecretBody}${last4}` in a mono-font code block (the ENTIRE string).
     - A `Copy to clipboard` button.
     - A red banner `Save this now — you will not see it again.`
     - A `Done` primary button to close.
  5. On `Copy to clipboard` click: navigator clipboard API copy + emit `provider.keys.key.copied`.
  6. On `Done` close: SPA zeroises `fullSecret` from React state. The new row appears in the table immediately (optimistic) and is reconciled on next refresh.
- Emit `provider.keys.action.create_key.clicked` on the button click and `provider.keys.key.created` on 201.

### Critical invariant

The full secret is shown **exactly once** and only inside the create-key modal. A subsequent `GET /provider/keys/{id}` MUST NOT return it. Reload of the page MUST NOT re-show it. If the operator closes the modal before copying, they must rotate the key (Flow 4) to obtain a new secret.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Key detail / rotation / revoke` route ships:

- Row click → drawer (right-anchored, 220ms slide).
- Drawer surfaces:
  - Key metadata (name, scope, created, lastUsed, expires).
  - Recent activity (last 50 calls — timestamps, source IPs, route).
  - Actions: `Edit name` (PATCH), `Rotate` (POST `/rotate`), `Revoke` (POST `/revoke`).

## Flow 2 — Edit name

- Inline rename in the drawer; PATCH `/provider/keys/{id}` with `{ name }`.
- Immutable fields (scope, prefix, last4, created) are not editable.
- Scope changes require a rotate (which issues a new secret with the new scope set).

## Flow 3 — Rotate

- Click `Rotate` in the drawer → confirmation dialog:
  - Title: `Rotate this key?`
  - Body: `A new secret will be issued. The current secret continues to work for ${gracePeriodHours} hours.`
  - Form field: **Grace period** (0–168 hours, default 24).
  - Confirm label: `Rotate key`
- POST `/provider/keys/{id}/rotate` with the chosen grace period.
- Server returns `200` with `ApiKeyCreatedOnce` shape — same secret-reveal modal as creation. Same zeroise semantics.
- Emit `provider.keys.key.rotated`.

## Flow 4 — Revoke

- Click `Revoke` in the drawer → confirmation dialog requiring `reason ≥12 chars`:
  - Title: `Revoke this key?`
  - Body: `This is irreversible. Any caller using this secret will be denied immediately.`
  - Confirm label: `Revoke`
- POST `/provider/keys/{id}/revoke` with `{ reason }`.
- On 200: drawer closes, row updates with revoked treatment (greyed text, `lastUsed` frozen).
- Emit `provider.keys.key.revoked`.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to provider-scoped WebSocket events: `key.created`, `key.rotated`, `key.revoked`, `key.usage_tick`.
  - `lastUsed` cells update every 60s while the page is visible.

## Empty / error states

- **No rows** → render the table chrome with one body row text `No API keys yet. Create one for production.` plus a CTA.
- **5xx** → render chrome + body row `Couldn't load keys.` and a top banner with `Retry`.
- **401/403** → redirect to provider sign-in / "Insufficient permissions" empty.

## Accessibility

- The secret reveal modal MUST trap focus and start focus on the `Copy to clipboard` button.
- The mono key cell MUST be selectable for copy-paste of the truncated form, but `Copy to clipboard` MUST NEVER copy any more than the truncated form on this list page.
- Confirmation dialogs use `role="alertdialog"` and trap focus until dismissed.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
