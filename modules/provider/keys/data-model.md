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

# Provider · API keys module — Data model

## ApiKey

Mirrors `PROV_KEYS[i]` in `portals/provider-data.jsx`. The list shape contains **no full secret**.

```ts
type ApiKey = {
  id: string;          // "k_<digits>"; opaque server-issued
  name: string;        // human label (e.g. "production", "ci-pipeline")
  prefix: string;      // environment-hinted prefix ("air_pk_live_", "air_pk_test_")
  last4: string;       // last four characters of the secret, for visual identification
  scope: string;       // comma-separated capability list ("publish:read,write")
  created: string;     // ISO date "YYYY-MM-DD"
  lastUsed: string;    // server-formatted relative string ("2m ago", "1h ago", "Never")
};
```

The full secret string is never returned by any list endpoint and is shown ONCE at creation time (see `flows.md`).

### Field semantics

- **`name`** — operator-chosen display label. Convention encourages role hints (`production`, `staging`, `ci-pipeline`).
- **`prefix`** — environment hint that is part of the key string itself, NOT metadata:
  - `air_pk_live_` — production / sovereign-tenant keys.
  - `air_pk_test_` — sandbox / sovereign-tenant test keys.
- **`last4`** — the **last** 4 characters of the full secret; combined with `prefix` they make a stable visual identifier without revealing the secret.
- **`scope`** — comma-separated list of capability tokens. Known v0.4 values: `publish:read`, `publish:write`. Production may extend (e.g. `analytics:read`, `incidents:write`).
- **`created`** — date the key was issued.
- **`lastUsed`** — relative time string. The literal `Never` MAY appear for keys that have not yet been used.

### v0.4 mock corpus (3 rows)

| id | name | prefix | last4 | scope | created | lastUsed |
|---|---|---|---|---|---|---|
| k_001 | production | air_pk_live_ | 8821 | publish:read,write | 2026-02-04 | 2m ago |
| k_002 | ci-pipeline | air_pk_live_ | 4471 | publish:write | 2026-03-19 | 14m ago |
| k_003 | staging | air_pk_test_ | 0094 | publish:read,write | 2026-04-02 | 1h ago |

## ApiKeyCreatedOnce (production-only)

The response shape returned exactly once when a new key is created. Never persisted in the SPA, never re-fetchable.

```ts
type ApiKeyCreatedOnce = ApiKey & {
  fullSecret: string;     // displayed in modal with Copy CTA; SPA must zeroise after the modal closes
  fullSecretShownAt: string;  // ISO-8601 UTC; server records this as a hint that the secret was viewed
};
```

## Authoritative response shape (production list)

```ts
type ProviderKeysResponse = {
  rows: ApiKey[];
  total: number;
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## Constraints / invariants

- `id` is unique per provider tenant.
- `(prefix + last4)` is **not** unique on its own — production should NEVER attempt to identify a key from those alone; always use `id`.
- A key with no `lastUsed` activity has the literal `Never`.
- Revoked keys are retained as immutable records (server-side); the list endpoint may filter them out by default but a future `Show revoked` toggle SHOULD surface them.
- Scope tokens use a fixed `<surface>:<action>` shape. Tokens unknown to the gateway are rejected at validation.

## Reference data on this page

- **Environment prefixes:** `air_pk_live_`, `air_pk_test_`. Tenants on a single environment will only see one prefix in v0.4.
- **Scope vocabulary (v0.4):** `publish:read`, `publish:write`. Future extensions live in `airegistry-specs/governance/`.
