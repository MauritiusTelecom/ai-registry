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

# Provider · Team module — Org members

## Purpose

Specify the **`/team` route** of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every human and service member of the active provider's organisation, with their role.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table | `portals/provider-app.jsx` (`'/team'` → `PROV_PAGES.ProvTeam`) |
| Page component (`ProvTeam`) + inline mock array | `portals/provider-pages.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

Note: the team array is **inline** in `provider-pages.jsx` (not in `provider-data.jsx`). Production should move it to a server endpoint; the prototype keeps it inline because the team set is tiny and provider-specific.

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` overrides:
  - `currentTitle="Team"`
  - `breadcrumb=["Provider", "Org", "Team"]`
  - Active sidebar item: `Team` (`path: "/team"`).

## Route body — vertical layout (`ProvTeam`)

1. **PageHeader**
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Team`
- **Subtitle:** `Members of your provider org.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `Invite`

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `name` | `Member` | (auto) | Stack: top `name` (strong); bottom `email` (`p-cell-meta`) |
| `role` | `Role` | 130 | `<span class="p-tag">{role}</span>` |

Only two columns. Rows bind to the inline `team` array. The table is **non-interactive** (no `onRowClick`).

## Mock team — inline in `provider-pages.jsx`

The prototype hard-codes three rows for the `eduMu` provider:

| id | name | email | role |
|---|---|---|---|
| t1 | Sanjeev Pillay | sanjeev@edu.gov.mu | owner |
| t2 | Anjali Soobron | anjali@edu.gov.mu | editor |
| t3 | CI Pipeline | ci-bot@edu.gov.mu | service |

The role taxonomy:
- **`owner`** — full provider org control (create/rotate/revoke keys, invite members, billing).
- **`editor`** — publish + observe.
- **`service`** — automated CI / deployment seat. Bound to a key, not an interactive session.

## Visual and motion

- Member name + email use the standard `p-cell-stack` pattern (strong over meta).
- Role tag uses the `p-tag` chip; production may colour-code by role (owner = primary tint, editor = secondary tint, service = muted) — v0.4 uses uniform tag colour.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.

## Navigation behaviour

- `Invite` (header primary): no-op stub in prototype. Production opens an invite modal capturing:
  - **Email** — RFC-5322; must NOT match an existing active member.
  - **Role** — radio: `owner | editor | service`.
  - **Expires (service only)** — optional date. Service seats SHOULD have explicit expiry per security policy.
- On submit → POST `/provider/team/invite`.
- Row click: not bound on this page; planned for production once a per-member detail / role-edit drawer ships.

## Out of scope on this page

- Per-member detail / activity (planned).
- Per-member API key linkage (`service` members tie to specific keys; cross-link planned).
- Team-level audit (lives under the planned `Org → Audit` route).

## Differences vs admin/users

For implementers familiar with the admin module:

| Concern | Admin /users | Provider /team |
|---|---|---|
| Scope | All four portals' operators | This provider's org only |
| Header secondary | `Invite log` | (none) |
| Header primary | `Invite user` | `Invite` |
| Columns | User, Role, Scope, MFA, Last seen, Status | Member, Role |
| Role taxonomy | admin/provider/verifier/sovereign | owner/editor/service |
| MFA cell | yes | no (provider org policy may diverge) |
| Status pill | yes | no |
