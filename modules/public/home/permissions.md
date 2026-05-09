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

# Public · Home module — Permissions and access

## Surface classification

The public home page is **unauthenticated public content**. Every visible string, image, animation, and link is safe to surface to anonymous visitors and to search engines. There is no per-tenant or per-user gating on this route.

## Authentication binding

There is **no required authentication** to view the home route. The TopNav `Log In` CTA is the only auth-aware affordance:

- v0.4: stub navigation to `#/contact`.
- Production: triggers OIDC sign-in. On success, the user is redirected to the most-privileged portal they hold a role for (admin → provider → sovereign → verifier in priority order).

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| TopNav links (Home / Registry / Ecosystem / Governance / Documentation / Contact) | none | Public navigation. |
| TopNav theme toggle | none | Cosmetic only. |
| TopNav `Log In` CTA | none | Initiates sign-in flow. |
| Hero CTAs (Launch Registry / Explore Ecosystem) | none | Public navigation. |
| Hero floating cards | none | Decorative; not interactive in v0.4. |
| MetricsBar | none | Aggregate counts; no PII. |
| RegistrySection search / filter / chips | none | Filters the public catalog only. |
| RegistrySection card actions (View / AIR-ID / Report) | none | All three actions are available to anonymous visitors. |
| GovernanceSection / Orchestration / Promo / FAQ | none | Static informational content. |
| Footer links | none | Public navigation + external resources. |
| TweaksPanel | **design-time only** | Production builds MUST omit the panel; the prototype includes it for tuning. |
| ReportModal submission | none (anonymous) | Submitter MUST provide an `email`; a spam-resistant CAPTCHA SHOULD gate the endpoint in production. |

## Anonymous-visitor data handling

- The home route MAY set a long-lived anonymous visitor cookie (e.g. `air_vid`) to track returning visitors for analytics. This cookie MUST NOT carry any PII and MUST be opt-out via a cookie banner where local law requires it.
- Telemetry events listed in `events.json` MAY include the anonymous visitor id. They MUST NOT include the visitor's IP, User-Agent, or any free-form input.
- ReportModal submissions DO contain a free-form `body` and an `email`. Production must:
  - Hash the email at rest (not store plain).
  - Run the `body` through the same DLP scan that admin uses on resource bodies.
  - NOT echo the email back into the SPA after submission.

## Cookie / privacy disclosure

- The Footer MUST contain a `Privacy` link (production); v0.4 prototype's Footer columns include placeholders.
- A cookie banner is REQUIRED for visitors from jurisdictions that require explicit consent (EU, UK). The banner MUST NOT block above-the-fold content and SHOULD use a small bottom-anchored bar.

## Audit obligations

The home page is **anonymous and read-only** with one exception: the ReportModal submission. That submission writes:

- `report.create` to the immutable audit ledger (server-side; not visible on the public site).
- A telemetry event `public.home.report.modal.submitted`.

All other interactions write only to telemetry, never to the audit ledger.

## Negative cases

- **CDN cache miss + origin 5xx**: render the page with a top banner `Reduced functionality — some content unavailable.`; the static shell, hero, and footer MUST always render.
- **JavaScript disabled**: production must serve a server-rendered version of at least the Hero and MetricsBar so the page is meaningful without JS. Interactive sections (RegistrySection / Tweaks / FAQ accordion / ReportModal) gracefully degrade to static content with a `Enable JavaScript for the full experience.` notice.
- **Geo-blocked region**: production may serve a region-specific notice in the Footer (e.g. for sanctioned jurisdictions); the rest of the page renders normally.

## Content moderation

- The mock catalog rows are FIXED in v0.4 and are not user-generated. Production should source the public catalog from the registry's published feed; only `verified`/`trusted`/`active` rows surface publicly.
- Resources with `status === 'isolated'` are **excluded** from the public catalog by default. They MAY be surfaced to admins via `/admin/resources` but never on the public home page.

## Data residency

- The public CDN MAY serve the home route from any edge.
- Per-tenant content (e.g. branding via `/public/site-config`) is tenant-scoped server-side; the edge cache MUST vary on the tenant-id header (defaulting to the canonical sovereign for the requesting region).
- ReportModal submissions are written to the **canonical sovereign tenant's** audit log — they do not duplicate to all sovereign tenants.
