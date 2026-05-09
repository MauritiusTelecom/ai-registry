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

# Provider · Docs module — Permissions and access

## Surface classification

The Docs route is **authenticated**, **role-gated** (`provider`), and **read-only**. Documentation content itself is public, but this in-portal listing requires a provider session to surface in context.

## Required roles

To reach `portals/provider.html#/docs`:

- The session must hold the `provider` role.
- MFA mandatory.

The endpoint `GET /provider/docs` returns the same set of doc cards regardless of `providerId` because docs are shared across all providers in a registry.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Docs` | `provider` | Sidebar gated by portal entry. |
| Doc card click | `provider` | Click resolves to a public docs URL. |

## Sensitive data handling

- Doc cards contain only public metadata (title, kind, updated). No tenant-specific data.
- The destination URL is public — the docs site is not gated.
- Telemetry events MAY include `docId`, `kind`, `title`. These are not sensitive.

## Audit obligations

The Docs route is read-only and writes nothing to the audit ledger. Telemetry events listed in `events.json` are UX signals, not ledger entries.

## Negative cases

- **Authenticated, no `provider`:** 403 server-side; SPA renders "You don't have provider access" empty state.
- **Provider with `status === 'isolated'`:** the page renders normally — docs are public. The provider can still read documentation while their account is isolated.
- **Stale session:** 401 forces sign-out.

## Data residency

- Doc cards are NOT tenant-scoped. They are shared across the registry.
- The docs site itself is hosted at the registry's own canonical domain (e.g. `docs.airegistry.mu`); production must NOT proxy doc content through tenant infrastructure.
