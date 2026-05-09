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

# Admin · Dashboard module — Permissions and access

## Surface classification

The admin dashboard is **authenticated**, **role-gated** content. It is the default landing page of the Admin portal and must never be served to unauthenticated visitors or to authenticated users without the `admin` role.

## Required roles

To reach `portals/admin.html` and the route `/`:

- The session must hold the **`admin`** role for the active sovereign tenant.
- A user with multiple roles (e.g. `admin` + `provider`) must have explicitly selected the `admin` portal via either:
  - Direct URL (`portals/admin.html`),
  - Public site `User menu → Switch role → Administrator` (`Sovereign AI Registry.html#/portal/admin`),
  - Command palette `Go to → Admin portal` from another portal.

## Authentication binding

Production:

- Bind the admin portal to the sovereign IdP (`gov.mu OIDC` per `Settings → Identity → Primary IdP` default).
- MFA enforcement is **mandatory** for the `admin` role per `Settings → Identity → MFA enforcement` default of `All roles`.
- Session lifetime defaults to `8h`. After expiry the dashboard MUST replace its body with the sign-in flow (no silent partial render).

Prototype:

- The prototype mocks identity. The default mock user on the admin portal is `John Reyes` (`john@gov.mu`, role `admin`, MFA `on`, scope `global`). User context lives in browser memory only.

## Per-element gating on this page

| UI element | Required role(s) | Notes |
|------------|------------------|-------|
| Sidebar item `Dashboard` | `admin` | The sidebar itself is gated by portal entry. |
| Sidebar item `Resources` | `admin` | |
| Sidebar item `Providers` | `admin` | |
| Sidebar item `Review queue` | `admin` | |
| Sidebar item `Flags & incidents` | `admin` | |
| Sidebar item `Policies` | `admin` | |
| Sidebar item `Users & roles` | `admin` | Production may further gate to `admin` + scope `global`. |
| Sidebar item `Audit log` | `admin` | |
| Sidebar item `Integrations` | `admin` | |
| Sidebar item `Settings` | `admin` | Production may further gate to `admin` + scope `global`. |
| `Open status page` button | `admin` | Read-only external nav; safe to surface widely if status page is public. |
| `Onboard provider` button | `admin` | Initiates a write flow on the providers route. |
| `See all` flags link | `admin` | Read-only nav. |
| `Open audit log` link | `admin` | Read-only nav. |
| StatCard values | `admin` | Aggregate counts; surface no PII. |
| Flag row body | `admin` | May surface resource slugs and rule names (e.g. `data-leak-risk`). |
| Audit row body | `admin` | May surface email addresses of actors. Production must respect the `audit.actor.redact` policy if enabled per tenant. |

## Top-bar (shell) gating

These are described in `flows.md`. Permissions:

| Action | Allowed for |
|--------|-------------|
| Command palette open | `admin` (any role on its own portal) |
| Theme toggle | All authenticated users |
| Palette switcher | All authenticated users (cosmetic) |
| Notifications dropdown | `admin`; payloads scoped to tenant |
| User menu — `Switch role` | Only roles the user actually holds |
| User menu — `Log out` | All authenticated users |

## Negative cases

- **Authenticated, no `admin` role:** the dashboard MUST 403 server-side and the SPA MUST render a "You don't have admin access" empty state with a `Go to your portal` CTA pointing to the user's most-privileged portal.
- **Unauthenticated:** redirect to admin sign-in.
- **Suspended user (e.g. `Dr. R. Beegun` in `ADMIN_USERS` mock):** the IdP MUST refuse session issuance; if a stale session reaches the page, every dashboard endpoint MUST return 401 and the SPA MUST sign the user out.

## Audit obligations for this page

Loading the dashboard fires the telemetry event `admin.dashboard.viewed` (see `events.json`) but **does not** write to the immutable audit ledger; only state-changing actions write to the ledger (`audit.notarize` is system-driven). The Recent activity card is a *read* of the ledger; reading does not write.

## Data-residency notes

- `submissionsSeries` and `recentActivity` are tenant-scoped. The server MUST scope every query by `tenantId` derived from the session, not from URL or request body.
- `openFlags` MUST exclude flags whose `target` belongs to a tenant the actor does not have read access to. In the single-tenant prototype this is moot; in a multi-tenant production this is enforced at the data layer.
