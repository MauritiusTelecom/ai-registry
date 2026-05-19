# Import Inventory: `apps/portal` → `packages/core`

**Status:** Phase 6.0 deliverable. Use this as the punch-list for Phase 6.1 (boundary tightening).
**Companion docs:** [`migration-plan.md`](./migration-plan.md), [`extension-point-design.md`](./extension-point-design.md), [`open-source-readiness.md`](./open-source-readiness.md)
**Anchor:** `ai-registry/MIGRATION.md` calls out this exact cleanup as "follow-up to the monorepo split."

## 1. What this is

The prior monorepo migration moved `src/lib/<core-module>` into `packages/core/src/lib/<core-module>` but did **not** rewrite the ~447 import statements that referenced it. Instead, `apps/portal/tsconfig.json` aliases the historical `@/lib/<core-module>` paths to their new homes. This is the bridge the README says will be removed.

This document enumerates every alias, classifies what each one should become in the SDK-only world, and gives an ordered plan to land the cleanup PR by PR.

**Numbers as scanned (commit `HEAD` at the time of writing):**

| Module                 | Imports | Files |
|------------------------|--------:|------:|
| `@/lib/prisma`         | 101     | 101   |
| `@/lib/auth/*`         | 85      | 76    |
| `@/lib/config`         | 42      | 42    |
| `@/lib/with-base`      | 40      | 40    |
| `@/lib/email`          | 32      | 17    |
| `@/lib/discovery`      | 25      | 15    |
| `@/lib/audit`          | 23      | 23    |
| `@/lib/admin/*`        | 16      | 10    |
| `@/lib/validators`     | 8       | 8     |
| `@/lib/contacts/*`     | 7       | 6     |
| `@/generated/*`        | 6       | 6     |
| `@/lib/governance`     | 3       | 3     |
| **Total**              | **388** | **~181** |

(Tally rough — files appear in multiple buckets. `grep` confirms 447 raw imports across 181 unique files.)

## 2. Classification scheme

Each module is classified into one of four columns:

| Class                  | Meaning                                                                                       | Action                                                                                          |
|------------------------|-----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| **SDK-public**         | The symbol is already part of, or belongs in, the SDK SemVer contract.                        | Rewrite imports to `@airegistry/sdk`. Delete the tsconfig alias.                                |
| **SDK-service**        | The symbol shouldn't be raw, but a wrapping service function belongs in the SDK contract.     | Add a service function to `@airegistry/sdk`. Rewrite call sites. Delete the alias.              |
| **Portal-internal**    | The symbol is app-level; portal owns it.                                                      | No SDK move. May still need rename to drop `@/lib/` aliasing.                                   |
| **Banned-from-apps**   | Apps should not import this directly at all (e.g. raw Prisma client).                         | Replace every call site with a service function. Add a lint rule that bans the original symbol. |

## 3. The inventory

### 3.1 `@/lib/prisma` — 101 imports

**Symbols imported:** `prisma` (the singleton Prisma client).

**Class:** **Banned-from-apps.**

**Why:** Letting apps hold the raw Prisma client makes the boundary leaky in the worst way. Every call site can issue any query, ignore audit instrumentation, and bypass the lifecycle/visibility predicates that core enforces in its service functions. This is the single largest open-source liability: a contributor's first instinct will be "I'll just query the DB directly."

**Recommended action:**

1. Identify the queries each call site makes. They fall into a handful of categories: read-with-public-projection, read-with-portal-projection, governance write, audit-paired write.
2. For each category, ensure there is a core service function in `packages/core/src/lib/<area>/` that returns the right projection and writes the right audit row.
3. Expose those service functions through `@airegistry/sdk` (typed, no raw `PrismaClient` types in the surface).
4. Rewrite all 101 call sites.
5. Add ESLint rule that bans `@airegistry/core/prisma` and the raw `PrismaClient` import in any file under `apps/`.

**Order:** do this **last** of the major modules — auth/audit/discovery service functions need to exist first. This is the keystone PR; everything else makes it possible.

**PR sizing:** group by route family (`/api/admin/*`, `/api/portal/*`, `/api/public/*`, server-component pages). 4–5 PRs total.

### 3.2 `@/lib/auth/*` — 85 imports across 76 files

**Symbols imported (sample):** `getCurrentUser`, `SessionUser` type, `hashToken`, `verifyPassword`, separation-of-duties helpers.

**Class:** **Mixed.**

| Sub-symbol                         | Class           | Notes                                                                       |
|------------------------------------|-----------------|-----------------------------------------------------------------------------|
| `getCurrentUser`                   | SDK-service     | Becomes `sdk.session.current()` — opaque to caller, no Prisma leak.         |
| `SessionUser` type                 | SDK-public      | Already a well-shaped, public-safe envelope. Add to SDK exports.            |
| `assertCanReview` / `Sep…Error`    | SDK-public      | Constitution §7 enforcer. Belongs in the public contract.                  |
| `hashToken`, `verifyPassword`      | Banned-from-apps | App should not do its own crypto. Move callers behind login/register service functions in core. |
| Role/status code constants         | SDK-public      | Add to SDK as a frozen enum-like object.                                    |

