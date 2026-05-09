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

# Provider · Settings module — Permissions and access

## Surface classification

The Settings route is **authenticated** and **role-gated** (`provider`). Reading settings requires `provider`. All PATCH endpoints require `provider` + role `owner` because settings affect the provider org's identity and notification routing.

## Required roles

To reach `portals/provider.html#/settings`:

- The session must hold the `provider` role bound to the active provider's `providerId`.
- MFA mandatory.

To save settings (production endpoints):

- `PATCH /provider/settings/organisation` → `provider` + `owner`.
- `PATCH /provider/settings/notifications` → `provider` + `owner`.
- `POST /provider/settings/domain-verify` → `provider` + `owner`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Settings` | `provider` | Sidebar gated by portal entry. |
| Organisation card fields | `provider` (read), `provider` + `owner` (save) | Save fails 403 without owner. |
| Notifications card fields | `provider` (read), `provider` + `owner` (save) | |
| `Domain` field | `provider` + `owner` | Read-only post-onboarding; re-verification required to change. |
| Webhook secret reveal modal (production) | `provider` + `owner` | Same flow as `/keys` — secret shown ONCE. |

## Sensitive value handling

- **`domain`** — identity-bearing. Changing it is privileged and gated by re-verification (challenge token via DNS / signed manifest / HTTPS callback). The change is NOT applied until the proof is verified.
- **`onCallEmail`** — surfaced verbatim, but production should require a verification round-trip before incident notifications switch over.
- **`webhook`** — URL plus an HMAC secret. The secret is generated server-side, shown ONCE in the same way the create-key modal works (`modules/provider/keys`), and zeroised from React state when the modal closes.
- **`publicBio`** — surfaces on a public page; sanitise to plain text only (no HTML / Markdown / URLs).

## Audit obligations

Every PATCH writes a row to the immutable audit ledger with the parent `traceId`:

- `PATCH /provider/settings/organisation` → one of `provider.settings.organisation.<field>.changed` per dirty field (e.g. `provider.settings.organisation.publicBio.changed`).
- `PATCH /provider/settings/notifications` → `provider.settings.notifications.<field>.changed`.
- A successful domain re-verification writes `provider.settings.domain.verified` (capturing prior + new domain).
- A webhook secret rotation writes `provider.settings.webhook.secret_rotated`.

## Negative cases

- **Authenticated, no `provider`:** 403 server-side; SPA renders "You don't have provider access" empty state.
- **`provider` without `owner` edits a field:** the input may accept the keystrokes (uncontrolled), but save returns 403; preferred UX is to disable inputs up-front with a tooltip `Owner role required to change settings.`
- **`domain` PATCH without re-verification:** 409 with detail `Domain change requires re-verification — start a domain challenge first.` The SPA surfaces a `Verify new domain` link.
- **`publicBio` containing HTML / URL:** 400 with field error.
- **Concurrent save (409):** SPA surfaces a banner `Settings changed by ${updatedBy}. Reload to see the latest.`

## Data residency

- Settings are tenant-scoped; one row per provider tenant.
- The webhook URL may point to any HTTPS endpoint; production must respect the **registry's** egress policy (see `admin/settings/sovereignty.egressPosture`) — a sovereign tenant set to `blocked` cannot save outbound webhooks.
- The webhook HMAC secret is generated using the tenant's KMS root and never leaves the tenant region.
