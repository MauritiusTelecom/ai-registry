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

# Provider · Publish module — Permissions and access

## Surface classification

The Publish route is **authenticated**, **role-gated** (`provider`), and **write-capable**. Every action on this page mutates the provider's draft state or submits a resource for review.

## Required roles

To reach `portals/provider.html#/publish`:

- The session must hold the `provider` role bound to the active provider's `providerId`.
- The session must additionally hold scope `publish:write`. Read-only providers (e.g. CI bots restricted to `publish:read`) MUST land on this route with all inputs disabled and a top banner `Read-only seat — ask your owner for publish:write to use this wizard.`
- MFA mandatory.

## Per-element gating

| UI element | Required role / scope | Notes |
|------------|------------------------|-------|
| Sidebar item `Publish` | `provider` | Sidebar gated by portal entry. Item is rendered for read-only providers but the page surface explains the read-only state. |
| Step 1 / 2 inputs | `provider` + `publish:write` | Disabled for read-only seats. |
| `Save draft` (ghost) | `provider` + `publish:write` | Disabled for read-only seats. |
| `Run local checks` (secondary) | `provider` | Read-only seats may still run checks against an existing draft they have read access to. |
| `Continue` (primary) | `provider` + `publish:write` | Disabled for read-only seats. |
| `Submit for review` (Step 5, production) | `provider` + `publish:write` | Final submit gated. |
| Verification challenge (Step 3) | `provider` + `publish:write` | Token issuance is a write. |

## Sensitive data handling

- **Endpoint URL** — may include a private DNS name; treat as confidential. Production must NOT log the full URL in telemetry; the `provider.publish.draft.saved` event captures only the draft id and step.
- **Auth method == `mTLS`** — production wizard MUST collect the client cert fingerprint, NOT the cert / key. Cert / key live in the provider's runtime infrastructure.
- **Verification challenge token** — single-use, time-limited. Treat as a credential. Surfaced verbatim in the wizard once; production must zeroise from client memory after expiry.
- **Description / jurisdiction note** — free-form. Production should run the same DLP scan that admin uses on resource bodies before saving the draft.

## Audit obligations

State-changing endpoints write to the audit ledger with the parent `traceId`:

- POST `/provider/drafts` → `draft.create`
- PATCH `/provider/drafts/{id}` → `draft.update` (capturing diff per step)
- DELETE `/provider/drafts/{id}` → `draft.discard` (capturing optional reason if surfaced)
- POST `/provider/drafts/{id}/checks` → telemetry only, NOT ledger
- POST `/provider/drafts/{id}/verification/challenge` → `verification.challenge_issued`
- POST `/provider/drafts/{id}/submit` → `resource.publish` (the canonical record on the resource)

The submission also creates a paired `Review` row in the admin queue (`modules/admin/reviews`); the audit ledger captures the cross-link via shared `traceId`.

## Negative cases

- **Authenticated, no `provider`:** 403 server-side; SPA renders "You don't have provider access" empty state.
- **`provider` without `publish:write`:** as above — page renders, inputs disabled, banner shown.
- **Provider with `status === 'review'` (newly onboarded):** ALL save / continue / submit endpoints return 403 with detail `Provider verification pending. You can save drafts but not submit.` Save endpoints work; submit blocked.
- **Provider with `status === 'isolated'`:** every endpoint returns 403 with `Account isolated. Contact registry support.`
- **Submit with incomplete steps (3–5):** 422 with `Problem` body listing missing fields. SPA returns to the first incomplete step with errors highlighted.
- **Submit with stale verification (`proofVerifiedAt` expired):** 422; SPA returns to step 3 to re-issue.

## Data residency

- Drafts are scoped per provider tenant; only operators of that provider can see / edit them.
- Submitted resources land under the provider's catalogue and are visible to admins of the **same** sovereign tenant. External providers (e.g. `anthropic.com`) submit drafts under each sovereign tenant separately.
- The verification challenge endpoint MUST anchor the proof to the provider's `domain`; cross-domain proof is rejected.

## Concurrent editing

- Drafts can be opened on multiple seats in the same provider org.
- Production MUST surface a banner if another operator is currently editing the same draft (`${name} is editing this draft`); on save, the server returns 409 if `updatedAt` does not match the client's last-known value.

## Read-only seats — UX guidance

For seats with `provider` but not `publish:write`:

- All inputs render with `aria-readonly="true"` AND the visual disabled state (greyed text, no focus ring).
- The `Save draft` and `Continue` buttons render disabled with tooltip `Read-only seat. Ask an owner to grant publish:write.`
- The `Run local checks` button remains enabled and works against the read-only view of the draft.
