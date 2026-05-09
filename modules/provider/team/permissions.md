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

# Provider · Team module — Permissions and access

## Surface classification

The Team route is **authenticated** and **role-gated** (`provider`). Listing members requires `provider`. Inviting / role-changing / removing members requires `provider` + role `owner`.

## Required roles

To reach `portals/provider.html#/team`:

- The session must hold the `provider` role bound to the active provider's `providerId`.
- MFA mandatory.

To act on members (production endpoints):

- `POST /provider/team/invite` (`Invite`) → `provider` + `owner`.
- `PATCH /provider/team/{id}` (role change) → `provider` + `owner`.
- `DELETE /provider/team/{id}` (remove) → `provider` + `owner`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Team` | `provider` | Sidebar gated by portal entry. |
| `Invite` (header) | `provider` + `owner` | Disable with tooltip if not owner. |
| DataTable rows | `provider` | Visible to all provider seats; non-interactive in v0.4. |
| Role change / Remove (production drawer) | `provider` + `owner` | |

## Self-protection

- A member CANNOT remove themselves; the SPA hides the action button and the server enforces with 403.
- A member CANNOT demote themselves if they are the only `owner`; the server enforces with 422.
- A `service` member CANNOT change their own role under any condition; an owner must mediate.

## Sensitive data handling

- **`email`** for human members is rendered verbatim. Respect tenant `audit.actor.redact` policy if enabled.
- **`email`** for service members is a bot mailbox; treat as identifying internal infrastructure but render verbatim.
- **`name`** is operator-chosen; for service members it should describe the use (`CI Pipeline`).

## Audit obligations

Every state-changing call writes to the audit ledger with the parent `traceId`:

- POST `/provider/team/invite` → `team.invite` (capturing `email`, `role`).
- PATCH `/provider/team/{id}` → `team.role_changed` (capturing prior + new role).
- DELETE `/provider/team/{id}` → `team.remove`.
- A successful first sign-in by a human invitee writes `team.member.activated`.

## Negative cases

- **Authenticated, no `provider`:** 403 server-side; SPA renders "You don't have provider access" empty state.
- **`provider` without `owner` clicks `Invite`:** UI MAY surface the modal but submit returns 403; preferred UX is to disable the button up-front with a tooltip `Owner role required to invite members.`
- **Inviting an existing active member:** 409; UI must close the modal and surface a toast.
- **Demoting / removing the only owner:** 422; SPA must surface inline with `Promote another member to owner first.`
- **Stale session:** 401 forces sign-out.

## Data residency

- Team rows are tenant-scoped via session-derived `providerId`.
- Service-member credentials (API keys; documented in `/keys`) are scoped to the same tenant; cross-provider key usage is rejected at the gateway.
