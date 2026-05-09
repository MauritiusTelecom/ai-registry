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

# Sovereign · Topology module — Inter-resource dependencies

## Purpose

Specify the **`/topology` route** of the Sovereign portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page surfaces the dependency graph across the active sovereign tenant — which agents call which MCP servers, which tools each agent uses, and which external models are invoked.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/sovereign.html` |
| Route table | `portals/sovereign-app.jsx` (`'/topology'` → `SOV_PAGES.SovTopology`) |
| Page component (`SovTopology`, `TopologyCard`) | `portals/sovereign-pages.jsx` |
| Mock dependencies (`SOV_DEPS`) | `portals/sovereign-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Sovereign`
- `PortalShell` overrides:
  - `currentTitle="Topology"`
  - `breadcrumb=["Sovereign", "National", "Topology"]`
  - Active sidebar item: `Topology` (`path: "/topology"`).

## Route body — vertical layout (`SovTopology`)

1. **PageHeader** (no actions row)
2. **TopologyCard** — full-width inline graph (same component as the Sovereign dashboard)
3. **Spacer** — `<div style="height: 16">`
4. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Topology`
- **Subtitle:** `Inter-resource dependencies — agents calling MCP servers, tools and external models.`  
  (Em dash U+2014 between `dependencies` and the description.)
- **Actions row:** none.

## Section copy and UI — TopologyCard

Same component as the Sovereign dashboard's TopologyCard. Cross-reference `modules/sovereign/dashboard/product.md` (TopologyCard section) for full geometry, node coordinates, edge curves, and colour mapping. The card on `/topology` IS literally the same React element — same nodes, same edges, same legend.

In v0.4 the card on this page receives no different props than on the dashboard; production may upgrade it to:

- A larger SVG (`viewBox 0 0 1200 480`) on this dedicated route.
- Pannable / zoomable interaction.
- Hover tooltips per node + edge.

If implemented, surface a hover ring and emit `sovereign.topology.node.hovered` / `sovereign.topology.edge.hovered` events.

## Section copy and UI — DataTable

A complementary tabular view of the same edges shown in the graph above.

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `src` | `Source` | (auto) | `<span class="p-cell-strong">{src}</span>` |
| `kind` | `Edge` | 130 | `<span class="p-tag">{kind}</span>` |
| `dst` | `Target` | (auto) | `<span class="p-mono-val">{dst}</span>` |

Rows bind to `S.deps`. The table is **non-interactive** (no `onRowClick` passed).

## Mock dependencies — `SOV_DEPS`

Reproduce verbatim from `sovereign-data.jsx`:

| src | dst | kind |
|---|---|---|
| agent/citizen-helpdesk | model/anthropic-sonnet-7 | model-call |
| agent/treasury-bot | mcp/customs-tariff | mcp |
| agent/cargo-tracker | mcp/maritime-zones | mcp |
| agent/sugarcane-yield | tool/satimg-classify | tool |
| agent/curriculum-tutor | mcp/edu-curriculum | mcp |
| agent/curriculum-tutor | tool/translate-mfe | tool |

The graph above and the table below are sourced from the SAME edge set in production. The prototype keeps them separate because the graph's mock nodes/edges are hard-coded in `TopologyCard` and the table binds to `SOV_DEPS`. Production must derive both from the same `topology` payload (see `sovereign/dashboard/data-model.md`).

## Edge kinds

Three v0.4 edge kinds, each rendered as a `p-tag` chip:

| kind | Meaning |
|---|---|
| `mcp` | Agent invokes an MCP server |
| `tool` | Agent invokes a tool |
| `model-call` | Agent invokes an external (Tier-3) model |

Production may add `agent-to-agent` once cross-agent invocation is supported.

## Visual and motion

- TopologyCard: same as the Sovereign dashboard's TopologyCard. Full-width on this route (no `2fr 1fr` split row).
- DataTable: standard hover row tone (`var(--p-row-hover)`); cursor stays default since rows are non-interactive.
- A 16px gap separates the graph from the table for visual separation.

## Navigation behaviour

- TopologyCard nodes / edges are NOT clickable in v0.4. Production may wire them to navigate to `/catalog?focus={resourceId}` or to a per-resource detail drawer.
- Table rows are not clickable in v0.4.

## Out of scope on this page

- Per-edge call volume / latency stats — production may surface as a fourth column on the table.
- Filtering by edge kind — single-edge-kind filtering would let operators show only `model-call` edges (helpful for sovereignty review).
- Time-window selector — the topology window is fixed at the same 30-day default as the dashboard.
