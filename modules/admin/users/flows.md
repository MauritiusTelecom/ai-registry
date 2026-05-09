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

# Admin · Users module — Flows

## Routing

- Route lives at `/users` of the admin portal hash router.
- Activated when sidebar item `Users & roles` is clicked (anchor `href="#/users"`).
- Active match: exact `'/users'` OR `path.startsWith('/users/')`.

## Initial render

1. `AdminApp` resolves `path === '/users'` → renders `<AdminUsers/>`.
2. `AdminUsers` reads `A.users` directly (no local state in prototype).
3. `DataTable` paints synchronously with all 8 mock rows in document order.
4. Production: emit `admin.users.viewed` after first paint, including `mfaOffCount` (count of rows with `mfa === false`) so dashboards can surface compliance signals.

## Header action flows

### Flow 1 — Invite log

- Click → no-op stub in prototype.
- Production: `navigate('/users/invites')` and render the recent-invitations log (sent / accepted / expired / revoked). Spec out of scope here.
- Emit `admin.users.action.invite_log.clicked`.

### Flow 2 — Invite user

- Click → no-op stub in prototype.
- Production: open a modal capturing:
  - **Email** — required, RFC-5322 validation; must NOT match an existing active user.
  - **Role** — radio: `admin | provider | verifier | sovereign`.
  - **Scope** — text or autocomplete; allowed values depend on role:
    - `admin` → `global` only (or future tenant-scoped admins).
    - `provider` → a domain string matching an existing `Provider.domain`.
    - `verifier` → `sovereignty-board` or a tenant domain.
    - `sovereign` → a sovereign-tier domain.
  - **Message** — optional free-form note included in the invitation email.
- On submit → POST `/admin/users/invite`. Server creates the user with `status='invited'` and emails the invitation. Row appears at the top of the table immediately (optimistic) and is reconciled on next refresh.
- Emit `admin.users.action.invite_user.clicked` on button click and `admin.users.action.invite_user.submitted` on 201.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `User detail / role-edit` drawer ships:

- Row click → opens a right-anchored drawer.
- Drawer surfaces: avatar, name, email, role badge, scope, MFA state, last seen, recent activity (cross-link to `/audit?actor={email}`), and actions:
  - **Edit role / scope** → opens inline form; on save → PATCH `/admin/users/{id}`.
  - **Suspend** → confirmation dialog requiring `reason` ≥12 chars; POST `/admin/users/{id}/suspend`; row updates with status `suspended` (StatusPill flips to `isolated`).
  - **Revoke** → confirmation dialog with stronger wording (irreversible); requires `reason` ≥12 chars; POST `/admin/users/{id}/revoke`.
  - **Resend invitation** (only when status `invited`) → POST `/admin/users/invite` again with same email, marked as resend.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on visibility change AND on push events `user.invited`, `user.suspended`, `user.revoked`, `user.mfa_changed`. The `lastSeen` column may also tick periodically (server pushes every 60s for active users).

## Empty / error states

- **No rows** → render the table chrome with one body row text `No operators yet. Invite the first one.` plus an inline `Invite user` CTA.
- **5xx** → render chrome + body row `Couldn't load users.` and a top banner with `Retry`.
- **401/403** → redirect to admin sign-in / "Insufficient permissions" empty.

## Accessibility

- MFA cell pairs colour with the literal text (`ON` / `OFF`); accessible without colour.
- Status pill colour MUST be paired with the displayed status word (already true in source for `active`; production must do the same for `isolated`-mapped values).
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
- Email cell respects user's display preference (some operators use Latin-1 diacritics, e.g. `Yannick Boullé`); production must NOT strip diacritics for the cell render.
