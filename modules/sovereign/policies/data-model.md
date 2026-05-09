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

# Sovereign · Policies module — Data model

## SovPolicy

Mirrors `SOV_POLICIES[i]` in `portals/sovereign-data.jsx`. This is a sovereign-curated subset of the canonical `Policy` shape (defined in `modules/admin/policies/data-model.md`).

```ts
type SovPolicy = {
  id: string;          // "pol_<slug>"; matches admin's canonical Policy.id
  name: string;        // human-readable label
  scope: string;       // free-form scope: 'all' | 'tier-1' | 'tier-2' | 'tier-3' | 'restricted' | …
  enforced: boolean;   // true = active in policy decision point
  updated: string;     // ISO date "YYYY-MM-DD" of last published change
};
```

### Field semantics

- **`id`** — same canonical id used in the admin `/policies` table; cross-references the full version history maintained there.
- **`name`** — display label as authored by admins. The em dash in `PII handling — Mauritian DPA` is Unicode U+2014.
- **`scope`** — sovereign-relevant scopes. v0.4 covers `Tier-3` (cross-border egress), `all` (PII), `restricted` (DPIA).
- **`enforced`** — boolean. The display cell uppercases to `YES` / `NO`; v0.4 mock data has all three policies enforced.
- **`updated`** — last-published date.

### v0.4 mock corpus (3 rows)

| id | name | scope | enforced | updated |
|---|---|---|---|---|
| pol_egress | Egress to non-MU jurisdictions | Tier-3 | true | 2026-05-07 |
| pol_pii | PII handling — Mauritian DPA | all | true | 2026-04-22 |
| pol_dpia | DPIA required | restricted | true | 2026-03-09 |

Note this is a **subset** of admin's policy catalogue (admin shows 5 rows in v0.4). The sovereign view filters to policies the sovereign operator should care about (egress, PII, DPIA); operational policies like `Audit retention` live only on the admin surface.

## Authoritative response shape (production)

```ts
type SovPoliciesResponse = {
  rows: SovPolicy[];
  total: number;
  generatedAt: string;
};
```

## Constraints / invariants

- A policy listed here also exists in admin's `/policies`. Editing happens on the admin side; sovereign reads.
- The sovereign portal NEVER mutates policies — `/policies` here is read-only by design.
- Policy violations cross-reference admin's `/audit` (filtered by `policy.violation`); the sovereign view does NOT surface raw violations on this page.
- The `Enforced` column is colour-paired with text — production must vary the colour by sign (`true` → green, `false` → muted) and keep the literal `YES` / `NO` letters for accessibility.

## Reference data on this page

- **Scope tags rendered**: `Tier-3`, `all`, `restricted` in v0.4. Other valid scopes (`tier-1`, `tier-2`) MAY appear if relevant policies emerge.
- **Enforced colour map**: `true` → `#10b981` (green), `false` → `var(--p-text-3)` (muted). v0.4 hard-codes green because all rows are enforced.
- The em dash in policy names MUST be preserved as Unicode U+2014.
