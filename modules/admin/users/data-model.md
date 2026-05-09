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

# Admin · Users module — Data model

## User

Mirrors `ADMIN_USERS[i]` in `portals/admin-data.jsx`.

```ts
type User = {
  id: string;          // "u_<digits>"; opaque server-issued
  name: string;        // display name (full name as authored)
  email: string;       // canonical email; matches IdP subject
  role: 'admin' | 'provider' | 'verifier' | 'sovereign';
  mfa: boolean;        // true = MFA enrolled and required
  scope: string;       // "global" or domain identifier ("edu.gov.mu", "sovereignty-board", "anthropic.com", …)
  lastSeen: string;    // human-formatted relative string ("2m ago", "Just now", "Yesterday", …) — server-formatted
  status: 'active' | 'suspended' | 'invited' | 'revoked';
};
```

### Field semantics

- **`role`** — one of the four portal roles. A user may technically hold multiple roles in production; this v0.4 row carries the `role` for display only and the full role-set lives behind the user detail / IdP claim.
- **`mfa`** — boolean reflecting current enrolment state. `Settings → Identity → MFA enforcement` controls the policy floor; per-user values that fall below the floor are surfaced in red `OFF`.
- **`scope`** — string identifying the user's authority boundary. Known shapes: `global`, `<domain>`, `sovereignty-board`. Production may add structured scopes; the table renders the string verbatim.
- **`lastSeen`** — display string only. Do not parse client-side; the server formats relative time (e.g. `2m ago`, `1h ago`, `5h ago`, `Yesterday`, `6d ago`, `Just now`).
- **`status`** — full enum: `active`, `suspended`, `invited`, `revoked`. UI maps anything other than `active` to a single `isolated` StatusPill visual.

### v0.4 mock corpus (8 rows)

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

## Authoritative response shape (production)

```ts
type AdminUsersResponse = {
  rows: User[];
  total: number;
  counters: { active: number; suspended: number; invited: number; revoked: number };
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

`counters` is reserved for future StatCard use; v0.4 does not surface them.

## Constraints / invariants

- `email` MUST be unique per tenant.
- A user with `mfa === false` AND `Settings → Identity → MFA enforcement === 'all'` MUST NOT be allowed to start a new session; existing sessions stay valid until expiry. The list still surfaces the row with red `OFF` until enrolment.
- `status === 'invited'` rows have a NULL effective scope server-side until activation; UI shows the prospective scope.
- `status === 'revoked'` rows MUST NOT be removed from the table; they remain as an immutable record. Production MAY hide them by default behind a future `Show revoked` toggle.

## Reference data on this page

- **Role tags:** `admin`, `provider`, `verifier`, `sovereign`. Rendered as `p-tag` chip.
- **MFA cell colour map:** `true` → `#10b981` (green), `false` → `#ef4444` (red).
- **StatusPill mapping (display-only):** `active` → `active`, all others → `isolated`. Persisted value is the user-native enum.
