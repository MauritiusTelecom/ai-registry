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

# Admin · Policies module — Data model

## Policy

Mirrors `ADMIN_POLICIES[i]` in `portals/admin-data.jsx`.

```ts
type Policy = {
  id: string;          // "pol_<slug>"; opaque server-issued
  name: string;        // human-readable label
  scope: 'all' | 'tier-1' | 'tier-2' | 'tier-3' | 'restricted' | string;
  version: string;     // "v<major>.<minor>"; immutable per row
  updated: string;     // ISO date "YYYY-MM-DD"
  enforced: boolean;   // true = active in policy decision point; false = shadow / draft
};
```

### Field semantics

- **`scope`** — which class of resources the policy applies to. `all` is registry-wide; `tier-1`/`tier-2`/`tier-3` map to sovereignty tiers; `restricted` matches resources whose `sov === 'Restricted'`. Production may add finer scopes (e.g. `provider:anthropic.com`).
- **`version`** — bumped on every published change. Each version is content-addressed; the row in this table represents the **active** version.
- **`updated`** — date of last published change. Earlier versions remain accessible via the planned version-history route.
- **`enforced`** — when `false`, the policy runs in shadow mode (logs violations without blocking). When `true`, violations block the action and write `policy.violation` to the audit ledger.

### v0.4 mock corpus (5 rows)

| id | name | scope | version | updated | enforced |
|---|---|---|---|---|---|
| pol_egress_default | Default egress policy | all | v3.2 | 2026-05-07 | true |
| pol_pii_handling | PII handling | tier-1 | v2.4 | 2026-04-22 | true |
| pol_external_models | External model access | tier-3 | v1.7 | 2026-05-01 | true |
| pol_dpia_required | DPIA required | restricted | v1.1 | 2026-03-09 | true |
| pol_audit_retention | Audit retention | all | v4.0 | 2026-02-14 | true |

## PolicyVersion (out of scope on this page; documented for cross-reference)

```ts
type PolicyVersion = {
  policyId: string;    // FK to Policy.id
  version: string;     // immutable
  body: string;        // policy source (Rego / CEL / similar)
  hash: string;        // content-addressed hash
  publishedAt: string; // ISO date-time UTC
  publishedBy: string; // actor email
};
```

## Authoritative response shape (production)

```ts
type AdminPoliciesResponse = {
  rows: Policy[];
  total: number;
  generatedAt: string;
};
```

## Constraints / invariants

- `id` is unique per tenant.
- `(id, version)` is globally unique and immutable; publishing a change increments `version` and writes a new `PolicyVersion` row.
- Setting `enforced = true` on a row whose `version` has never been published in shadow mode MUST be blocked with a 422; production should require at least 24h of shadow-mode evaluation before activation.
- Settings defaults rely on policy presence:
  - `Settings → Sovereignty defaults → Egress posture` is the *default*; `pol_egress_default` is the *enforced rule*.
  - `Settings → Sovereignty defaults → DPIA threshold` value (`any-PII`) drives `pol_dpia_required` matching.
  - `Settings → Audit & retention → Retention` (`7 years`) drives `pol_audit_retention`.

## Reference data on this page

- **Scope tags:** `all`, `tier-1`, `tier-2`, `tier-3`, `restricted`. Rendered as `p-tag` chip.
- **Enforced colour mapping:** `true` → `#10b981` (green), `false` → `var(--p-text-3)` (muted).
