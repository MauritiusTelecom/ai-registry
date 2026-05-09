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

# Provider · Publish module — Publish a resource (5-step wizard)

## Purpose

Specify the **`/publish` route** of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This is the 5-step wizard a provider walks to publish a new resource (or a new version of an existing resource) into the registry. The prototype renders steps 1 and 2; production must implement all five.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table | `portals/provider-app.jsx` (`'/publish'` → `PROV_PAGES.ProvPublish`) |
| Page component (`ProvPublish`) | `portals/provider-pages.jsx` |
| Shared shell (`PageHeader`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens (forms, fields, dividers) | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` overrides:
  - `currentTitle="Publish"`
  - `breadcrumb=["Provider", "Publishing", "Publish"]`
  - Active sidebar item: `Publish` (`path: "/publish"`).

## Route body — vertical layout (`ProvPublish`)

1. **PageHeader** (no actions row)
2. **Form card** — single `p-card` with `maxWidth: 760`. The card holds all wizard steps stacked vertically separated by `p-divider`. (Production may convert to a stepper with discrete pages, see flows.md; v0.4 the prototype shows steps 1 and 2 inline.)

## Section copy and UI — PageHeader

- **Title:** `Publish a resource`
- **Subtitle:** `Five steps. Validation runs locally before submission.`
- **Actions row:** none.

## The five steps

The prototype implements steps 1 and 2; steps 3–5 are normative for production but not yet rendered.

| # | Step | Implemented in v0.4 prototype | Purpose |
|---|------|---|---------|
| 1 | Manifest | yes | Slug, kind, description, sovereignty tier, region |
| 2 | Endpoint | yes | URL, auth method, health probe |
| 3 | Verification | no | Proof-of-control upload, evals declaration |
| 4 | Sovereignty review prep | no | DPIA snippet, jurisdiction note, attestations |
| 5 | Confirm & submit | no | Diff preview vs prior version, final submit |

Each step has its own anchor / route segment in production: `/publish/manifest`, `/publish/endpoint`, `/publish/verification`, `/publish/sovereignty`, `/publish/confirm`.

## Section copy and UI — Step 1 · Manifest

- **Step heading** (`p-card-title`, `marginBottom: 12`): `1 · Manifest`
- **Field row 1** (`p-field-row`, two `p-field` children):
  - **Slug** — `<input class="p-input">`, placeholder `mcp/your-server`
  - **Kind** — `<select class="p-input p-select">` defaultValue `mcp-server`
    - Options (label === value): `mcp-server`, `agent`, `tool`, `model`
- **Description** — `<textarea class="p-input">` placeholder `One-paragraph description; what it does, who it's for, who shouldn't use it.`
- **Field row 2:**
  - **Sovereignty tier** — `<select>` defaultValue `Tier-1`. Options: `Tier-1`, `Tier-2`, `Tier-3`.
  - **Region** — `<input>` defaultValue `MU`

After step 1, a `<div class="p-divider">` separates from step 2.

## Section copy and UI — Step 2 · Endpoint

- **Step heading** (`p-card-title`, `marginBottom: 12`): `2 · Endpoint`
- **Endpoint URL** — `<input>` placeholder `https://mcp.edu.gov.mu/`
- **Field row:**
  - **Auth method** — `<select>` (no defaultValue — first option selected). Options: `OIDC`, `HMAC`, `mTLS`.
  - **Health probe** — `<input>` defaultValue `/healthz`

After step 2, a `<div class="p-divider">` separates from the action row.

## Section copy and UI — Steps 3–5 (normative for production)

### Step 3 · Verification

- Proof-of-control upload (DNS TXT, signed manifest, HTTPS callback). Server pre-issues a unique challenge token; the provider attaches it to the chosen channel.
- Evals declaration: free-form short note pointing to the eval harness output (`/runs` cross-link from verifier portal once published).

### Step 4 · Sovereignty review prep

- **DPIA threshold** — radio matching `pol_dpia_required`: `none`, `any-PII`, `bulk-PII`, `restricted`. Defaults to the tenant's `Settings → Sovereignty defaults → DPIA threshold`.
- **Jurisdiction note** — text capturing where data resides and which laws apply.
- **Attestations** — checklist (anti-misuse, age-gate if applicable, IP, license).

### Step 5 · Confirm & submit

- Side-by-side diff vs prior published version (if any).
- Final `Submit for review` primary button → POST `/provider/resources/publish`.

## Section copy and UI — Action row (bottom of card)

`<div class="p-row-end" style="gap: 8">` with three buttons:

1. `Btn variant="ghost"`: `Save draft`
2. `Btn variant="secondary"`: `Run local checks`
3. `Btn variant="primary" icon="arrow-right"`: `Continue`

In v0.4 these buttons are no-op stubs. Production wiring is documented in `flows.md`.

## Visual and motion

- Card uses the same gradient border treatment as other `p-card` instances.
- `p-field-row` is a flex row with two `p-field` children sharing equal width (50% each); collapses to single column ≤640px.
- `p-field` lays out label + input vertically (the `Settings` page uses the same primitive but in a horizontal variant — note the difference).
- The card does NOT animate on mount.
- Form inputs have a focus ring `var(--primary)`; keyboard navigation must traverse fields in document order.

## Navigation behaviour

- `Save draft` (ghost): no-op stub. Production POSTs the current form state as a `draft` resource (status `draft`) and surfaces a toast `Draft saved`. Provider can return to `/resources` and see the row with `status === 'draft'`.
- `Run local checks` (secondary): no-op stub. Production runs client-side validation (slug format, kind/slug agreement, URL validity, region in known list) and surfaces an inline panel listing each check with a green check or red error. Does NOT submit.
- `Continue` (primary): no-op stub in v0.4 because subsequent steps are not implemented. Production navigates to the next step (`/publish/endpoint` → `/publish/verification` → …).

## Local state

The prototype renders the form with **uncontrolled** inputs (`defaultValue` only — no `value` / `onChange` binding). Production must convert to controlled state so the wizard can persist between steps and survive page refresh (via `sessionStorage` keyed by tenant + draft id).

## Out of scope on this page

- Multi-version diff renderer (lives on step 5).
- Eval harness integration (cross-portal — verifier owns benchmarks).
- Webhooks for review status updates (push to provider portal once review board acts).
