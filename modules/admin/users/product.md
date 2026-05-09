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

# Admin · Users module — Users & roles

## Purpose

Specify the **`/users` route** of the Admin portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every operator across all four portals (Admin, Provider, Sovereign Ops, Verifier), with their role, scope, MFA state, last-seen activity, and account status. SSO is bound to `gov.mu` OIDC.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/admin.html` |
| Route table | `portals/admin-app.jsx` (`'/users'` → `ADMIN_PAGES.AdminUsers`) |
| Page component (`AdminUsers`) | `portals/admin-pages.jsx` |
| Mock users (`ADMIN_USERS`) | `portals/admin-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatusPill`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Admin`
- `PortalShell` overrides:
  - `currentTitle="Users & roles"`
  - `breadcrumb=["Admin", "Operations", "Users"]`
  - Active sidebar item: `Users & roles` (`path: "/users"`).

## Route body — vertical layout (`AdminUsers`)

1. **PageHeader**
2. **DataTable** — full width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Users & roles`
- **Subtitle:** `Operators across all four portals. SSO bound to gov.mu OIDC.`
- **Actions row:**
  - Secondary button (`Btn variant="secondary" icon="arrow-up-right"`): `Invite log`
  - Primary button (`Btn variant="primary" icon="plus"`): `Invite user`

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `name` | `User` | (auto) | Stack: top `name` (strong); bottom `email` (`p-cell-meta`) |
| `role` | `Role` | 130 | `<span class="p-tag">{role}</span>` |
| `scope` | `Scope` | (auto) | `<span class="p-mono-key">{scope}</span>` |
| `mfa` | `MFA` | 80 | mono 11px uppercase letter-spacing `.08em`; text `ON` / `OFF`; colour `#10b981` when on, `#ef4444` when off |
| `lastSeen` | `Last seen` | 120 | `<span class="p-mono-key">{lastSeen}</span>` |
| `status` | `Status` | 110 | `<StatusPill status={cls}/>` where `cls = u.status === 'active' ? 'active' : 'isolated'` |

Rows bind to `A.users` (no filtering, no sorting in v0.4). The table is **non-interactive** in the prototype (no `onRowClick` passed).

## Mock users — `ADMIN_USERS`

Reproduce verbatim from `admin-data.jsx`. The eight v0.4 users span all four roles, two MFA states, and two account statuses:

| id | name | email | role | mfa | scope | lastSeen | status |
|---|---|---|---|---|---|---|---|
| u_001 | John Reyes | john@gov.mu | admin | true | global | 2m ago | active |
| u_002 | Aisha Chen | aisha@anthropic.com | provider | true | anthropic.com | 1h ago | active |
| u_003 | Sanjay Boodhoo | sanjay@review.mu | verifier | true | sovereignty-board | 14m ago | active |
| u_004 | Marie Laurent | marie@finance.gov.mu | sovereign | true | finance.gov.mu | Just now | active |
| u_005 | Sanjeev Pillay | sanjeev@edu.gov.mu | provider | true | edu.gov.mu | 3h ago | active |
| u_006 | Dr. R. Beegun | beegun@health.gov.mu | provider | false | health.gov.mu | 6d ago | suspended |
| u_007 | Yannick Boullé | yb@islandlabs.mu | provider | true | islandlabs.mu | Yesterday | active |
| u_008 | Devina Ramphul | d.ramphul@mra.mu | verifier | true | mra.mu | 5h ago | active |

## Status mapping (user status → StatusPill)

The intrinsic `status` field uses `active | suspended | invited | revoked`, but the `StatusPill` rendered in the table uses two visuals only. Mapping (one-way, display only):

| User `status` | StatusPill visual |
|---|---|
| `active` | `active` |
| `suspended`, `invited`, `revoked`, anything else | `isolated` |

Production MUST persist the canonical `active / suspended / invited / revoked` value; the UI mapping is purely visual.

## Visual and motion

- The MFA cell pairs colour with text (`ON` / `OFF`), so the cell remains accessible without colour.
- StatusPill colours per global token map.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.

## Navigation behaviour

- `Invite log` (header secondary): no-op stub in prototype. Production navigates to a log of recent invitations and their consumption.
- `Invite user` (header primary): no-op stub in prototype. Production opens an invite modal capturing `email`, `role`, `scope`, optional `message`. On submit → POST `/admin/users/invite`.
- Row click: not bound on this page; planned for production once a user detail / role-edit drawer ships.

## Out of scope on this page

- IdP configuration (lives at `Settings → Identity`).
- Per-user audit (lives at `/audit` filtered by `actor`).
- Group / team management (planned).
