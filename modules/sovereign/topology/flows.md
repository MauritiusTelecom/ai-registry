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

# Sovereign · Topology module — Flows

## Routing

- Route lives at `/topology` of the sovereign portal hash router.
- Activated via sidebar `Topology` (anchor `href="#/topology"`) or command palette.
- Active match: exact `'/topology'` OR `path.startsWith('/topology/')`.

## Initial render

1. App resolves `path === '/topology'` → renders `<SovTopology/>`.
2. SovTopology renders PageHeader → TopologyCard → 16px spacer → DataTable.
3. TopologyCard reads its hard-coded nodes/edges in v0.4 (production: from server-supplied `topology` payload).
4. DataTable binds to `S.deps` (production: same `topology` payload's `dependencies` array).
5. Production: emit `sovereign.topology.viewed` after first paint with `nodeCount`, `edgeCount`, `dependencyCount`.

## Window selector flow (production)

- v0.4 has no selector. Production may add a small segmented control (`7d | 30d | 90d`) to the right of the PageHeader title.
- On change → refetch `GET /sovereign/topology?window=…`. Both the graph and the table refresh together.
- Emit `sovereign.topology.window.changed`.

## Kind filter flow (production)

- v0.4 has no filter. Production may add an `Edge kind` segmented control (`All | mcp | tool | model-call`) above the table.
- On change → either filter the existing payload client-side (faster) or refetch with `?kind=…`.
- Emit `sovereign.topology.kind.filtered`.

## Graph interaction (production)

- v0.4 nodes / edges are not interactive.
- Production-recommended:
  - Hover a node → tooltip with full slug, kind, region, in-degree, out-degree.
  - Click a node → navigate to `/catalog?focus={resourceId}` OR open a side drawer with the resource's neighbours.
  - Hover an edge → tooltip with `src → dst` plus call count over the topology window.
  - Emit `sovereign.topology.node.hovered` / `sovereign.topology.edge.hovered`.

## Table interaction (production)

- v0.4 rows are not interactive.
- Production-recommended:
  - Click a row → highlight the corresponding edge in the graph above and scroll the graph into view.
  - Add a fourth column for `count` (calls in window).
  - Sort by `count` descending by default.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `topology.changed` (e.g. when a new agent or call relationship appears). Re-render the graph + table.

## Empty / error states

- **Empty graph (no traffic in window)** — render TopologyCard with body line `No inter-resource calls in this window.`; render the DataTable with one body row `No dependencies recorded.`.
- **5xx** — render the page chrome with both panels showing `Couldn't load topology.` and a top banner `Retry`.
- **401/403** — redirect to sovereign sign-in / "Insufficient permissions" empty.

## Accessibility

- The TopologyCard SVG should expose `role="img"` and an `aria-label` summarising the graph: e.g. `Resource topology with 11 nodes and 6 edges.`.
- Production should provide a `Show as table` toggle that hides the SVG and keeps only the table for screen-reader users; the v0.4 table below the graph already serves this purpose if the SVG is `aria-hidden`.
- Edge kind tag colours are uniform; production may colour-code by kind (e.g. `model-call` amber to flag external calls) — if added, pair colour with a textual label.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
