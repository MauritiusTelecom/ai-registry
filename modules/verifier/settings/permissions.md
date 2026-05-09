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

# Verifier · Settings module — Permissions and access

## Surface classification

The Settings route is **authenticated**, **role-gated** (`verifier`), and **write-capable** via a single PATCH endpoint.

These settings are **per-verifier**, NOT per-tenant. Each verifier seat owns its own profile + queue preferences; admins do not see or edit other verifiers' settings here (admin-side user management lives at `modules/admin/users`).

## Required roles

To reach `portals/verifier.html#/settings`:

- The session must hold the `verifier` role bound to a verifier scope.
- MFA mandatory.

To save settings:

- `PATCH /verifier/settings` requires `verifier`. The actor can only modify their own settings; production rejects cross-user edits with 403.
- `Collegium` change MUST validate against the actor's known collegium memberships; production rejects unknown collegium with 422.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Settings` | `verifier` | Sidebar gated by portal entry. |
| Reviewer profile fields | `verifier` (read+write own) | Cross-user edit forbidden. |
| Queue preferences fields | `verifier` (read+write own) | Affects routing for this seat only. |

## Sensitive value handling

- **`displayName`** — surfaces in audit ledger entries from this seat. Production should validate against the IdP claim's display name within reason.
- **`collegium`** — operational metadata; not sensitive.
- **`specialisation`** — free-form tags; production should enforce a closed taxonomy and reject unknown tags.
- **`maxConcurrent`** — operational; not sensitive. Bounded `[1, 20]`.

## Audit obligations

Every PATCH writes a row to the immutable audit ledger with the parent `traceId`:

- `PATCH /verifier/settings` with `profile` changes → one of `verifier.settings.profile.<field>.changed` per dirty field.
- `PATCH /verifier/settings` with `preferences` changes → `verifier.settings.preferences.<field>.changed`.
- A `displayName` change additionally writes a system event so the user table on `modules/admin/users` reflects the new name on next refresh.

## Negative cases

- **Authenticated, no `verifier`:** 403 server-side.
- **Cross-user PATCH attempt** (e.g. via a forged user id): 403 with detail `Cannot edit another verifier's settings.`
- **Unknown collegium:** 422 with detail `Unknown collegium or no membership.`
- **`maxConcurrent` out of range:** 422 with detail `maxConcurrent must be between 1 and 20.`
- **Concurrent save (409):** SPA surfaces a banner `Settings changed elsewhere. Reload to see the latest.`

## Read-only invariants

- The page MUST NOT offer affordances to edit other verifiers' settings — even for admins. Admin-side cross-user management lives at `modules/admin/users`.
- Production MUST NOT allow `collegium` to be changed to a collegium the actor does not belong to; that's a privilege grant, not a personal preference.

## Data residency

- Settings are per-verifier; storage region follows the tenant region of the verifier's collegium.
- Cross-collegium settings replication is **not** implied by v0.4.
- Display name changes propagate to the user table in the same region; cross-region propagation is governed by the same rules as the audit ledger.
