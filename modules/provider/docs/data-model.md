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

# Provider · Docs module — Data model

## DocCard

Mirrors `PROV_DOCS[i]` in `portals/provider-data.jsx`.

```ts
type DocCard = {
  id: string;          // "d_<digits>"; opaque server-issued
  title: string;       // human-readable title
  kind: 'guide' | 'reference' | 'runbook';   // production may add 'tutorial' | 'changelog'
  updated: string;     // ISO date "YYYY-MM-DD"
  url?: string;        // canonical doc URL (production); prototype uses href="#" stub
};
```

### Field semantics

- **`title`** — display string; rendered verbatim including any Unicode dashes.
- **`kind`** — coarse taxonomy. Drives optional colour-coding and may filter the page in future revisions:
  - `guide` — step-by-step walkthrough.
  - `reference` — concept / API doc.
  - `runbook` — operational response (incidents, on-call).
- **`updated`** — date the canonical doc was last revised. Surfaces in the card sub line `${kind} · updated ${updated}`.
- **`url`** — canonical doc URL (production). The prototype shows `href="#"` as a stub.

### v0.4 mock corpus (5 rows)

| id | title | kind | updated |
|---|---|---|---|
| d_001 | Publish your first MCP server | guide | 2026-05-01 |
| d_002 | Sovereignty tier reference | reference | 2026-04-22 |
| d_003 | Eval harness — submitting benchmarks | guide | 2026-04-12 |
| d_004 | API key rotation | reference | 2026-03-30 |
| d_005 | Incident response runbook | runbook | 2026-02-18 |

## Authoritative response shape (production)

```ts
type ProviderDocsResponse = {
  rows: DocCard[];
  total: number;
  generatedAt: string;
};
```

## Constraints / invariants

- `id` is unique per registry (NOT per provider — docs are shared across all providers).
- Docs are public information; the same set is surfaced on the public docs site.
- The `url` MUST be HTTPS in production.
- The `updated` field MUST monotonically advance per doc (a revision cannot move backward in time).

## Reference data on this page

- **Doc kinds:** `guide`, `reference`, `runbook`. Production may add `tutorial`, `changelog`.
- **Date format:** ISO date `YYYY-MM-DD` for cross-locale stability; the card sub renders it verbatim.
