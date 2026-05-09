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

# Public · Registry module — Discover what your nation can trust

## Purpose

Specify the **`#/registry` route** of the public marketing site so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This route surfaces the same `RegistrySection` that appears on the home page (`modules/public/home/`), but as a standalone full-height page with the shell's TopNav above and Footer below. There is no PageHero — the section header IS the page header.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| HTML entry | `index.html` (bundle A) or `Sovereign AI Registry.html` (bundle B) |
| Route table | `app.jsx` (`case 'registry': return <><RegistrySection onReport={onReport} /></>`) |
| Page component | `components/registry.jsx` (`RegistrySection`, `RegistryCard`) |
| Mock catalog (`RESOURCES`) | `components/registry.jsx` |
| Card actions / report flow | `components/modal.jsx` (mounted globally) |
| Reveal-on-scroll, icons | `components/primitives.jsx` |
| Section / toolbar / chip / card styles | `styles.css` |

## Document title and shell

- HTML `<title>`: `Sovereign AI Registry`
- Same TopNav as home (Home / Registry / Ecosystem / Governance / Documentation / Contact); active link `Registry`.
- Same Footer as home (bundle-dependent).
- Same global ReportModal mounts and opens when a card's `Report` action fires.

## Route body — vertical layout

When the route is `registry`, `app.jsx` renders ONLY the RegistrySection in the route slot:

```jsx
case 'registry':
  return <><RegistrySection onReport={onReport} /></>;
```

There is NO PageHero, no extra padding wrapper, no separate header. The section's own header serves as the page header.

## Section copy and UI — RegistrySection

### Section header (`.section-header`, wrapped in `Reveal`)

- Eyebrow: `<span class="dot"></span>` + `The Registry`
- H2: `Discover what your nation can ` + `<span class="gradient-text">trust and integrate</span>` + `.`
- Lead paragraph: `The registry points to locally-relevant AI resources — never hosts them. Each listing carries a verifiable provider, a sovereignty review, and a stable AIR-ID under air://`
  - The literal `air://` is rendered in `<span class="mono" style={{color: 'var(--text-2)'}}>` for typographic emphasis.

### Toolbar (`.registry-toolbar`)

A two-row toolbar wrapped in `Reveal`:

1. **Search input** (`.search-input`):
   - Left: `<Icon name="search" size={15}/>`
   - Input placeholder: `Search resources, providers, AIR-IDs…`
   - Right: `<kbd>⌘K</kbd>`
2. **Kind tabs** (`.tabs`) — five buttons; the active one carries the `.active` class:
   | id | label | icon |
   |---|---|---|
   | `all` | `All resources` | `layers` |
   | `model` | `Models` | `cpu` |
   | `agent` | `Agents` | `agent` |
   | `skill` | `MCP skills` | `zap` |
   | `tool` | `Tools` | `flow` |

   Each tab renders an icon (size 13) + label + a `<span class="tab-count">` showing the count of rows for that kind (`all` = 12 in v0.4).

### Filter chips (`.filter-chips`, wrapped in `Reveal`)

- Left label (mono, 11px, uppercase, letter-spacing 0.1em, colour `var(--text-3)`): `Status`
- Five status chips: `verified`, `trusted`, `active`, `experimental`, `isolated`.
  - Single-select (clicking again toggles off).
  - Active chip carries `.active` class.
- A sixth `Clear filters` chip appears when any filter is active (`activeStatus || query`).

### Registry grid (`.registry-grid`)

Renders one `RegistryCard` per filtered row (wrapped in `Reveal` with `delay = i * 35` ms). Empty state renders a single full-row message:

```
No resources match these filters.
```

(48px padding, centred, `var(--text-3)`, `IBM Plex Mono`.)

## Section copy and UI — RegistryCard (`.r-card`)

Each card has four blocks:

