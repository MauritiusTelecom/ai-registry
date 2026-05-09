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

# Landing module — Home page flows

Flows describe **observable behaviour** of the Claude design prototype (`airegistry-prototype/claudedesign/`) so the production home page can match it without altering motion or interaction feel.

## Routing (hash)

- Router reads `window.location.hash` as `#/{route}`; empty hash resolves to `home`.
- **`home-spa.html`** sets `window.location.hash` to `#/home` before React mounts if hash is empty.
- **`index.html`** does not pre-set hash; initial route is `home` when hash is empty (see `RouterProvider` initial state: `replace('#/', '') || 'home'`).
- `navigate(id)` sets `window.location.hash = \`/${id}\``.
- On `hashchange`, route updates and **`window.scrollTo({ top: 0, behavior: 'instant' })`** runs.

## Primary navigation (TopNav)

- Logo click → `navigate('home')`.
- Each nav item maps to route ids: `home`, `registry`, `ecosystem`, `governance`, `docs`, `contact`.
- Active link uses class `nav-link` + `active` when `route === it.id`.
- At viewport **≤1100px**, `.nav-links` is hidden (`display: none` in CSS).

## Home hero CTAs

- **Launch Registry:** `preventDefault` on `href="#/registry"`, then `navigate('registry')`.
- **Explore Ecosystem:** same pattern for `ecosystem`.

## Theme toggle

- Button toggles between `dark` and `light`.
- `aria-label`: `Switch to light theme` when current is dark, else `Switch to dark theme`.
- Icon: sun in dark mode, moon in light mode.

## Auth (mock) — Log In

- **Log In** button calls `login('admin')` (preset hard-coded in `nav.jsx`).
- Presets in `AuthProvider`: `admin`, `provider`, `member` with different `roles` arrays (see `data-dictionary.md`).

## User menu (when logged in)

- Toggle dropdown on avatar row; close on outside mousedown or Escape.
- Portal links use `window.location.href` to static HTML paths: `portals/admin.html`, `portals/provider.html`, `portals/verifier.html`, `portals/sovereign.html` — gated by role flags as in `nav.jsx`.
- **Account settings** and **Log Out** buttons present (settings is no-op close in prototype; logout clears user).

## Registry section interactions

- **Kind tabs:** filter list by `kind` or `all`; counts from memoised catalog.
- **Status chips:** toggle exclusive filter; clicking active chip clears that filter.
- **Search:** client-side filter across title, provider, description, tags (case-insensitive substring).
- **Clear filters** visible when status or query non-empty; clears both.
- **View** / **AIR-ID** on cards: buttons present (no navigation in prototype beyond UI).
- **Report:** invokes `onReport(r)` → parent sets modal resource → **ReportModal** opens.

## Report modal flow

1. Open when `resource` is set; close sets `resource` null or user closes.
2. Escape closes; backdrop click closes; body scroll locked while open.
3. Submit validates reason, details length ≥12, email regex `^\S+@\S+\.\S+$`.
4. Success state shows check message; **Close** clears modal.

## FAQ accordion

- **Bundle A (`FaqSection`):** single `open` index state; `FaqItem` toggles open index or `-1`.
- **Bundle B (`FAQ` in `sections.jsx`):** first item index `0` default open; button toggles same index or `-1`; plus icon in header; CSS-driven expand on `.faq-item.open`.

## Scroll-driven reveal

- `Reveal` wraps major blocks; `IntersectionObserver` threshold **0.12**; on intersect, applies optional `delay` ms timeout then adds class `in` for transition (see `product.md` motion).

## Metrics strip

- On mount / target change, each cell runs `useCountUp` with duration **1600ms** and cubic ease-out curve `1 - (1-p)^3`.
- Uptime row treats suffix `%` as float display (`isFloat`).

## Globe and hero motion

- Continuous rotation: `requestAnimationFrame` loop; `speed = 0.0003 + (motionIntensity / 100) * 0.0008` (note `motionIntensity` from tweaks is 0–3 in panel but fed into Globe as-is from `tweaks.motionIntensity` in `hero.jsx` — **Hero passes numeric 0–3**, Globe uses it in speed and arc interval: `Math.max(2400, 5000 - motionIntensity * 25)` for arc spawn ms).
- Arcs: random pairs of nodes; keep last few in state; arcs animated per `globe.jsx` implementation.

## Tweaks panel (design-time)

- **Motion intensity:** slider 0–3 step 1 → updates `motionIntensity` (affects globe speed / arc rate).
- **Density:** radio compact | balanced | spacious → `applyDensity` sets `--section-pad` on `documentElement`.
- **Accent palette:** radio 0–3 → `applyPalette` updates CSS variables.

## Promo CTAs

- **Bundle A:** links are `href="#"` with no route change (placeholder).
- **Bundle B:** `Submit a Resource` → `navigate('contact')`; `Read AIR-SPEC 0.4` → `navigate('docs')`.

## Non-home routes (same shell)

From `app.jsx` `Routes`:

- `registry` → only `RegistrySection` (no hero/metrics/etc.).
- `ecosystem`, `governance`, `docs`, `contact` → page components from `components/pages.jsx`.

Home page spec is only concerned with **`home` / default** route composition above.
