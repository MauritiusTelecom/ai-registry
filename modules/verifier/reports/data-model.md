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

# Verifier · Reports module — Data model

## VerReport

Mirrors `VER_REPORTS[i]` in `portals/verifier-data.jsx`.

```ts
type VerReport = {
  id: string;          // "rpt_<slug>"; opaque server-issued
  name: string;        // human-readable title (em dashes preserved)
  kind: 'quarterly' | 'incident' | 'annual' | string;
  issued: string;      // ISO date "YYYY-MM-DD"
  signed: boolean;     // true when the collegium has digitally signed the PDF
  url?: string;        // signed URL to the PDF (production)
};
```

### Field semantics

- **`name`** — operator-curated. Preserve Unicode glyphs (em dashes U+2014, accented chars).
- **`kind`** — categorisation:
  - `quarterly` — periodic sovereignty review.
  - `incident` — special review tied to a specific incident or finding.
  - `annual` — yearly review (e.g. external frontier models).
  Production may add `monthly`, `audit`, `disclosure`, etc.
- **`issued`** — ISO date.
- **`signed`** — boolean. The signed badge renders only when `true`.
- **`url`** — production-only signed URL with short TTL.

### v0.4 mock corpus (3 reports, all signed)

| id | name | kind | issued | signed |
|---|---|---|---|---|
| rpt_2026_q2 | Q2 2026 sovereignty review | quarterly | 2026-05-01 | true |
| rpt_health_apr | mcp/health-records — special review | incident | 2026-04-29 | true |
| rpt_ext_models | External frontier models — annual | annual | 2026-04-15 | true |

## VerReportDetail (production-only)

```ts
type VerReportDetail = VerReport & {
  signers:
    Array<{
      name: string;
      collegium: string;     // e.g. "Sovereignty Board"
      signedAt: string;      // ISO date-time
      keyFingerprint: string;
    }>;
  embargoUntil?: string;     // ISO date if the report is currently embargoed
  draftAuthor?: string;      // verifier email who started the draft
};
```

## Authoritative response shape (production)

```ts
type VerifierReportsResponse = {
  rows: VerReport[];
  total: number;
  generatedAt: string;
};
```

## Constraints / invariants

- `id` is unique per tenant.
- `signed === true` requires at least one entry in `signers`. Production must NOT mark a report `signed` without recording the signer chain.
- Reports are immutable once signed. Corrections require a new report (with a footer note pointing at the original).
- `embargoUntil` (production) blocks `View` / `Download` until the date passes; the row still surfaces but the action buttons disable.
- Em dashes in titles MUST be preserved as Unicode U+2014.

## Reference data on this page

- **Card icon**: `audit` icon at size 18 (decorative, top-right of each card).
- **Action buttons**: secondary `View` with `eye` icon, ghost `Download PDF` with `arrow-up-right` icon.
- **Signed tag**: `p-tag` with `marginLeft: 'auto'` and `color: '#10b981'` rendering the literal text `signed`.
- **Kind values (v0.4):** `quarterly`, `incident`, `annual`.
