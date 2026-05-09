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

# Public · Ecosystem module — Data model

## EcosystemTier

Mirrors the `partners` array in `EcosystemPage` (`components/pages.jsx`).

```ts
type EcosystemTier = {
  tier: 'Sovereign Operators' | 'Model Providers' | 'Hosting & Identity' | 'Integration Partners' | string;
  items: string[];     // partner display names, in the order they should render
};
```

### Field semantics

- **`tier`** — display label rendered as the eyebrow string. The four v0.4 tiers cover the full set of operator categories the registry needs.
- **`items`** — partner display names. Free-form strings; production may swap to `{ name, slug, logoUrl }` once per-partner detail pages exist.
- Order within `items` matters — render in source order.

### v0.4 mock corpus (4 tiers, 18 partners total)

| Tier | Items |
|---|---|
| Sovereign Operators | Government of Mauritius · Ministry of Finance · Mauritius Revenue Authority · Bank of Mauritius · EDB Mauritius |
| Model Providers | Anthropic · OpenAI · Meta · Llama · Mistral AI · University of Mauritius (Kreol LLM) |
| Hosting & Identity | Sovereign Cloud MU · Public GPU Co-op · On-prem operators · SPIFFE/SPIRE federation |
| Integration Partners | Accenture · Deloitte Sovereign · Local SI Network · Independent reviewers |

The `Meta · Llama` item in Model Providers uses Unicode middle dot U+00B7 between the two words.

## Authoritative response shape (production)

```ts
type PublicEcosystemResponse = {
  tiers: EcosystemTier[];
  generatedAt: string;
};
```

Production should serve the same payload to anonymous visitors with a long CDN cache (1 hour) and bust on partner addition / removal.

## Constraints / invariants

- A partner SHOULD appear in exactly one tier. If a partner straddles tiers (rare), it appears under the most-specific tier.
- Tier order MUST match v0.4: Sovereign Operators → Model Providers → Hosting & Identity → Integration Partners. Production may add new tiers AFTER these four; reordering existing tiers is a breaking visual change.
- Partner display names are operator-curated. Production must NOT auto-generate them from any internal id.
- `items` array MAY be empty (e.g. a tier that exists structurally but has no partners yet). The block still renders with the eyebrow + hairline; the grid simply renders nothing.

## Reference data on this page

- **Tier eyebrow style**: `.eyebrow` class with leading `<span class="dot">` (small dot indicator) + `<span>{tier}</span>`.
- **Hairline**: `flex: 1, height: 1, background: var(--hairline)` to the right of the eyebrow.
- **Grid breakpoint**: `gridTemplateColumns: repeat(auto-fill, minmax(220px, 1fr))` — collapses to single column below ~440px.
