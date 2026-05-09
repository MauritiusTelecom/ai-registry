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

# Public · Home module — Flows

## Routing (hash, public site)

- HTML entry: `index.html` (bundle A) or `Sovereign AI Registry.html` (bundle B). Each owns the public-site hash router (`RouterProvider` in `primitives.jsx`) with default route `home`.
- `useRouter().route` reads `window.location.hash` as `#/{route}`; empty hash resolves to `home`.
- `home-spa.html` sets `window.location.hash = '#/home'` BEFORE React mounts when hash is empty. `index.html` does not pre-set hash — relies on `RouterProvider` initial state `replace('#/', '') || 'home'`.
- `navigate(id)` writes `window.location.hash = '/${id}'`.
- On `hashchange`: route updates and `window.scrollTo({ top: 0, behavior: 'instant' })` resets scroll.

## Initial render

1. Babel processes `tweaks-panel.jsx` → `primitives.jsx` → other components → `app.jsx` in document order.
2. `ReactDOM.createRoot(...).render(<Root/>)` mounts.
3. `Root` wraps `<ThemeProvider>` → `<AuthProvider>` → `<RouterProvider>` → `<App/>`.
4. `<ThemeProvider>` reads `localStorage["sar-theme"]` (or system pref) and sets `data-theme` on `<html>`.
5. `<App>` calls `useTweaks(TWEAK_DEFAULTS)`. On change, `applyPalette` and `applyDensity` write CSS custom properties to `documentElement.style`.
6. Routes resolves `route === 'home'` → `<HomePage tweaks=… onReport=…/>`.
7. HomePage renders Hero → MetricsBar → RegistrySection → GovernanceSection → Orchestration → Promo → FAQ.
8. Footer renders below Routes (shell-owned).
9. ReportModal is rendered globally; opens when `reportTarget` becomes non-null.
10. TweaksPanel renders globally for design-time tweaks.
11. Production: emit `public.home.viewed` once first paint completes, including `bundle`, `theme`, `palette`.

## Top-bar interactions

The TopNav is always visible. Behaviour:

### Logo click
- Navigates `home`.

### Link clicks (Home / Registry / Ecosystem / Governance / Documentation / Contact)
- Each `<a>` has `onClick={(e) => { e.preventDefault(); navigate(id); }}` and `href="index.html"` (or similar) for SSR fallback.
- Sets `window.location.hash = '/${id}'` via `navigate`.

### Theme toggle
- Cycles `dark ↔ light`. Persists `localStorage["sar-theme"]`. Sets `data-theme` on `<html>`. Triggers CSS transition `background-color 240ms ease, color 240ms ease`.
- Emit `public.home.theme.toggled`.

### Log In CTA
- v0.4 stub: `navigate('contact')`.
- Production: triggers a real sign-in (OIDC) and on success routes to the user's most-privileged portal.

### Mobile menu
- Below ~720px, the link strip collapses to a hamburger; clicking opens a sheet listing the same six links.

## Hero flows

### Flow 1 — Launch Registry (primary CTA)

- Click → `navigate('registry')`. Hash changes → router re-renders. Scroll resets to top via `hashchange` listener.
- Emit `public.home.cta.launch_registry.clicked`.

### Flow 2 — Explore Ecosystem (secondary CTA)

- Click → `navigate('ecosystem')`.
- Emit `public.home.cta.explore_ecosystem.clicked`.

### Flow 3 — Globe motion

- Globe renders via `requestAnimationFrame`; speed and arc spawn interval scale with `tweaks.motionIntensity`.
- Reducing motion intensity to `0` slows but does not freeze the rotation; the SMIL `animate` on the border circle continues at 6s independently.

## MetricsBar flows

### Flow 4 — Count-up animation

- Each cell uses `useCountUp(target, 1600)`. Animation starts on first paint of the cell.
- The `Uptime` row uses float display logic (e.g. `99.97`); other rows use integer rounding.
- Emit `public.home.metric.count_up_complete` per cell when the animation reaches `target`.

## RegistrySection flows

### Flow 5 — Search

- User types in the search input. Local state updates per keystroke; the displayed list filters via `RESOURCES.filter(...)` matching `q` against title / provider / airId / tags.
- Emit `public.home.registry.search.changed` with `queryLength`.

