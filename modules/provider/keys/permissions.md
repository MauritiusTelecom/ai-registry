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

# Provider · API keys module — Permissions and access

## Surface classification

The Keys route is **authenticated** and **role-gated** (`provider`). Listing keys requires `provider`. Creating, rotating, or revoking keys requires the provider org `owner` role — non-owner provider seats can SEE keys (truncated) but cannot mutate them.

## Required roles

To reach `portals/provider.html#/keys`:

- The session must hold the `provider` role bound to the active provider's `providerId`.
- MFA mandatory.

To act on keys (production endpoints):

- `POST /provider/keys` (`Create key`) → `provider` + role `owner`.
- `PATCH /provider/keys/{id}` (rename) → `provider` + role `owner`.
- `POST /provider/keys/{id}/rotate` → `provider` + role `owner`.
- `POST /provider/keys/{id}/revoke` → `provider` + role `owner`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `API keys` | `provider` | Sidebar gated by portal entry. |
| `Create key` (header) | `provider` + `owner` | Disable with tooltip if not owner. |
| DataTable rows | `provider` | Visible to non-owners; non-interactive in v0.4. |
| Edit / Rotate / Revoke (production drawer) | `provider` + `owner` | |
| `Copy to clipboard` (create modal) | `provider` + `owner` | Modal only renders for owners. |

## Critical security invariants (UI-level)

- The full secret string MUST NEVER appear on the list page or in any list response.
- The `Key` cell renders only the truncated form `prefix…last4`.
- The full secret is shown ONCE inside the create-key modal and is zeroised from React state when the modal closes.
- Telemetry events MUST NOT include the full secret. The `provider.keys.key.copied` event carries only `keyId`.
- A page reload immediately after creating a key MUST NOT re-show the secret. A user who closes the modal without copying must rotate the key (which issues a new secret).

## Scope vocabulary

- `publish:read` — list resources, list submissions, list incidents.
- `publish:write` — create resources / drafts, submit, report incidents.

A `provider` + `owner` key MAY hold any combination. Production should default new keys to `publish:read,write`; CI service keys often choose `publish:write` only.

## Audit obligations

Every state-changing call writes to the audit ledger with the parent `traceId`:

- POST `/provider/keys` → `key.create` (capturing `name`, `scope`, `prefix`, `last4`).
- PATCH `/provider/keys/{id}` → `key.update`.
- POST `/provider/keys/{id}/rotate` → `key.rotate` (capturing `gracePeriodHours`).
- POST `/provider/keys/{id}/revoke` → `key.revoke` (capturing `reason`).
- The reveal of the full secret in the modal writes `key.secret_revealed` (capturing `keyId` only, NEVER the secret).

## Negative cases

- **Authenticated, no `provider`:** 403 server-side; SPA renders "You don't have provider access" empty state.
- **`provider` without `owner` clicks `Create key`:** UI MAY surface the modal but submit returns 403; preferred UX is to disable the button up-front with a tooltip `Owner role required to create keys.`
- **Revoke a key already revoked:** 409; UI MUST refresh the row.
- **Rotate a key already revoked:** 409; UI must surface an error.
- **Stale session:** 401 forces sign-out.

## Data residency

- Key rows are tenant-scoped via session-derived `providerId`.
- The full secret is generated server-side using the tenant's KMS root; it never leaves the tenant's region.
- Telemetry events are tenant-scoped; cross-tenant event aggregation MUST NOT include `keyId`.
