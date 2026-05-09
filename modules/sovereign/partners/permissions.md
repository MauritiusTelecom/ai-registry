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

# Sovereign · Partners module — Permissions and access

## Surface classification

The Partners route is **authenticated**, **role-gated** (`sovereign`), and **read-only**.

## Required roles

To reach `portals/sovereign.html#/partners`:

- The session must hold the `sovereign` role bound to the active sovereign authority.
- MFA mandatory.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Regional partners` | `sovereign` | Sidebar gated by portal entry. |
| DataTable rows | `sovereign` | Read-only. |
| Detail drawer (production) | `sovereign` | Surfaces signed MOU URL + contact roster. |
| MOU PDF download (production) | `sovereign` + scope `global` | Bulk export of MOU is privileged. |

## Sensitive value handling

- **MOU document** — treat as confidential. Production must serve via a signed URL with short TTL (e.g. 5 minutes); the URL is never cached at the edge.
- **Contact roster** — names and emails of partner-side liaisons. Apply tenant `audit.actor.redact` policy if enabled.
- **`mou === 'pending'`** is operational metadata; not sensitive but cross-tenant disclosure must be avoided.

## Audit obligations

- Reading the Partners page writes nothing to the audit ledger.
- MOU document downloads (production) write `partners.mou.downloaded` capturing actor + partner name + date.
- Partner add / remove / MOU update (admin-side, out of scope here) writes `partners.added` / `partners.removed` / `partners.mou.updated`.

## Negative cases

- **Authenticated, no `sovereign`:** 403 server-side.
- **Authority mismatch:** 403 with detail `Authority mismatch.`
- **Stale session:** 401 forces sign-out.

## Read-only invariants

- The sovereign portal MUST NOT offer `Add partner`, `Edit MOU`, or `Remove partner` affordances on this page. Those actions are admin-side and require sovereignty-board authority.

## Data residency

- Partner rows are tenant-scoped via session-derived authority.
- MOU documents are stored in the tenant region; cross-region access requires explicit policy override.
- Cross-tenant partner replication is **not** implied by v0.4. Each sovereign maintains its own roster.
