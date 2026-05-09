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

# Sovereign · Topology module — Data model

## TopologyDependency

Mirrors `SOV_DEPS[i]` in `portals/sovereign-data.jsx`. Drives the table on this route.

```ts
type TopologyDependency = {
  src: string;          // resource slug of the caller (typically an agent)
  dst: string;          // resource slug of the callee (mcp / tool / model)
  kind: 'mcp' | 'tool' | 'model-call';
};
```

### Field semantics

- **`src`** — the resource invoking another. In v0.4 every `src` is an `agent/*`; production may extend to `mcp/*` calling `mcp/*` (server-to-server) and `agent/*` calling `agent/*` (agent-to-agent).
- **`dst`** — the resource being invoked. Slug; matches admin's canonical `Resource.slug`.
- **`kind`** — taxonomy of the call:
  - `mcp` — agent→mcp-server invocation
  - `tool` — agent→tool invocation
  - `model-call` — agent→external Tier-3 model invocation

### v0.4 mock corpus (6 dependencies)

| src | dst | kind |
|---|---|---|
| agent/citizen-helpdesk | model/anthropic-sonnet-7 | model-call |
| agent/treasury-bot | mcp/customs-tariff | mcp |
| agent/cargo-tracker | mcp/maritime-zones | mcp |
| agent/sugarcane-yield | tool/satimg-classify | tool |
| agent/curriculum-tutor | mcp/edu-curriculum | mcp |
| agent/curriculum-tutor | tool/translate-mfe | tool |

Note that the graph drawn by `TopologyCard` (cross-referenced from `modules/sovereign/dashboard/data-model.md`) is not 1:1 with this list — the card hard-codes 11 nodes and 6 edges. Production must drive BOTH the graph and the table from the same canonical edge list and ensure the node positions are computed from a server-supplied layout.

## TopologyGraph (re-export)

This page also surfaces the graph; the shape is identical to the dashboard's `TopologyGraph` (see `modules/sovereign/dashboard/data-model.md`):

```ts
type TopologyNode = {
  id: string;
  x: number;     // viewBox 720
  y: number;     // viewBox 320
  kind: 'agent' | 'mcp' | 'tool' | 'model-ext';
};

type TopologyEdge = [string, string];

type TopologyGraph = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};
```

Production unification (recommended):

```ts
type SovTopologyResponse = {
  graph: TopologyGraph;                    // for the SVG
  dependencies: TopologyDependency[];      // for the table (same edge set in detail form)
  generatedAt: string;
};
```

`graph.edges[i]` and `dependencies[i]` MUST refer to the same logical edge in the same order so the SVG and the table stay in sync.

## Authoritative response shape (production)

```ts
type SovTopologyResponse = {
  graph: TopologyGraph;
  dependencies: TopologyDependency[];
  window: '7d' | '30d' | '90d';      // topology window
  generatedAt: string;
};
```

## Constraints / invariants

- Every dependency MUST reference resources that exist in the active sovereign tenant's catalogue. A `dst` that does not exist locally (e.g. an external Tier-3 model) is allowed only when `kind === 'model-call'`.
- A pair `(src, dst, kind)` is unique; duplicates are folded into one edge with a `count` field (out of scope in v0.4).
- The table MUST order rows by frequency (descending) in production; the v0.4 prototype renders source order.

## Reference data on this page

- **Edge kinds:** `mcp`, `tool`, `model-call`. Each rendered as a `p-tag` chip.
- **Source / target columns:** strong + mono respectively to mirror admin's audit table treatment.
