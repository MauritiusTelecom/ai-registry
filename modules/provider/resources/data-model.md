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

# Provider · Resources module — Data model

## ProviderResource

Mirrors `PROV_RESOURCES[i]` in `portals/provider-data.jsx`. This is a provider-scoped projection of the canonical `Resource` (defined in `modules/admin/resources/data-model.md`); production should serve a derived view that adds `usage`, `latency`, `errors`, and `version` and omits provider-only fields like `region`/`desc` from the table response (the detail endpoint returns the full canonical `Resource`).

```ts
type ProviderResource = {
  id: string;          // "p_<digits>"; opaque server-issued
  slug: string;        // "mcp/edu-curriculum" — identical to canonical Resource.slug
  kind: 'mcp-server' | 'agent' | 'tool' | 'model';
  status: 'verified' | 'review' | 'experimental' | 'isolated' | 'archived' | 'draft';
  sov: 'Tier-1' | 'Tier-2' | 'Tier-3' | 'Restricted' | '—';   // '—' for draft / pre-launch
  updated: string;     // "YYYY-MM-DD"
  usage: string;       // "12.4k" | "8.8k" | "320" | "—" — display string only
  latency: string;     // "142ms" | "88ms" | "1.2s" | "—" — server-formatted with unit suffix
  errors: string;      // "0.04%" | "2.1%" | "—" — server-formatted with % suffix
  version: string;     // "v<major>.<minor>.<patch>" SemVer of the latest published version
};
```

### Field semantics

- **`status`** — broadens the canonical Resource enum with `draft`. A `draft` resource is visible to its provider but never resolved or surfaced publicly. The transition `draft → review` happens on first submission via `/publish`.
- **`sov`** — sovereignty tier matches `Resource.sov`. The literal `'—'` is the only valid non-tier value, reserved for `draft` rows.
- **`version`** — bumped on every successful publish. The prototype shows pre-`v1.0.0` versions for `experimental` and `draft` rows.
- **`usage` / `latency` / `errors`** — display strings produced server-side. Production should serve raw numbers ALONGSIDE display strings if the UI needs to colour-code; v0.4 surfaces only the strings.

### v0.4 mock corpus (4 rows)

| id | slug | kind | status | sov | usage | latency | errors | updated | version |
|---|---|---|---|---|---|---|---|---|---|
| p_001 | mcp/edu-curriculum | mcp-server | verified | Tier-1 | 12.4k | 142ms | 0.04% | 2026-05-04 | v3.2.0 |
| p_002 | tool/translate-mfe | tool | verified | Tier-1 | 8.8k | 88ms | 0.01% | 2026-05-04 | v2.1.0 |
| p_003 | agent/curriculum-tutor | agent | experimental | Tier-1 | 320 | 1.2s | 2.1% | 2026-05-06 | v0.4.0 |
| p_004 | tool/lesson-search | tool | draft | — | — | — | — | 2026-05-07 | v0.1.0 |

## Authoritative response shape (production)

```ts
type ProviderResourcesResponse = {
  rows: ProviderResource[];
  total: number;
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

The detail endpoint (planned, out of scope here) returns the full canonical `Resource` joined with the provider-scoped metrics.

## Constraints / invariants

- A provider cannot publish a resource whose `slug` does not match the kind prefix (`mcp/*` for `mcp-server`, `agent/*` for `agent`, etc.). Validation runs in the `/publish` wizard `Run local checks` button before submission.
- A `draft` resource has `sov === '—'`, `usage === '—'`, `latency === '—'`, `errors === '—'`. Production MUST NOT serve numeric metrics for drafts (they have no traffic).
- A resource with `status === 'isolated'` continues to appear in this list (with the canonical isolation reason surfaced on the planned detail route). Provider cannot self-recover from isolation; the admin must lift it.
- `version` is monotonic per resource id. Re-publishing the same version is rejected with 409.

## Cross-references

- The same resources appear in admin's `/resources` table (under the provider's `slug`); admin sees an additional `region` and `risk` column and can isolate any resource.
- Submissions (`/submissions`) reference these resources by `slug` (with optional `vX.Y.Z` suffix on the `target` field).
- Incidents (`/incidents`) reference these resources by `slug`.

## Reference data on this page

- **Status pills:** `verified`, `experimental`, `draft`, plus the broader enum (`review`, `isolated`, `archived`) when applicable.
- **Tier tags:** `Tier-1`, `Tier-2`, `Tier-3`, `Restricted`, plus the literal `'—'` for drafts.
- **Sentinel:** `'—'` is the canonical "not applicable" marker — production must use Unicode em dash (U+2014), NOT a hyphen-minus.
