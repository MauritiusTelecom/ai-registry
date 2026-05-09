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

# Provider · Billing module — Data model

## BillingStatement

Mirrors `PROV_BILLING[i]` in `portals/provider-data.jsx`.

```ts
type BillingStatement = {
  period: string;     // human-readable month label, e.g. "Apr 2026"
  usage: string;      // server-formatted display string, e.g. "94.2k calls"
  tier: 'Sovereign' | 'Tier-1' | 'Tier-2' | 'Tier-3' | string;
  amount: string;     // currency-code-prefixed display, e.g. "MUR 0", "MUR 12,500"
  status: 'covered' | 'paid' | 'due' | 'overdue' | 'disputed';
};
```

### Field semantics

- **`period`** — calendar month for the statement; format is locale-dependent (`Apr 2026` for `en-GB`-styled tenants). Production should serve a stable machine-readable `periodIso` (e.g. `2026-04`) alongside.
- **`usage`** — display string. Production must accompany with raw `usageCount` so charts and downstream systems can re-derive without parsing.
- **`tier`** — for sovereign-tier providers, the literal `Sovereign`. For production paid tiers, one of `Tier-1`, `Tier-2`, `Tier-3` mapping to the canonical sovereignty tiers.
- **`amount`** — currency-code-prefixed display string. The prototype uses `MUR 0` because all v0.4 mock rows are sovereign-tier. Production-paid tiers render `MUR 12,500` etc.
- **`status`** — five-state enum:
  - `covered` — sovereign-tier statement, no payment due.
  - `paid` — invoice paid.
  - `due` — invoice issued, not yet paid.
  - `overdue` — past due date.
  - `disputed` — flagged by the operator; collection on hold pending resolution.

### v0.4 mock corpus (3 rows)

| period | usage | tier | amount | status |
|---|---|---|---|---|
| Apr 2026 | 94.2k calls | Sovereign | MUR 0 | covered |
| Mar 2026 | 88.1k calls | Sovereign | MUR 0 | covered |
| Feb 2026 | 79.4k calls | Sovereign | MUR 0 | covered |

## Authoritative response shape (production)

```ts
type ProviderBillingResponse = {
  rows: BillingStatement[];
  total: number;
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## BillingStatementDetail (production-only)

```ts
type BillingStatementDetail = BillingStatement & {
  periodIso: string;             // "2026-04"
  usageCount: number;            // 94200 — raw integer matching `usage` display
  amountMinorUnits: number;      // 0, 1250000 (cents/paise/etc per ISO-4217 minor)
  currency: string;              // "MUR"
  invoiceUrl?: string;           // signed URL to the PDF (production)
  lineItems?: Array<{
    label: string;               // "MCP server calls", "Egress to Tier-3 model", …
    count: number;
    amountMinorUnits: number;
  }>;
};
```

## Constraints / invariants

- Statements are immutable once issued; corrections are credit / debit notes (separate rows).
- A `Sovereign`-tier statement MUST have `amountMinorUnits === 0`.
- A statement with `status === 'disputed'` has its `amountMinorUnits` retained but is excluded from billing roll-ups.
- The `period` display string MUST agree with `periodIso`; production renders `period` from `periodIso` server-side.
- Amount rendering MUST keep the currency code prefix; clients MUST NOT strip it for layout reasons.

## Reference data on this page

- **Tier tags:** `Sovereign` (zero-cost), `Tier-1`, `Tier-2`, `Tier-3` (paid). Each maps to a different billing schedule.
- **Status pill:** v0.4 hard-codes `verified` regardless of the persisted `status`; production should map per the table in `product.md`.
- **Currency codes:** any ISO-4217 alpha-3; v0.4 uses `MUR`.
