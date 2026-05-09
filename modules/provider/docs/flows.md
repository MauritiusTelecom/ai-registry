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

# Provider · Docs module — Flows

## Routing

- Route lives at `/docs` of the provider portal hash router.
- Activated via sidebar `Docs` (anchor `href="#/docs"`) or command palette.
- Active match: exact `'/docs'` OR `path.startsWith('/docs/')`.

## Initial render

1. `App` resolves `path === '/docs'` → renders `<ProvDocs/>`.
2. `ProvDocs` reads `P.docs` directly (no local state in prototype).
3. Card grid (`p-grid p-grid-2`) paints synchronously with all 5 mock cards in document order.
4. Production: emit `provider.docs.viewed` after first paint.

## Card click

### Flow 1 — Open doc

- Click anywhere on a card.
- Prototype: `href="#"` is a stub — clicking lands the user on the same page (the URL bar shows `#docs#`, which the router treats as the `docs` route, no navigation occurs).
- Production: each card carries the canonical doc URL (from `DocCard.url`); click navigates to that URL. The card itself is the entire clickable surface.
- Recommended attributes: `target="_blank" rel="noopener noreferrer"` for cards that open external sites; sovereign-tenant hosted docs may open in the same tab.
- Emit `provider.docs.card.clicked` with `docId`, `kind`, and `title`.

## Optional kind filter (production)

- v0.4 has no filter. Production may add a small kind selector beneath the page header (`All | Guides | References | Runbooks`).
- On change → refetch `GET /provider/docs?kind=<value>`.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on `visibilitychange` so the "updated" timestamps stay current. Docs change rarely; a 24h cache is acceptable.

## Empty / error states

- **No rows** (unusual — production always ships at least the core docs): render a single full-width card with body text `Documentation is being prepared. Check back soon.`
- **5xx** → render PageHeader + a single full-width error card: `Couldn't load documentation.` with `Retry` button.
- **401/403** → redirect to provider sign-in / "Insufficient permissions" empty.

## Accessibility

- Each card is an `<a>` element — screen readers correctly announce it as a link.
- The clickable surface is the entire card; the `arrow-up-right` icon is decorative and should have `aria-hidden="true"` to avoid double-announcement.
- Card title is the link's accessible name; the sub line `${kind} · updated ${updated}` should be associated via `aria-describedby`.
- Tab order traverses the cards in document order (top-to-bottom, left-to-right).
