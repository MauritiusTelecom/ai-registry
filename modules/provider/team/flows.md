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

# Provider · Team module — Flows

## Routing

- Route lives at `/team` of the provider portal hash router.
- Activated via sidebar `Team` (anchor `href="#/team"`) or command palette.
- Active match: exact `'/team'` OR `path.startsWith('/team/')`.

## Initial render

1. `App` resolves `path === '/team'` → renders `<ProvTeam/>`.
2. `ProvTeam` renders the inline `team` array (length 3 in v0.4 for `eduMu`).
3. `DataTable` paints synchronously.
4. Production: GET `/provider/team` and emit `provider.team.viewed` after first paint.

## Header action

### Flow 1 — Invite

- Click → no-op stub in prototype.
- Production: open a modal capturing:
  - **Email** — required, RFC-5322 validation; must NOT match an existing active member.
  - **Role** — radio: `owner | editor | service`. Default `editor`.
  - **Name** — required when `role === 'service'` (humans get their name from the IdP claim on first sign-in).
  - **Expires** — optional; SHOULD be set when `role === 'service'`.
- On submit → POST `/provider/team/invite`. Server:
  - For human invitees (`owner`/`editor`): emails an invitation; the member appears with implicit pending status until accepted (production should add a status field to the response).
  - For service invitees: creates the seat immediately and surfaces the new member in the next `GET`.
- Emit `provider.team.action.invite.clicked` and `provider.team.member.invited`.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Member detail` drawer ships:

- Row click → drawer.
- Drawer surfaces: avatar (humans), name, email, role badge, recent activity (cross-link to `/audit?actor={email}` if the actor is a human; to `/keys?lastUsedBy={id}` for service), and actions:
  - **Change role** (PATCH).
  - **Remove from org** (DELETE) — confirmation required.

## Self-protection

A member MUST NOT be able to:

- Remove themselves from the org via the UI (server enforces; the SPA hides / disables the button).
- Demote themselves below `owner` if they are the **only** remaining `owner` (server enforces with 422; SPA must surface explanation).

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to provider-scoped WebSocket events: `team.member.invited`, `team.member.role_changed`, `team.member.removed`. Sidebar / row badges stay in sync.

## Empty / error states

- **No rows** → impossible in production (every provider has at least one owner). Render a single body row `Couldn't load team.` if the response is empty for any other reason.
- **5xx** → render chrome + body row `Couldn't load team.` and a top banner with `Retry`.
- **401/403** → redirect to provider sign-in / "Insufficient permissions" empty.

## Accessibility

- Member name + email use the standard `p-cell-stack`; production should mark the name as `<strong>` and the email as a sibling `<span>` so screen readers traverse cleanly.
- Role tag colour MUST be paired with the role text (already true in source).
- Confirmation dialogs for role change / remove use `role="alertdialog"` and trap focus.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
