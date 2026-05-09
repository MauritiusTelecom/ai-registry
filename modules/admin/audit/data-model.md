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

# Admin · Audit module — Data model

## AuditRecord

Mirrors `ADMIN_AUDIT[i]` in `portals/admin-data.jsx`.

```ts
type AuditRecord = {
  id: string;        // "a_<digits>"; opaque server-issued, monotonic per tenant
  ts: string;        // "YYYY-MM-DD HH:MM"; tenant-server local time
  actor: string;     // email, OR the literal "system" for automated events
  action: string;    // dotted token, e.g. "resource.verify", "user.invite", "audit.notarize"
  target: string;    // resource slug, user email, policy id, block id, …
  result: 'ok' | 'fail';
  sig: string;       // truncated content-addressed signature, format "<4hex>…<2hex>"
};
```

### Field semantics

- **`id`** — opaque audit record id. Monotonic per tenant; production may use ULIDs server-side and surface the truncated form.
- **`ts`** — local server time, minute precision. Production may serve ISO-8601 UTC and the UI formats; v0.4 the server pre-formats. Either way, the column is mono and 160px wide.
- **`actor`** — email of the human OR the literal sentinel `"system"`. Other sentinels MAY appear in production (`"webhook:<source>"`, `"oidc"`, etc.); the UI renders them verbatim in strong tone.
- **`action`** — dotted namespace. Known v0.4 values: `resource.verify`, `resource.review.approve`, `resource.review.reject`, `resource.publish`, `policy.update`, `health.probe`, `user.invite`, `audit.notarize`, `flag.create`, `sov.classify`. The full taxonomy is maintained in `airegistry-specs/governance/`.
- **`target`** — what the action operated on. Free-form string identifier; the UI does not parse it. Known shapes: resource slug (`mcp/edu-curriculum`), user email, policy id (`pol_*`), block id (`block_*`), provider id (`prv_*`).
- **`result`** — outcome enum. `ok` → green StatusPill `verified`, `fail` → red StatusPill `failed`.
- **`sig`** — truncated form of the content-addressed signature. Format `<4 hex chars>…<2 hex chars>` using a Unicode horizontal ellipsis (U+2026). Production-formatted; UI displays verbatim and the inspector route surfaces the full hash.

### v0.4 mock corpus (10 rows)

See `product.md` for the verbatim table; the rows below are reproduced for cross-reference:

| id | ts | actor | action | target | result | sig |
|---|---|---|---|---|---|---|
| a_4421 | 2026-05-07 09:42 | john@gov.mu | resource.verify | mcp/edu-curriculum | ok | a14b…7e |
| a_4420 | 2026-05-07 09:21 | sanjay@review.mu | resource.review.approve | agent/sugarcane-yield | ok | 92c1…3d |
| a_4419 | 2026-05-07 08:54 | marie@finance.gov.mu | policy.update | pol_egress_default | ok | d770…11 |
| a_4418 | 2026-05-07 08:31 | system | health.probe | mcp/health-records | fail | 60a3…cc |
| a_4417 | 2026-05-07 07:12 | aisha@anthropic.com | resource.publish | model/anthropic-sonnet-7 | ok | b4ee…42 |
| a_4416 | 2026-05-07 06:55 | john@gov.mu | user.invite | beegun@health.gov.mu | ok | 01f9…87 |
| a_4415 | 2026-05-06 18:44 | sanjay@review.mu | resource.review.reject | model/openai-gpt-6 | ok | aa7d…0e |
| a_4414 | 2026-05-06 18:00 | system | audit.notarize | block_8821 | ok | cc4b…91 |
| a_4413 | 2026-05-06 16:22 | john@gov.mu | flag.create | mcp/health-records | ok | 2210…ab |
| a_4412 | 2026-05-06 14:11 | marie@finance.gov.mu | sov.classify | mcp/customs-tariff | ok | fe55…73 |

## Block (notarisation envelope; out of scope on this page)

```ts
type Block = {
  id: string;            // "block_<digits>"
  range: { from: string; to: string }; // audit record id span
  count: number;         // number of records in this block
  merkleRoot: string;    // hex-encoded root hash
  signedAt: string;      // ISO-8601 UTC
  signer: string;        // signer key id (e.g. "notary-mu-2026-q2")
  notarisedAt?: string;  // when externally anchored, ISO-8601 UTC
  notaryRef?: string;    // external anchor id (e.g. txid on a public chain)
};
```

`audit.notarize` actions in the table reference these blocks via `target = "block_<id>"`. The dashboard's `Recent activity` card surfaces the same data.

## Authoritative response shape (production)

```ts
type AdminAuditResponse = {
  rows: AuditRecord[];
  total: number;             // total in current filter
  page?: { cursor?: string; size: number; hasMore: boolean };
  asOfBlock?: string;        // newest sealed block id at time of response
  generatedAt: string;
};
```

## Constraints / invariants

- The audit ledger is **append-only**. There is no UPDATE or DELETE endpoint; corrections are themselves new audit rows (`*.amended` actions).
- Each row's `sig` MUST verify against the issuing tenant's pinned signing key. If a row's signature does not verify on the verify-integrity sweep, an incident is opened automatically.
- The `result === 'fail'` rows are still part of the immutable record; failure does not preclude inclusion in the block.
- `system` actor rows always have `result === 'ok' | 'fail'`; `system.fail` rows often pair with a follow-up human row.

## Reference data on this page

- **StatusPill mapping (display-only):** `result === 'ok'` → `verified`, `result === 'fail'` → `failed`.
- The dashboard's right rail surfaces a 6-row preview with the same column set minus `id` and `sig`.
