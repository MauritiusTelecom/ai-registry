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

# Public · Registry module — Data model

## RegistryCard

Mirrors `RESOURCES[i]` in `components/registry.jsx`. The public registry list and the home-page RegistrySection both bind to this shape.

```ts
type RegistryCard = {
  id: string;          // local key (e.g. "gpt4o", "claude-45")
  kind: 'model' | 'agent' | 'skill' | 'tool';
  glyph: string;       // 2-3 char icon glyph rendered in the .r-icon square
  title: string;       // display title (e.g. "GPT-4o", "agent.tax-assistant")
  provider: string;    // free-form provider label
  status: 'verified' | 'trusted' | 'active' | 'experimental' | 'isolated';
  desc: string;        // one-paragraph description
  context: string;     // surface area (e.g. "128k", "MCP 2025-06", "Conversational + form-fill")
  latency: string;     // server-formatted latency string (e.g. "1.4s", "180ms", "<2s")
  region: string;      // free-form region code ("MU", "US/EU", "self-host", "GLOBAL")
  license: string;     // license / use term ("Commercial", "Apache-2.0", "Restricted", …)
  tags: string[];      // free-form tag list
};
```

### Field semantics

- **`id`** — local React key only. Production rows use the AIR-ID as the canonical id.
- **`kind`** — used by the kind tabs (with `'all'` as a meta value not stored on rows).
- **`glyph`** — 2–3 character display glyph; typically the first letters of the provider or kind.
- **`status`** — single-value lifecycle state. The home page filter chips toggle ON/OFF a single status.
- **`context` / `latency` / `region` / `license`** — display strings only; production should serve raw values alongside.
- **`tags`** — order matters; render in source order.

### v0.4 mock corpus (12 rows)

| id | kind | title | provider | status | region | license |
|---|---|---|---|---|---|---|
| gpt4o | model | GPT-4o | OpenAI | verified | US-East | Commercial |
| claude-45 | model | Claude Sonnet 4.5 | Anthropic | verified | US/EU | Commercial |
| llama-3 | model | Llama 3.3 70B | Meta | trusted | self-host | Llama 3 Community |
| kreol-llm | model | Kreol Morisien LLM | University of Mauritius | verified | MU | Apache-2.0 |
| agent-companies | agent | agent.companies-mu | Corporate & Business Registration Dept. | verified | MU | Government use |
| agent-tax | agent | agent.tax-assistant | Mauritius Revenue Authority | active | MU | Public service |
| agent-procurement | agent | agent.procurement-watch | Internal · Procurement Office | active | MU | Internal |
| agent-grant | agent | agent.grant-screener | EDB Mauritius | experimental | MU | Pilot |
| mcp-treasury | skill | mcp/treasury-ledger | Ministry of Finance | trusted | MU | Open data |
| mcp-cadastre | skill | mcp/cadastre-search | Land Information & Mapping | verified | MU | Public records |
| tool-translate | tool | kreol-translate-api | University of Mauritius | verified | MU | CC-BY-SA |
| tool-sanctions | tool | sanctions-screen-mu | Financial Intelligence Unit | isolated | MU | Restricted |

Counts derived from this corpus:

- `all`: 12
- `model`: 4
- `agent`: 4
- `skill`: 2
- `tool`: 2

## Filters (local React state)

```ts
type RegistryFilters = {
  activeKind: 'all' | RegistryCard['kind'];
  activeStatus: RegistryCard['status'] | null;
  query: string;
};
```

Defaults at mount: `{ activeKind: 'all', activeStatus: null, query: '' }`.

## Filter logic

Inline `useMemo` in `RegistrySection`:

```js
RESOURCES.filter(r => {
  if (activeKind !== 'all' && r.kind !== activeKind) return false;
  if (activeStatus && r.status !== activeStatus) return false;
  if (query) {
    const q = query.toLowerCase();
    if (![r.title, r.provider, r.desc, ...r.tags].join(' ').toLowerCase().includes(q)) return false;
  }
  return true;
});
```

Notes for production:

- Search is **case-insensitive** and matches `title`, `provider`, `desc`, and any tag.
- `airId` is NOT searched in v0.4; production should add it to keep the placeholder `Search resources, providers, AIR-IDs…` honest.
- Filters compose with logical AND.

## Authoritative response shape (production)

```ts
type PublicRegistryResponse = {
  rows: RegistryCard[];
  total: number;
  counts: { all: number; model: number; agent: number; skill: number; tool: number };
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## Constraints / invariants

- `id` (or production `airId`) MUST be unique across all rows.
- `status === 'isolated'` rows are visible to anonymous visitors — the registry's transparency principle requires it. Production must NOT hide isolated rows from the public catalog.
- `tags` MUST be unique within a row (no dupes).
- `glyph` length SHOULD be 2–3 characters; longer strings overflow the icon square.

## Reference data on this page

- **Kind tabs:** `all`, `model`, `agent`, `skill`, `tool` (icons: `layers`, `cpu`, `agent`, `zap`, `flow`).
- **Status filters:** `verified`, `trusted`, `active`, `experimental`, `isolated` (5 chips, single-select).
- **Status colour map (`.r-status.{status}` in CSS):** verified green, trusted cyan/secondary, active primary, experimental amber, isolated red.
