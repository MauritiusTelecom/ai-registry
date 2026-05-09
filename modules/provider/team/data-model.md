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

# Provider · Team module — Data model

## TeamMember

Mirrors the inline `team` array in `ProvTeam` (`portals/provider-pages.jsx`).

```ts
type TeamMember = {
  id: string;          // "t<digits>"; opaque server-issued
  name: string;        // display name (humans) or descriptive label (services)
  email: string;       // canonical email; for service members this is a bot mailbox
  role: 'owner' | 'editor' | 'service';
};
```

### Field semantics

- **`role`** — three-state taxonomy:
  - `owner` — full provider-org control (key management, invitations, billing, settings).
  - `editor` — publish + observe scope; cannot manage keys or invite members.
  - `service` — non-interactive seat tied to one or more API keys; never receives an invitation email.
- **`name`** for service members SHOULD be a descriptive label like `CI Pipeline`, `Release Bot`, etc.
- **`email`** for service members MUST be a real mailbox (so audit notifications and rotation reminders land somewhere); the prototype uses `ci-bot@edu.gov.mu`.

### v0.4 mock corpus (3 rows; inline in `provider-pages.jsx`)

| id | name | email | role |
|---|---|---|---|
| t1 | Sanjeev Pillay | sanjeev@edu.gov.mu | owner |
| t2 | Anjali Soobron | anjali@edu.gov.mu | editor |
| t3 | CI Pipeline | ci-bot@edu.gov.mu | service |

## Authoritative response shape (production)

Production should expose a real endpoint:

```ts
type ProviderTeamResponse = {
  rows: TeamMember[];
  total: number;
  generatedAt: string;
};
```

## Constraints / invariants

- `email` is unique per provider tenant.
- A provider org MUST have at least one `owner` at all times. Demoting / revoking the only owner is rejected with 422.
- `service` members CANNOT switch role to `owner` or `editor`; the SPA must surface this as disabled.
- `service` member `email` MUST resolve to an inbox the org actually monitors (production should validate at invite time).

## Reference data on this page

- **Role tags:** `owner`, `editor`, `service`. Identical across all provider tenants.
- The `Settings → Notifications → Incident channel` integration governs where role-change notifications fire.
