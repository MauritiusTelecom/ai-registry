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

# Provider · Billing module — Flows

## Routing

- Route lives at `/billing` of the provider portal hash router.
- Activated via sidebar `Billing` (anchor `href="#/billing"`) or command palette.
- Active match: exact `'/billing'` OR `path.startsWith('/billing/')`.

## Initial render

1. `App` resolves `path === '/billing'` → renders `<ProvBilling/>`.
2. `ProvBilling` reads `P.billing` directly (no local state in prototype).
3. `DataTable` paints synchronously with all 3 mock rows in document order.
4. Production: emit `provider.billing.viewed` after first paint.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Statement detail` route ships:

- Row click → `navigate(/billing/{periodIso})`.
- Detail page surfaces:
  - The full statement (period, usage, tier, amount, status).
  - Line items breakdown (calls per kind, egress per Tier-3 model, etc.).
  - For paid tiers: `Download invoice (PDF)` button → `GET /provider/billing/{periodIso}/invoice.pdf`.
  - For paid tiers: `Dispute` action → opens a modal capturing `reason` ≥12 chars; POSTs `/provider/billing/{periodIso}/dispute`.
  - For sovereign tier: a clarifying note `Sovereign-tier statements report usage at zero cost. There is no invoice to download or dispute.`

## Sovereign vs paid tier

- For **sovereign** tenants in v0.4 every row has `tier === 'Sovereign'` and `amount === 'MUR 0'`. Production must keep this — sovereign-tier providers operate at zero cost; the page is purely informational.
- For **paid** tenants (production-only):
  - `Download invoice (PDF)` button appears in the statement detail.
  - `Dispute` action is available before payment.
  - The status pill maps to `due` / `paid` / `overdue` / `disputed` per the mapping in `data-model.md`.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to provider-scoped WebSocket events: `billing.statement.issued`, `billing.statement.paid`, `billing.statement.disputed`. The list updates in place.
  - Statement issuance is monthly; rows arrive on the first business day of the following month.

## Empty / error states

- **No rows** (a brand-new provider in their first month): render the table chrome with one body row text `No statements yet. The first statement will appear after your first month of usage.`
- **5xx** → render chrome + body row `Couldn't load billing.` and a top banner with `Retry`.
- **401/403** → redirect to provider sign-in / "Insufficient permissions" empty.

## Currency display

- The `amount` column renders the currency code prefix (`MUR 0`). Production should NOT strip it.
- The tenant's preferred currency is configured at onboarding; it cannot be changed mid-billing-cycle.
- Multi-currency tenants are out of scope for v0.4.

## Accessibility

- Period cell uses standard text; production should add `aria-label` reading the full period (e.g. `aria-label="April 2026"`) since the display string `Apr 2026` may be ambiguous to some screen readers.
- Amount cell mono-fonts the currency string for visual alignment but MUST remain selectable for copy-paste.
- Status pill colour MUST be paired with the displayed status word once the production status mapping ships.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