**Recommended action:** in one PR, add the SDK exports listed above; in subsequent PRs, replace call sites and route the crypto helpers behind login/register/verify service functions.

### 3.3 `@/lib/config` — 42 imports

**Symbols imported:** `getConfig`.

**Class:** **SDK-public.**

`RegistryConfig` type is already re-exported by the SDK. The `getConfig()` accessor is not. Recommendation: add `import { getConfig } from "@airegistry/sdk"`. Mark `getConfig` as **read-only** in the SDK contract: extensions read config, they never mutate it.

**Single-PR change.** Mechanical rewrite + delete one tsconfig alias.

### 3.4 `@/lib/with-base` — 40 imports

**Symbols imported:** `withBase`.

**Class:** **SDK-public — already exported.**

The function is already in `@airegistry/sdk` (per `packages/sdk/src/index.ts`). Only thing left is rewriting call sites and deleting the tsconfig alias.

**Single-PR change.** Lowest-risk in the whole inventory. **Do this first** as a warm-up that proves the rewrite tooling.

### 3.5 `@/lib/email` — 32 imports across 17 files

**Symbols imported (sample):** transactional senders (`sendVerificationEmail`, `sendInviteEmail`, etc.).

**Class:** **SDK-service.**

**Why service, not public:** email senders are coupled to operator config (SMTP, branding). They shouldn't be raw functions an extension can paste into; they should be invocations through a notification service that respects branding and audit.

**Recommended action:** define `sdk.email.send(template, params)` with a typed template registry. Migrate call sites in one PR; deprecate the raw senders for app use.

**Open question:** should extensions be allowed to register their own email templates? Recommendation: **yes**, via the manifest's `emailTemplates` field (a future addition to `PluginManifest`; not in the current SDK shape).

### 3.6 `@/lib/discovery` — 25 imports across 15 files

**Symbols imported:** `toRegistryCard`, `toRegistryCardDetail`, `toPublicProviderCard`, `deriveDisplayStatus`, helpers.

**Class:** **SDK-public.**

These serializers are exactly the surface extensions need for the "discovery serializer wrapper" extension point in [`extension-point-design.md`](./extension-point-design.md) §5.6. Add them to the SDK now.

**Single-PR change.** Doubles as the first step toward the wrapper extension point.

### 3.7 `@/lib/audit` — 23 imports across 23 files

**Symbols imported:** `writeAudit`.

**Class:** **SDK-public.**

The audit primitive is named in constitution §6 and AIR-SPEC §18. It is a stable contract. Re-export it as `sdk.audit.write`. No shape change.

**Single-PR change.**

### 3.8 `@/lib/admin/*` — 16 imports across 10 files

**Symbols imported:** `REF_TABLES` constant, ref-table CRUD helpers.

**Class:** **Mixed.**

| Sub-symbol                       | Class            | Notes                                                                                  |
|----------------------------------|------------------|----------------------------------------------------------------------------------------|
| `REF_TABLES` constant            | SDK-public       | Catalog of reference tables. Useful to extensions that want to render ref-table CRUD.  |
| Ref-table CRUD helpers           | SDK-service      | Wrap as `sdk.admin.refTables.list/get/create/update/delete` with capability checks.    |

**Action:** define the service interface; migrate the 10 files; consider whether ref-table CRUD becomes a slot extension point.

### 3.9 `@/lib/validators` — 8 imports

**Symbols imported:** `isSlug`, `isHttpUrl`, etc.

**Class:** **SDK-public — already exported.**

Same as `with-base`: mechanical rewrite + alias delete.

**Single-PR change.**

### 3.10 `@/lib/contacts/*` — 7 imports across 6 files

**Class:** **SDK-service.**

Contact intake is operator-facing. Extensions might want to register an additional contact type, but the canonical intake/reply flow stays in core. Wrap as `sdk.contacts.submit / sdk.contacts.reply` with capability gates.

### 3.11 `@/generated/*` — 6 imports across 6 files

**Symbols imported:** Prisma generated types (`Resource`, `Provider`, etc.).

**Class:** **Banned-from-apps.**

Apps should not import Prisma row shapes. They should import the **public projections** (`RegistryCard`, `RegistryCardDetail`, `PublicProviderCard`) from the discovery serializers. Raw Prisma types include internal-only columns (`internalNote`, `passwordHash`, `complainantEmail`) and bind apps to schema details that may change.

**Action:** identify the 6 callers, rewrite to use projections, lint-ban the import.

### 3.12 `@/lib/governance` — 3 imports across 3 files

**Symbols imported:** `assertCanReview`, sovereignty checklist.

**Class:** **SDK-public.**

Tiny surface, high constitutional weight. Add to SDK.

**Single-PR change.**

## 4. Portal-internal modules (no change needed)

These tsconfig aliases stay; they're app-local helpers:

