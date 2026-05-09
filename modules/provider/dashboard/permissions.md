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

# Provider · Dashboard module — Permissions and access

## Surface classification

The provider dashboard is **authenticated** and **role-gated** (`provider`). It is the default landing page of the Provider portal and must never be served to unauthenticated visitors or to authenticated users without the `provider` role for the active provider tenant.

## Required roles

To reach `portals/provider.html` and route `/`:

- The session must hold the **`provider`** role bound to a specific `providerId` (scope = the provider's domain or id, e.g. `edu.gov.mu`, `anthropic.com`).
- A user with multiple roles (e.g. `provider` + `admin`) must have selected the provider portal via:
  - Direct URL (`portals/provider.html`),
  - Public site `User menu → Switch role → Provider`,
  - Command palette `Go to → Provider portal` from another portal.

## Authentication binding

Production:

- Provider role is asserted by the IdP claim. For sovereign-tenant providers (e.g. `eduMu`) the claim issuer is `gov.mu OIDC`; for external providers (e.g. `anthropic.com`) production may federate to a provider-supplied IdP via the `kind === 'identity'` integration.
- MFA is mandatory unless the tenant `Settings → Identity → MFA enforcement` is set to `admin` only (provider role exempted) — not recommended for production.
- Session lifetime defaults to `8h`.

Prototype:

- Identity is mocked. Default mock user on the provider portal is `Aisha Chen` (`aisha@anthropic.com`, role `provider`).
- The dashboard's PageHeader title in the prototype is hard-coded to `eduMu — Provider portal`; production must replace with the **active provider's display name** drawn from the session.

## Per-element gating

| UI element | Required role(s) | Notes |
|------------|------------------|-------|
| Sidebar item `Dashboard` | `provider` | Sidebar gated by portal entry. |
| Sidebar item `Publish` | `provider` + scope `publish:write` (production) | The 5-step wizard requires write capability. |
| Sidebar item `Submissions` | `provider` | Read-only. |
| Sidebar item `Analytics` | `provider` | Read-only. |
| Sidebar item `Incidents` | `provider` | Read-only on this page; `Report incident` on the route requires write. |
| Sidebar items `API keys`, `Team`, `Billing`, `Settings` | `provider` + role `owner` of the provider org (production) | Org-management surfaces are owner-only. |
| Sidebar items `Docs`, `My resources` | `provider` | Read-only on these routes; resource detail / edit surfaces gate further. |
| `View public profile` button | `provider` | Read-only external nav. |
| `Publish resource` button | `provider` + scope `publish:write` (production) | Initiates write flow on `/publish`. |
| `All` link on Open submissions | `provider` | Read-only nav. |
| StatCard counters | `provider` | Aggregate counts; surface no PII. |
| Submission row body | `provider` | Surfaces resource slugs and stages. |

## Top-bar (shell) gating

Identical to admin dashboard's shell; see `modules/admin/dashboard/permissions.md`. Notable differences for the provider portal:

| Action | Allowed for |
|--------|-------------|
| User menu — `Switch role` to `Admin` | Only if user holds an admin role somewhere |
| User menu — `Switch role` to `Sovereign Ops` | Only if user is on a sovereign-tenant provider org |
| Notifications | provider; payloads scoped to the active provider's resources |

## Negative cases

- **Authenticated, no `provider`:** the dashboard MUST 403 server-side and the SPA MUST render a "You don't have provider access" empty state with a `Go to your portal` CTA pointing to the user's most-privileged portal.
- **Provider with `status === 'isolated'`:** the dashboard renders but every endpoint returns a sentinel response with all values zeroed and a top banner: `Your provider account is isolated. Contact registry support.` Resource publication is blocked.
- **Provider with `status === 'review'` (newly onboarded):** the dashboard renders but `Publish resource` is disabled with tooltip `Provider verification pending.` until the admin board approves.
- **Unauthenticated:** redirect to provider sign-in.

## Audit obligations for this page

Loading the dashboard fires `provider.dashboard.viewed` (telemetry, **not** ledger). State-changing actions on linked routes write to the audit ledger in their own modules:

- `Publish resource` flow → `resource.publish` (in `modules/provider/publish`)
- `Report incident` flow → `incident.create` (in `modules/provider/incidents`)
- `Create key` flow → `key.create` (in `modules/provider/keys`)

The dashboard itself writes nothing to the ledger.

## Data residency

- All four data domains (summary, usage, openSubmissions, ledger of incidents) are scoped to the active provider tenant via session-derived `providerId`.
- Cross-provider visibility is **not** allowed — a `provider` of `eduMu` can never see traffic for `anthropic.com`.
- The public profile (linked from `View public profile`) IS public; it surfaces a curated subset (resources live + tier) and does not include the StatCard deltas or weekly traffic.
