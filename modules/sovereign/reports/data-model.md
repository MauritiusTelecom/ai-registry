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

# Sovereign · Reports module — Data model

## SovReport

Mirrors the inline `reports` array in `SovReports` (`portals/sovereign-pages.jsx`).

```ts
type SovReport = {
  id: string;          // "r<digits>"; opaque server-issued (production)
  name: string;        // human-readable title (em dashes preserved)
  issued: string;      // ISO date "YYYY-MM-DD"
  url?: string;        // signed URL to the PDF (production)
};
```

### Field semantics

- **`id`** — local React key in v0.4. Production: opaque server-issued.
- **`name`** — operator-curated title. Preserve Unicode glyphs (em dash U+2014, accented characters).
- **`issued`** — date the report was published. ISO format.
- **`url`** — production-only. Signed URL with short TTL for the PDF; never persisted in the SPA cache.

### v0.4 mock corpus (3 reports)

| id | name | issued |
|---|---|---|
| r1 | Q2 2026 — Sovereignty review | 2026-05-01 |
| r2 | External frontier model annual | 2026-04-15 |
| r3 | Health sector audit | 2026-04-29 |

## Authoritative response shape (production)

```ts
type SovReportsResponse = {
  rows: SovReport[];
  total: number;
  generatedAt: string;
};
```

`SovReport.url` is included on the list response only when the operator clicks `View` or `Download`; otherwise the SPA fetches a fresh signed URL on-demand to keep TTLs short.

## Constraints / invariants

- `id` is unique per tenant.
- `issued` MUST be ≤ today; future-dated reports are not allowed without an explicit "embargoed until" workflow (out of scope for v0.4).
- Reports are immutable once issued; corrections are new reports with a footer note pointing to the original.

## Reference data on this page

- **Card icon**: `audit` icon at size 18 (decorative, top-right of each card).
- **Action buttons**: secondary `View` with `eye` icon, ghost `Download` with `arrow-up-right` icon.
