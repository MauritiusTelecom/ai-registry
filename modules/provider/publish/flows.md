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

# Provider · Publish module — Flows

## Routing

- Route lives at `/publish` of the provider portal hash router.
- Activated when sidebar item `Publish` is clicked, when the dashboard's `Publish resource` button fires, when `/resources` page fires its `Publish resource` button, or when the command palette `Publish a resource` action fires.
- Production sub-routes per step: `/publish/manifest`, `/publish/endpoint`, `/publish/verification`, `/publish/sovereignty`, `/publish/confirm`. v0.4 prototype renders steps 1 and 2 inline on `/publish`.

## Initial render

1. `App` resolves `path === '/publish'` → renders `<ProvPublish/>`.
2. The card renders with uncontrolled inputs and their `defaultValue` / `placeholder` strings.
3. Production: GET `/provider/drafts` to surface any existing draft; if exactly one is open, prompt `Resume draft 'mcp/your-server'?` modal; if multiple are open, show a draft picker.
4. Emit `provider.publish.viewed`.

## Save draft (Flow 1)

- Click `Save draft` (ghost).
- Production: POST `/provider/drafts` (first save) or PATCH `/provider/drafts/{id}`. Surface a toast `Draft saved`. Provider can return to `/resources` and see the row with `status === 'draft'`.
- Prototype: no-op stub.
- Emit `provider.publish.action.save_draft.clicked` and `provider.publish.draft.saved`.

## Run local checks (Flow 2)

- Click `Run local checks` (secondary).
- Production: POST `/provider/drafts/{id}/checks`. Server runs the validation matrix from `data-model.md` and returns per-check results. SPA renders an inline panel (collapsible, below the action row) listing each check with green check or red error. Does NOT submit.
- Prototype: no-op stub.
- Emit `provider.publish.action.run_checks.clicked` and `provider.publish.checks.run` with `passed` and `failed` counts.

## Continue (Flow 3)

- Click `Continue` (primary, icon `arrow-right`).
- Production:
  - If current step's required fields fail validation, surface inline errors and do NOT advance. Emit `provider.publish.action.continue.clicked` but NOT `provider.publish.step.advanced`.
  - If validation passes, PATCH the draft with the new step value, navigate to the next step's sub-route. Emit `provider.publish.step.advanced` with `{from, to}`.
  - On step 5, the `Continue` button is replaced with `Submit for review`; submitting calls POST `/provider/drafts/{id}/submit` (see Flow 6).

## Step 3 verification flow (Flow 4)

- On entry to step 3, SPA presents the three proof channel options.
- Operator picks one → POST `/provider/drafts/{id}/verification/challenge` → server returns `token` and `expiresAt`.
- Operator copies the token, attaches it to the chosen channel (DNS TXT record, signed manifest, or HTTPS callback), and clicks `Verify now`.
- Production: server polls the channel and reports `proofVerifiedAt`. The UI shows a spinner with retry on failure.
- Emit `provider.publish.verification.challenge_issued` on token issuance.

## Step 4 sovereignty flow (Flow 5)

- On entry to step 4, SPA pre-populates `dpiaThreshold` from the tenant's `Settings → Sovereignty defaults → DPIA threshold`.
- Operator fills `jurisdictionNote` (free-form) and ticks the `attestations` checklist.
- All four `attestations.*` flags must be `true` for `Continue` to enable, except `ageGate` which is required only for `agent` resources whose declared use mentions minors. The SPA enables / disables `Continue` accordingly.

## Submit (Flow 6)

- Click `Submit for review` on step 5.
- Production: POST `/provider/drafts/{id}/submit`. Server returns `202` with `{ resourceId, version, submissionId }`. The draft is consumed (deleted) and the resource appears at `/resources` with `status === 'review'`. The submission appears at `/submissions` with `status === 'pending'`.
- On 422 (incomplete / invalid): SPA returns to the offending step with errors highlighted.
- Emit `provider.publish.submitted` on success; emit `provider.publish.error` with `status: 422` on validation failure.

## Discard draft (Flow 7)

- Production: from the draft picker or wizard header, `Discard draft` → confirmation → DELETE `/provider/drafts/{id}`.
- Prototype: not implemented.

## Auto-save

- Production-recommended: implicit save on field blur with a 500ms debounce. Same endpoints as Flow 1; the SPA tracks a "saving…" / "saved at HH:MM" indicator near the action row.
- Race conditions: if two operator seats edit the same draft, the server returns 409 with a body indicating the latest `updatedAt`; the SPA surfaces a banner `${otherOperator} is also editing this draft. Reload?`.

## Empty / error states

- **Server unreachable on Save / Continue:** SPA surfaces a banner `Couldn't save — your changes are kept locally. Reconnecting…` and retries with exponential backoff up to 5 minutes; if it still fails, the SPA preserves the form state in `sessionStorage` keyed by `tenant + draft id`.
- **401/403:** redirect to provider sign-in / "Insufficient permissions" empty.
- **Verifier portal rejects after submission:** the resource flips to `experimental` or back to `draft` with a comment; the provider sees the comment on `/submissions` and may resume publishing via the same flow.

## Accessibility

- Each `p-field` MUST associate the `<label>` with its input via `for`/`id` (the prototype source uses bare `<label>` tags; production must add the binding).
- The action row uses `role="group"` with `aria-label="Wizard actions"`.
- The `Continue` button MUST advertise the destination via `aria-label` (e.g. `Continue to Endpoint step`).
- The card scrolls within its `maxWidth: 760` container; tab order traverses fields top-to-bottom.
