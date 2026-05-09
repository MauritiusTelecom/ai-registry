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

# Admin · Users module — Permissions and access

## Surface classification

The Users route is **authenticated** and **role-gated** (`admin`). Reading the operator list requires `admin`. Inviting / suspending / revoking users is privileged and production should further gate to `admin` + scope `global` (the sovereignty-board admin role).

## Required roles

To reach `portals/admin.html#/users`:

- The session must hold the `admin` role for the active sovereign tenant.
- MFA mandatory.

To act on users (production endpoints):

- `POST /admin/users/invite` → `admin` + scope `global`.
- `PATCH /admin/users/{id}` → `admin` + scope `global`.
- `POST /admin/users/{id}/suspend` → `admin` + scope `global`.
- `POST /admin/users/{id}/revoke` → `admin` + scope `global` AND second-actor approval (4-eyes; production-only).
- `GET /admin/users/invite-log` → `admin` (read-only).

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Users & roles` | `admin` | Sidebar gated by portal entry. |
| `Invite log` (header) | `admin` | Read-only. |
| `Invite user` (header) | `admin` + scope `global` | Production may surface a tooltip if scope insufficient. |
| DataTable rows | `admin` | Non-interactive on this page in v0.4. |
| Suspend / Revoke (production drawer) | `admin` + scope `global` | Revoke additionally requires 4-eyes. |
| Edit role / scope (production drawer) | `admin` + scope `global` | |

## Self-protection

A user MUST NOT be able to:

- Suspend or revoke their own account from this page.
- Demote their own role below `admin` if they are the **only** remaining `admin + global` for the tenant.

The server enforces both; the UI MUST surface explanatory tooltips so the disabled state is understood.

## Sensitive cell handling

- **`email`** — surfaced verbatim. Respect tenant `audit.actor.redact` policy if enabled (only redacts in audit log; not in this page).
- **`name`** — display as authored, including diacritics.
- **`scope`** — may identify internal organisational structure (e.g. `sovereignty-board`); not sensitive but cross-tenant disclosure must be avoided (the row never crosses tenant boundaries).
- **`mfa = false`** rows are visually loud (red `OFF`) so admins prioritise enrolment outreach.

## Audit obligations

Every state-changing call writes to the audit ledger with the parent `traceId`:

- POST `/admin/users/invite` → `user.invite`
- PATCH `/admin/users/{id}` → `user.update` (capturing prior and new role / scope)
- POST `/admin/users/{id}/suspend` → `user.suspend` (capturing `reason`)
- POST `/admin/users/{id}/revoke` → `user.revoke` (capturing `reason` AND the second-actor approver email)
- A user enrolling MFA fires `user.mfa_enrolled`; un-enrolling fires `user.mfa_revoked`. These are system-driven from IdP webhooks, not from this page.

## Negative cases

- **Authenticated, no `admin`:** 403 server-side; SPA renders "You don't have admin access" empty state.
- **`admin` without `global` scope clicks `Invite user`:** modal opens, submit returns 403 with `Problem` body. UX best practice is to disable the button up-front.
- **Inviting an existing active user:** 409 with `Problem` body `User already exists.` UI must close the modal and surface a toast.
- **Self-suspend / self-revoke:** 403 with `Problem` body `Cannot perform this action on yourself.`

## Data residency

- User rows are tenant-scoped via session-derived `tenantId`.
- IdP claims are tenant-scoped; a sovereign-board admin in tenant A cannot enumerate operators in tenant B.
- The invite-log endpoint is also tenant-scoped; cross-tenant invitation cannot be attempted from this surface.
