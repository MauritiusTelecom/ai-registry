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

# Public · Registry module — Flows

## Routing

- Route lives at `#/registry` of the public site hash router (`RouterProvider` in `primitives.jsx`).
- Activated by:
  - TopNav `Registry` link (any public route).
  - Hero `Launch Registry` primary CTA on `#/home`.
  - Command palette / keyboard shortcut (production-only).
- Active match: `route === 'registry'`.

## Initial render

1. Babel processes the standard component graph, finishing with `app.jsx`.
2. App resolves `route === 'registry'` → renders `<RegistrySection onReport={onReport}/>` directly in the route slot (no `PageHero`).
3. `RegistrySection` initialises `useState`: `activeKind='all'`, `activeStatus=null`, `query=''`.
4. `useMemo` computes `counts` (5 entries: all, model, agent, skill, tool) and `filtered` (initial pass returns all 12 mock rows).
5. Section header, toolbar, chips, and grid paint synchronously. `Reveal` defers each block until the IntersectionObserver fires (threshold 0.12).
6. Each `RegistryCard` mounts wrapped in its own `Reveal` with delay `i * 35` ms.
7. Production: emit `public.registry.viewed` after first paint with `bundle` and `rowCount`.

## Filter flows

### Flow 1 — Search

- User types in the input. `setQuery` updates per keystroke.
- `filtered` recomputes via `useMemo`. No debounce in prototype.
- Production-recommended: debounce 250ms before emitting `public.registry.search.changed`.
- Empty state appears when filtering yields zero rows.

### Flow 2 — Kind tab

- User clicks one of `All resources / Models / Agents / MCP skills / Tools`.
- `setActiveKind(kind)` updates state; the active tab gains `.active` class.
- `filtered` recomputes; cards re-stagger via `Reveal delay = i * 35`.
- Emit `public.registry.kind_tab.clicked` with `kind`.

### Flow 3 — Status chip

- User clicks a status chip. Single-select (clicking the same chip again toggles off).
- `setActiveStatus(activeStatus === s ? null : s)`.
- Emit `public.registry.status_chip.toggled` with `status` and `active` boolean.

### Flow 4 — Clear filters

- The `Clear filters` chip appears only when `activeStatus !== null` OR `query !== ''`.
- Click resets BOTH `activeStatus = null` and `query = ''`. Does NOT reset `activeKind`.
- Emit `public.registry.filters.cleared`.

### Flow 5 — Empty state

- When `filtered.length === 0`, render a single full-row message in the grid:
  ```
  No resources match these filters.
  ```
  Padding 48, centred, `var(--text-3)`, `IBM Plex Mono`.
- Emit `public.registry.empty_state.viewed` with the current filter state.

## Card action flows

### Flow 6 — View

- Click → in v0.4 the button has no `onClick` handler (no-op stub).
- Production: navigate to `https://airegistry.mu/registry/{airId}` (resource detail page; out of scope here).
- Emit `public.registry.card.action_clicked` with `action: 'view'`.

### Flow 7 — AIR-ID

- Click → `navigator.clipboard.writeText(airId)`. Surface a small toast `Copied: ${airId.slice(0, 32)}…`.
- Emit `public.registry.card.action_clicked` with `action: 'air_id'` and on success `public.registry.card.air_id.copied`.

### Flow 8 — Report

- Click → `onReport(r)` callback in `RegistrySection`. The callback comes from `app.jsx` and sets the global `reportTarget` state.
- The global `<ReportModal/>` mounts (visible) when `reportTarget !== null`.
- Modal flow is described in `modules/public/home/flows.md` (Flow 9 — Report modal); the same modal serves both `/home` and `/registry`.
- Emit `public.registry.card.action_clicked` with `action: 'report'`.

## Visual / motion contract

- Section header, toolbar, chip row each have one `Reveal` wrapper.
- The grid container does NOT have its own `Reveal` — each card is its own animated unit.
- Cards animate in left-to-right top-to-bottom order; the 35ms stagger is a wave, not a strict left-to-right sequence (cards in the same row fire close together).
- Hover lift on cards: 1px `translateY` + brighter gradient border; 200ms ease.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch `GET /public/registry` on `visibilitychange` after 5 minutes.
  - Subscribe to a public WebSocket / SSE feed if any (production tenant choice); the registry is largely static day-to-day.

## Error and empty states

- **GET /public/registry fails (5xx)**: render the section header + toolbar + chips, then a single-row error block in the grid: `Couldn't load resources.` plus a `Retry` button.
- **No rows in the public catalog at all**: render a special empty state:
  ```
  No resources have been published yet. Check back soon.
  ```
- **Filter yields zero rows**: see Flow 5.

## Keyboard shortcuts active on this page

| Combo | Behaviour |
|---|---|
| `⌘K` / `Ctrl+K` | Focus the search input (the `<kbd>⌘K</kbd>` hint inside the input) |
| `Esc` | Clear the search input if focused; if not focused, close any open ReportModal |
| `1`–`5` | Activate the corresponding kind tab (production only) |

## Cross-portal cross-references

- A row referenced here exists in admin's `/resources` (full record) and provider's `/resources` (provider-scoped projection). The same canonical `airId` is used everywhere.
- Sovereign-scoped views (`modules/sovereign/catalog`) render the same set restricted to the active sovereign tenant.
