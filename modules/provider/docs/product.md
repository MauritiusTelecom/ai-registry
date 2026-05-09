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

# Provider · Docs module — Documentation library

## Purpose

Specify the **`/docs` route** of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page exposes guides, references, and runbooks tailored to providers — publishing first MCP server, sovereignty tier reference, eval harness, key rotation, incident response.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table | `portals/provider-app.jsx` (`'/docs'` → `PROV_PAGES.ProvDocs`) |
| Page component (`ProvDocs`) | `portals/provider-pages.jsx` |
| Mock docs (`PROV_DOCS`) | `portals/provider-data.jsx` |
| Shared shell (`PageHeader`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` overrides:
  - `currentTitle="Docs"`
  - `breadcrumb=["Provider", "Docs"]`
  - Active sidebar item: `Docs` (`path: "/docs"`).

## Route body — vertical layout (`ProvDocs`)

1. **PageHeader** (no actions row)
2. **Card grid** — `p-grid p-grid-2` of one card per doc

This page does NOT use a `DataTable`. Each doc is a clickable `p-card` rendered as an `<a>` element.

## Section copy and UI — PageHeader

- **Title:** `Documentation`
- **Subtitle:** `Guides, references and runbooks for providers.`
- **Actions row:** none.

## Section copy and UI — Doc card

Each card is an `<a>` with `class="p-card"`, `href="#"`, `style={{ textDecoration: 'none', display: 'block' }}` (the `href="#"` is a stub in the prototype; production resolves to the actual doc URL).

Internal layout (`p-card-head`):

- **Left**: stacked title + sub
  - Title (`p-card-title`): `d.title`
  - Sub (`p-card-sub`): `${d.kind} · updated ${d.updated}`
- **Right**: `<PIcon name="arrow-up-right" size={16} />`

The card has no body block beyond the header — title, sub, and the corner icon are the entire card.

## Mock docs — `PROV_DOCS`

Reproduce verbatim from `provider-data.jsx`:

| id | title | kind | updated |
|---|---|---|---|
| d_001 | Publish your first MCP server | guide | 2026-05-01 |
| d_002 | Sovereignty tier reference | reference | 2026-04-22 |
| d_003 | Eval harness — submitting benchmarks | guide | 2026-04-12 |
| d_004 | API key rotation | reference | 2026-03-30 |
| d_005 | Incident response runbook | runbook | 2026-02-18 |

The dash in `Eval harness — submitting benchmarks` is a Unicode em dash (U+2014); production must keep the character.

## Doc kinds

Three kinds in v0.4:

- **`guide`** — step-by-step walkthroughs (e.g. `Publish your first MCP server`).
- **`reference`** — concept / API documentation (e.g. `Sovereignty tier reference`).
- **`runbook`** — operational responses to incidents (e.g. `Incident response runbook`).

Production may add `tutorial` (longer, multi-page guides) and `changelog` (version notes) without revising this spec.

## Visual and motion

- Cards inherit the standard `p-card` gradient border and hover lift treatment.
- The `arrow-up-right` icon sits in the head right slot at size 16 (matching the icon library's default size).
- Card click navigates externally via `href`; no SPA-internal route.
- The kind in the sub line is rendered verbatim (lowercase). Production may colour-code by kind if useful.

## Navigation behaviour

- Click anywhere on a card → external doc URL. The card is the entire clickable surface.
- The prototype renders `href="#"` as a stub. Production must resolve to the canonical URL of each doc (e.g. `https://docs.airegistry.mu/providers/publish-first-mcp`).
- Production should also add `target="_blank" rel="noopener noreferrer"` on cards that open external sites; sovereign-tenant hosted docs may open in the same tab if the docs site is on the same domain.

## Out of scope on this page

- Inline doc rendering (the docs site is a separate property).
- Search across docs (the docs site has its own search).
- Per-doc feedback / rating.
- Localised translations (the docs site handles locale via its own URL scheme).
