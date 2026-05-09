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

# Sovereign · Partners module — Data model

## SovPartner

Mirrors `SOV_PARTNERS[i]` in `portals/sovereign-data.jsx`.

```ts
type SovPartner = {
  name: string;        // display name; preserve diacritics (e.g. "Madagascar Numérique")
  kind: 'regional' | 'sovereign' | 'intergov';
  resources: number;   // count of currently-shared resources
  mou: string;         // ISO date "YYYY-MM-DD" OR the literal "pending"
};
```

### Field semantics

- **`name`** — operator-curated. Preserve Unicode diacritics (`é`, `ç`, etc.).
- **`kind`** — partner taxonomy. v0.4 mock rows are all `regional`. Future categories: `sovereign` (peer national authority), `intergov` (intergovernmental body like ITU or AU).
- **`resources`** — count of resources currently shared between this tenant and the partner. `0` is a valid value when an MOU exists but no resources have been activated yet.
- **`mou`** — date the MOU was signed, OR the literal `pending` for partnerships still in negotiation. The display cell uses mono-key styling; production must keep `pending` as the canonical sentinel.

### v0.4 mock corpus (3 rows)

| name | kind | resources | mou |
|---|---|---:|---|
| IndianOceanCom | regional | 1 | 2025-09-12 |
| Madagascar Numérique | regional | 0 | 2026-02-04 |
| Seychelles Digital | regional | 0 | pending |

`IndianOceanCom` cross-references admin's `Provider` table (`prv_iocom`) — the partner is also a provider with a Tier-2 maritime-zones MCP.

## Authoritative response shape (production)

```ts
type SovPartnersResponse = {
  rows: SovPartner[];
  total: number;
  generatedAt: string;
};
```

## Constraints / invariants

- `name` MUST be unique per tenant.
- `mou === 'pending'` implies `resources === 0` (no shared resources before the MOU is signed). Production must enforce this — a non-zero `resources` count with a `pending` MOU is an error.
- Diacritics in partner names MUST be preserved as Unicode characters; production must NOT strip or transliterate.
- Once an MOU is signed, the date is immutable; renewals advance a separate `lastRenewed` field (out of scope for v0.4).

## Reference data on this page

- **Kind tags**: `regional`, `sovereign`, `intergov`. v0.4 surfaces only `regional`.
- **MOU sentinel**: the literal string `pending` for in-negotiation partnerships.