1. **Card head** (`.r-card-head`):
   - Left: `<div class="r-icon">{glyph}</div>` (e.g. `GP`, `CL`, `AG`, `MCP`, `TL`)
   - Middle (flex 1, min-width 0): two-line stack
     - `<div class="r-title">{title}</div>`
     - `<div class="r-provider">{provider}</div>`
   - Right: `<div class="r-status {status}"><span class="status-dot"></span>{status}</div>` (status word lowercase)

2. **Description** (`.r-desc`): `{desc}` (one paragraph, two-line clamp in CSS)

3. **Meta block** (`.r-meta`): four rows, each `<div class="r-meta-row">` with `r-meta-label` + `r-meta-value`:
   - `Context` · `{r.context}`
   - `Latency` · `{r.latency}`
   - `Region` · `{r.region}`
   - `License` · `{r.license}`

4. **Tags** (`.r-tags`): one `<span class="tag">` per tag.

5. **Card actions** (`.r-card-actions`):
   - `<button><Icon name="eye" size={12}/> View</button>`
   - `<button><Icon name="doc" size={12}/> AIR-ID</button>`
   - `<button class="btn-report" onClick={onReport}><Icon name="flag" size={12}/> Report</button>`

## Mock catalog — `RESOURCES`

12 rows in v0.4. Reproduce verbatim from `components/registry.jsx`. The five kinds break down as:

- **model** (4): `gpt4o` (GPT-4o), `claude-45` (Claude Sonnet 4.5), `llama-3` (Llama 3.3 70B), `kreol-llm` (Kreol Morisien LLM)
- **agent** (4): `agent-companies`, `agent-tax`, `agent-procurement`, `agent-grant`
- **skill** (2): `mcp-treasury` (mcp/treasury-ledger), `mcp-cadastre` (mcp/cadastre-search)
- **tool** (2): `tool-translate` (kreol-translate-api), `tool-sanctions` (sanctions-screen-mu)

Status spread across rows: 7 verified, 2 trusted, 2 active, 1 experimental, 1 isolated.

Cross-reference `data-model.md` for the full row shape and per-row values.

## Visual and motion

- **Reveal**: section header, toolbar, chips, and each card use `Reveal`. Threshold 0.12, 700ms transition. Card delay staggers in 35ms increments.
- **Search input**: focus ring uses `var(--primary)` with subtle glow.
- **Tabs**: active tab uses gradient text (`var(--grad-text)`) plus a 1px gradient border bottom; inactive tabs are muted text + transparent border.
- **Tab count chip**: small mono pill with `var(--text-3)` text, `var(--bg-elev)` background.
- **Status pill on cards**: colour mapped per status — `verified` green, `trusted` cyan/secondary, `active` primary blue, `experimental` amber, `isolated` red. The status dot pulses when status is `active`.
- **Card hover**: subtle 1px translateY + brighter gradient border.
- **Card icon**: 36×36 square, 6px radius, gradient background `var(--grad-accent)`, text white.

## Navigation behaviour from this page

- TopNav links navigate to other public routes via hash.
- `View` button (per card): in v0.4 this is a no-op stub; production should navigate to `https://airegistry.mu/registry/{airId}`.
- `AIR-ID` button: copies the airId string to clipboard via `navigator.clipboard.writeText(airId)` and surfaces a toast `Copied`.
- `Report` button: sets `reportTarget` global state → ReportModal opens.

## Out of scope on this page

- Authenticated provider / admin actions (e.g. publishing, isolating). Those live in the portals.
- Per-resource detail / drill-down — production-only future route.
- Sort options — v0.4 renders rows in the source order. Production may add a sort dropdown.
- Pagination — v0.4 lists all 12 rows; production with hundreds of rows must paginate.

## Differences vs the home-page RegistrySection

This page IS the same `RegistrySection` component — there is no divergence. The differences are purely contextual:

| Concern | Home (`#/home`) | Standalone (`#/registry`) |
|---|---|---|
| Position in flow | Section 3 of 8 | Whole route body |
| Surrounding sections | Hero / Metrics above; Governance / Orchestration below | None — TopNav above, Footer below |
| Default scroll position | User scrolls to it | Top of page |
| Initial state | Same defaults | Same defaults |
