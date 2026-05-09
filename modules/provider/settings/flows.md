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

# Provider · Settings module — Flows

## Routing

- Route lives at `/settings` of the provider portal hash router.
- Activated via sidebar `Settings` (anchor `href="#/settings"`) — last item in the sidebar.
- Active match: exact `'/settings'` OR `path.startsWith('/settings/')`.

## Initial render

1. `App` resolves `path === '/settings'` → renders `<ProvSettings/>`.
2. Production: GET `/provider/settings` runs on mount; the two cards' fields are populated from the response.
3. Prototype: each input / textarea uses `defaultValue`; values are not bound to React state and are not persisted.
4. The 2-column card grid paints synchronously.
5. Production: emit `provider.settings.viewed` after first paint.

## Save flows (production)

Two patterns; tenants pick one and stick with it.

### Pattern A — Implicit save on blur (recommended)

- Field edit → debounced 250ms → SPA composes a single-field merge patch and sends it to the card-scoped endpoint.
- On 200: brief toast `Settings saved` (auto-dismiss 2s); the card briefly highlights the saved field.
- On 400 (validation): inline error under the field, no toast.
- On 5xx: inline error + top banner `Couldn't save — retrying…`; SPA retries up to 3 times with backoff.
- Emit `provider.settings.field.changed` per change and `provider.settings.<card>.saved` per successful PATCH.

### Pattern B — Explicit save footer

- Any dirty field reveals a sticky footer with `Save changes` (primary) and `Discard` (ghost) buttons.

## Per-card flows

### Organisation card

#### Flow 1 — Change `Display name`

- No confirmation needed beyond field validation.
- Server enforces a soft length cap (≤80 chars).
- On save, the new display name surfaces immediately on the dashboard title and sidebar logo sub label.

#### Flow 2 — Change `Domain` (production: gated)

- The prototype does NOT distinguish between editable / read-only fields; production MUST mark `domain` as read-only by default once verified.
- Re-verification flow:
  1. Operator clicks `Change domain` (production-only affordance — not in v0.4 prototype).
  2. SPA opens a small modal capturing the new domain and proof channel.
  3. POST `/provider/settings/domain-verify` returns a challenge token.
  4. Operator attaches the token to the chosen channel (DNS TXT / signed manifest / HTTPS callback).
  5. Server polls; on success, the SPA flips `domain` to the new value and writes the audit row.
- Emit `provider.settings.domain.verification_started` on 201.

#### Flow 3 — Change `Public bio`

- No confirmation needed beyond field validation.
- Server enforces ≤240 chars and rejects URLs / HTML / Markdown.
- On save, the new bio surfaces on the public profile page within ~60s (cache propagation).

### Notifications card

#### Flow 4 — Change `Incident channel`

- Free-form text. Production should suggest matching against existing `kind === 'notify'` integrations under `/admin/integrations` (e.g. an autocomplete drawing from configured Slack channels), but the field accepts any string for portability.

#### Flow 5 — Change `On-call email`

- Validates RFC-5322; saves on blur.
- On save, production sends a one-time test email to the new address with a verification token; the field is marked `pending verification` until the recipient clicks the verification link. Until verified, incident notifications continue to flow to the prior address.

#### Flow 6 — Change `Webhook`

- Validates HTTPS URL.
- On save, production immediately sends a `webhook.test` ping with HMAC signing using a freshly-generated secret. The SPA surfaces the secret ONCE (same flow as API keys; see `modules/provider/keys`).
- If the test ping fails (non-2xx response), the field is saved but a banner warns `Webhook test failed — incidents may not deliver.`

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on `visibilitychange` AND on push events `settings.changed` (in case another operator saves concurrently). On conflict (concurrent save), the SPA surfaces a banner `Settings changed by ${updatedBy}. Reload to see the latest.` rather than overwriting silently.

## Empty / error states

- This page does not have an "empty" state — every provider has settings.
- **5xx on initial GET** → render PageHeader + a single full-width error card: `Couldn't load settings.` with `Retry` button.
- **401/403** → redirect to provider sign-in / "Insufficient permissions" empty.

## Accessibility

- Each `p-field` MUST associate the `<label>` with its input via `for`/`id` (the prototype source uses bare `<label>` tags; production must add the binding).
- Keyboard tab order MUST traverse cards in reading order: Organisation → Notifications.
- The `Public bio` textarea SHOULD use `aria-describedby` pointing at a length counter (e.g. `120/240 characters`).