- `@/lib/branding`
- `@/lib/theme-cookie`
- `@/lib/public-origin`
- `@/lib/portal/*`
- `@/lib/portals/*`

**Optional polish:** rename to `@/branding`, `@/theme`, `@/portals/*` etc. to drop the `lib/` prefix that suggests core. Cosmetic; defer.

## 5. Recommended PR order

Ordered by **risk-adjusted leverage** — low-risk first, keystone PR last.

| #   | Scope                          | Reason                                                                  | Risk    | LOC est. |
|----:|--------------------------------|-------------------------------------------------------------------------|---------|---------:|
| 1   | `with-base` (40 imports)       | Symbol already public; warm-up; proves rewrite codemod.                 | Trivial | ~80      |
| 2   | `validators` (8 imports)       | Same — already public.                                                  | Trivial | ~16      |
| 3   | `config` getter (42 imports)   | Add `getConfig` to SDK exports; rewrite call sites.                     | Low     | ~85      |
| 4   | `audit` (23 imports)           | Add `audit.write` to SDK; rewrite.                                      | Low     | ~50      |
| 5   | `discovery` serializers (25)   | Add serializers and types to SDK; rewrite. Doubles as wrapper-prep.     | Low     | ~50      |
| 6   | `governance` (3 imports)       | Tiny but constitutionally important.                                    | Trivial | ~10      |
| 7   | `auth` types + session (~30)   | `SessionUser` type, `getCurrentUser`, separation-of-duties.             | Medium  | ~120     |
| 8   | `auth` crypto helpers (~10)    | Move behind login/register service functions in core. Apps stop crypto. | Medium  | ~80      |
| 9   | `email` service (32 imports)   | Wrap behind `sdk.email`.                                                | Medium  | ~100     |
| 10  | `admin` ref-tables (16)        | Wrap behind `sdk.admin.refTables`.                                      | Medium  | ~70      |
| 11  | `contacts` (7)                 | Wrap behind `sdk.contacts`.                                             | Low     | ~40      |
| 12  | `@/generated/*` (6)            | Replace with projections.                                               | Medium  | ~50      |
| 13  | **Keystone:** `prisma` (101)   | Replace every raw query with a service function; ban raw client.        | High    | ~700+    |

**Lint fence:** add `no-restricted-imports` after PR 13. Adding earlier breaks development.

## 6. Codemod recommendation

PRs 1–6 are pure rewrites — `jscodeshift` or a `sed` script over `apps/portal/src` will do them. Suggested codemod:

```bash
# Example for PR 1 (with-base)
find apps/portal/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec \
  sed -i 's|from "@/lib/with-base"|from "@airegistry/sdk"|g' {} +
```

PRs 7–13 are not purely mechanical because they introduce new SDK shapes. Hand-written.

## 7. Acceptance per PR

Every PR in the table above must:

1. Pass `pnpm --filter @airegistry/portal typecheck`.
2. Pass `pnpm --filter @airegistry/portal build`.
3. Not change runtime behavior (verified by smoke test).
4. Update `apps/portal/tsconfig.json` to remove the aliases it deletes.
5. Update `MIGRATION.md` to scratch off the corresponding row.

When PR 13 lands, the tsconfig file has only `"@/*": ["./src/*"]` left.

## 8. Definition of done for Phase 6.1

- [ ] All 13 PRs landed.
- [ ] `apps/portal/tsconfig.json` has no `@/lib/<core>` aliases.
- [ ] `grep -r "@/lib/" apps/portal/src` returns only `@/lib/branding`, `@/lib/theme-cookie`, `@/lib/public-origin`, `@/lib/portal/*`, `@/lib/portals/*`.
- [ ] No file under `apps/` imports `@airegistry/core` directly.
- [ ] No file under `apps/` imports `PrismaClient` or `@/generated/*`.
- [ ] ESLint rule `no-restricted-imports` enforcing the boundary is on `main`.
- [ ] `MIGRATION.md` updated to remove the "path-alias bridge" section.

After this, Phase 6.2 (`portal-kit` extraction) can begin without fighting boundary leaks.

## 9. Risk register

| Risk                                       | Likelihood | Mitigation                                                                |
|--------------------------------------------|------------|---------------------------------------------------------------------------|
| Raw Prisma calls hide audit gaps           | High       | Phase 4 governance audit instrumentation must complete before PR 13.       |
| Service-function fan-out balloons SDK      | Medium     | Group by domain (`sdk.audit`, `sdk.discovery`, `sdk.session`, etc.); resist flat exports. |
| Mass rewrite stale during long PRs         | Medium     | Land in topological order, small PRs, daily rebases.                       |
| Type drift between Prisma rows and SDK projections | Medium | Generate projection types from Prisma in CI; fail build on drift.          |

---

**Next step after this doc:** the normative spec — see [`ai-registry-specs/.speckit/extension-architecture.md`](../../../ai-registry-specs/.speckit/extension-architecture.md) (added in Phase 6.0 alongside this inventory).