### Flow 6 — Kind tab

- User clicks one of `All resources / Models / Agents / MCP skills / Tools`.
- Local state updates; the displayed list re-filters to that kind.
- Emit `public.home.registry.kind_tab.clicked` with `kind`.

### Flow 7 — Status filter chips

- User clicks any of `verified / trusted / active / experimental / isolated`. Multi-select; clicking again toggles off.
- Emit `public.home.registry.search.changed` (treated as a refinement) plus a separate `public.home.registry.status_filter.changed` (production-only).

### Flow 8 — Card actions

- `View` → opens an external link to the resource detail (production: `/registry/{airId}`).
- `AIR-ID` → copies the AIR-ID string to clipboard via `navigator.clipboard.writeText(airId)`.
- `Report` → sets `reportTarget = card`. Triggers the ReportModal global flow below.
- Emit `public.home.registry.card.action_clicked` with `airId` and `action`.

## ReportModal flow

### Flow 9 — Open and submit

- ReportModal mounts when `reportTarget !== null` (set by Flow 8 Report).
- Modal title: `Report this resource`; subtitle: `${title} · ${provider}`.
- Form fields: `reason` (radio: out-of-date / broken / unsafe / off-topic / other), `body` (≥12 chars), `email` (RFC-5322).
- Validation messages: `Select a reason` / `Add at least 12 characters of context` / `Valid email required`.
- Submit → POST `/public/report` (production). On 202: swap modal body to success state — title `Report received`, body ending `within 5 working days.`, with a `Done` button that closes the modal.
- Emit `public.home.report.modal.opened` on open and `public.home.report.modal.submitted` on success.

## GovernanceSection / Orchestration / Promo / FAQ flows

These sections are largely declarative. The only interactive elements are:

### Flow 10 — Sovereignty Test (governance panel)

- The test is informational only — no inputs in v0.4.

### Flow 11 — FAQ accordion

- Click an FAQ row → expands its answer; clicking another row collapses the previously-open one (single-open).
- Animation: CSS grid `grid-template-rows: 0fr → 1fr` over 280ms; chevron icon rotates 180°.
- Emit `public.home.faq.opened` with the row index.

### Flow 12 — Promo / FAQ CTAs

- Bundle A `PromoBanner` CTAs: `Start Building` and `Talk to Engineering` — both `href="#"` stubs in v0.4. Production should route to `/contact?topic=submit` and `/contact?topic=general` respectively.
- Bundle B `Promo` CTAs: `Submit a Resource` → `navigate('contact')`; `Read AIR-SPEC 0.4` → `navigate('docs')`.

## Footer flows

### Flow 13 — Footer link clicks

- Each footer column row is an `<a>`; click follows the href. Internal links use hash routes; external links open in new tab.

## Tweaks panel flows (design-time)

### Flow 14 — Tweaks change

- Each control fires `setTweak(key, value)` → state updates → effects re-run. Persistence via `localStorage["sar-tweaks"]`.
- Emit `public.home.tweaks.changed` with `key` and `value`.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch `GET /public/metrics` and `GET /public/registry/featured` on `visibilitychange` after 5 minutes; the home page is largely static so aggressive polling is unnecessary.

## Error and empty states

- **MetricsBar fetch fails**: render the strip with skeleton bars. Animation retries via SWR.
- **Featured registry fetch fails**: RegistrySection renders the kind tabs but body shows `Couldn't load resources. Try again.` plus a `Retry` button.
- **ReportModal submit fails (5xx)**: keep the form open with a banner `Couldn't submit — try again.`; do NOT lose the body.
- **No-JS fallback**: production must serve a server-rendered version of at least the Hero + MetricsBar so search engines and scrape clients see meaningful content. The full SPA is JS-required for interactivity.

## Keyboard shortcuts active on this page

| Combo | Behaviour |
|---|---|
| `⌘K` / `Ctrl+K` | Focus the RegistrySection search input |
| `Esc` | Close the ReportModal if open |
| `Tab` | Standard sequential focus |
| `?` | Open the FAQ section anchor (`#faq`) — production only |
