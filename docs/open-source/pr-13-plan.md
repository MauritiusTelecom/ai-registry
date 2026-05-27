# PR 13 — Plan: Hide the raw Prisma client behind core service functions

**Status:** Planning doc. PR 13 is **NOT** a codemod; this doc carves it into ~6 landable sub-PRs.
**Companion docs:** [`import-inventory.md`](./import-inventory.md), [`migration-plan.md`](./migration-plan.md), [`extension-point-design.md`](./extension-point-design.md).

## 1. Why PR 13 is different from PRs 1–12

PRs 1–12 were boundary-tightening: rewrite the import path, optionally wrap a primitive behind a thin helper. The semantics of each call site never changed. The Prisma surface cannot be moved that way — apps don't just *import* `prisma`, they construct ad-hoc queries against the schema. The boundary is too wide to wrap with a renaming pass.

**The goal of PR 13:** apps consume the database **only** through typed service functions in `@airegistry/core`. The raw `PrismaClient` becomes internal. Adding a service function is a deliberate act, with documented inputs/outputs, audit obligations, visibility predicates, and (where applicable) separation-of-duties checks.

When PR 13 is done:

- The `@/lib/prisma` tsconfig alias is deleted.
- A grep for `prisma\.[a-zA-Z]+\.` in `apps/portal/src` returns zero matches.
- Every governance-relevant write writes an audit row through `writeAudit()` — no raw `prisma.auditLog.create` anywhere.
- The visibility rule (constitution §5) lives in core, not duplicated across routes.
- The separation-of-duties enforcer (constitution §7) is unbypassable.

## 2. Scale (measured)

| Metric | Count |
|---|---:|
| Files importing `prisma` in `apps/portal/src` | **101** |
| Total `prisma.<model>.<op>(...)` operations | **378** |
| Reads (`findMany` / `findUnique` / `findFirst` / `count` / `groupBy` / `findUniqueOrThrow`) | 333 (88%) |
| Writes (`create` / `update` / `delete` / `upsert` / `*Many`) | 45 (12%) |
| Reference-table reads (lookup-only, no audit) | 161 (43% of all ops) |
| Files with direct `prisma.auditLog.create` (bypassing `writeAudit`) | **14** ← audit-instrumentation gap |
| Heaviest single file | `api/admin/resources/[id]/route.ts` (18 ops) |

### 2.1 Operation distribution

| Operation | Count |
|---|---:|
| `findUnique` | 129 |
| `findMany` | 127 |
| `count` | 59 |
| `create` | 22 |
| `update` | 13 |
| `findFirst` | 10 |
| `groupBy` | 6 |
| `delete` | 4 |
| `upsert` | 3 |
| `findUniqueOrThrow` | 2 |
| `createMany` | 2 |
| `updateMany` | 1 |

### 2.2 Entity distribution

The top 5 (`resource`, `provider`, `user`, `review`, `complaint`) account for 162 of 378 ops. The remainder is spread across reference tables and governance-adjacent models (audit, evidence, trustSignal, etc.).

### 2.3 Route-family distribution

| Family | Files | Ops |
|---|---:|---:|
| `app/api/admin/*` | 20 | 106 |
| `app/admin/*` (server pages) | 16 | 62 |
| `app/api/portal/*` | 8 | 42 |
| `app/provider/*` (server pages) | 11 | 36 |
| `app/sovereign/*` (server pages) | 10 | 29 |
| `app/api/auth/*` | 6 | 22 |
| `lib/` (shared helpers) | 4 | 22 |
| `app/verifier/*` (server pages) | 8 | 17 |
| `app/api/public/*` | 3 | 13 |
| `app/api/complaints/route.ts` | 1 | 9 |
| `app/portal/*` (server pages) | 4 | 7 |
| `app/auth/verify/page.tsx` | 1 | 4 |
| Specialty APIs (mcp, well-known, discover, etc.) | 9 | ~14 |

### 2.4 The audit gap

A previous wave of work added the `writeAudit` primitive (PR 4) and wired imports across 23 files. The truncation-recovery step then restored several of those files from the pre-monorepo snapshot, which uses raw `prisma.auditLog.create(...)` calls. The net result is that **14 sites still do raw audit-row creates**, and the audit posture across the codebase is inconsistent.

This must be cleaned up as part of PR 13's write-handling sub-PRs (PR 13E and PR 13F).

## 3. Strategy

### 3.1 Service-function categories

Every call site falls into one of these categories:

| Category | Approx. ops | Audit? | Visibility? | Sep-of-duties? | Wrapper shape |
|---|---:|:---:|:---:|:---:|---|
| **A. Reference catalog reads** | ~161 | — | — | — | `getReferenceCatalog(name)` etc. |
| **B. Public discovery reads** | ~30 | — | yes | — | Already exists (`listPublicResources`, `findResourceForDetail`, …) — migrate apps to use them. |
| **C. Portal-self reads** | ~50 | — | per-actor | — | `loadProviderHome(actorId)`, `loadMyResources(actorId)`, … |
| **D. Admin reads** | ~70 | — | admin-only | — | `adminListProviders(filters, pagination)`, `adminGetResource(id)`, … |
| **E. Admin writes (non-governance)** | ~15 | yes | admin-only | — | `adminCreate*`, `adminUpdate*`, `adminDelete*` — all funnel through `writeAudit` |
| **F. Governance writes (lifecycle, review, verify)** | ~10 | yes | per-policy | yes | `recordReviewDecision`, `transitionResourceLifecycle`, `verifyProvider`, … with `assertCanReview` and audit baked in |
| **G. Auth flow writes** | ~10 | yes | — | — | Already partly wrapped in PR 8 (services.ts). Extend to cover password reset, registration, etc. that still do raw user CRUD. |
| **H. Contact intake** | ~8 | yes | — | — | `recordContactSubmission`, `verifyContactToken` — public surface, no auth but careful Prisma error handling |
| **I. Audit reads** | ~6 | — | admin-only | — | `listAuditLog(filters)`, `getAuditEntity(id)` |

### 3.2 Where service functions live

```
packages/core/src/lib/services/
├── reference.ts       (A) — collapse 161 reference-table reads
├── discovery.ts       (B) — already exists; just migrate apps
├── portal.ts          (C) — actor-scoped reads
├── admin/
│   ├── providers.ts   (D + E for Provider)
│   ├── resources.ts   (D + E for Resource)
│   ├── users.ts       (D + E for User)
│   ├── complaints.ts  (D + E for Complaint)
│   └── reviews.ts     (D + F for Review)
├── governance/
│   ├── lifecycle.ts   (F) — resource lifecycle transitions
│   ├── verification.ts (F) — provider verification
│   └── elevation.ts   (F) — trust-signal elevation
├── auth.ts            (G) — extend existing auth/services.ts
├── contact.ts         (H) — contact submit + verify
└── audit-query.ts     (I) — audit reads
```

All exposed through `@airegistry/sdk/server` re-exports.

### 3.3 Service-function design rules (normative)

1. **Audit obligation:** every write-service writes an audit row via `writeAudit(...)` internally. Callers cannot forget. Direct `prisma.auditLog.create(...)` is BANNED everywhere outside `packages/core/src/lib/audit/`.
2. **Visibility:** every read-service that returns public-projection data applies the visibility predicate (constitution §5) internally. Callers cannot accidentally leak.
3. **Separation of duties:** every service that performs a review/elevation/verification calls `assertCanReview(actor, target)` before the write. No bypass parameter.
4. **No Prisma types in service signatures.** Inputs and outputs use plain TypeScript shapes or SDK-defined projections. The `Prisma.X` namespace stays internal to the service implementations.
5. **Each service has a doc comment** linking to the route(s) it replaces and explaining the audit/visibility/auth posture.
6. **Tests live next to services.** A service function without a unit test does not land.

## 4. Sub-PR breakdown

Six sub-PRs in risk-adjusted order. Each ships independently; later sub-PRs depend on earlier ones (mostly because they reuse the service helpers introduced earlier).

### PR 13A — Reference-catalog reads (low risk, high progress)

**Scope:** ~161 ops, ~25 reference tables.

**Service surface:**

```ts
// packages/core/src/lib/services/reference.ts
export async function listReferenceTable(table: ReferenceTableName, opts?: {
  activeOnly?: boolean;
  orderBy?: "sortOrder" | "name" | "code";
}): Promise<ReferenceRow[]>;

export async function getReferenceRow(
  table: ReferenceTableName,
  codeOrId: string
): Promise<ReferenceRow | null>;
```

`ReferenceTableName` is a union of the 25 ref-table codes from `REF_TABLES`. `ReferenceRow` is a stable public projection: `{ id, code, name, description, sortOrder, active }`.

**Acceptance criteria:**

- `grep -E "prisma\.(resourceType|lifecycleStatus|riskLevel|sovereigntyBasis|jurisdiction|sector|language|protocol|accessModelType|authMethodType|trustSignalType|trustSignalStatusType|providerTypeRef|providerStatusType|userStatusType|userRoleType|complaintStatusType|complaintType|complaintSeverityType|reviewType|reviewStatusType|checklistResultType|evidenceType|listingOrigin|submissionSourceType|endpointHealthType|enforcementType|officialAuthorisationStatusType)\." apps/portal/src` returns 0 matches.
- Unit tests cover `listReferenceTable` for all 25 tables and `getReferenceRow` for happy + missing paths.

**Risk:** Trivial. Reference data is read-only and shape-stable. Estimated LOC: ~200 service + ~150 codemod.

### PR 13B — Public discovery reads (migration only, no new services)

**Scope:** ~30 ops in `app/api/resources`, `app/api/providers`, `app/api/well-known`, `app/api/resolve`, `app/api/discover`, `app/registry`, `app/providers`, `app/api/mcp`.

These already have service functions (`listPublicResources`, `findResourceForDetail`, `listPublicProviders`, `findProviderForDetail` — added in PR 5). PR 13B just **migrates the routes to use them** instead of building their own queries.

**Risk:** Medium. The existing service functions need a quick correctness pass against each call site to verify they cover the filters the routes apply today. Some routes may add filter parameters that don't exist on the service yet — add them.

### PR 13C — Portal-self reads (server pages)

**Scope:** ~50 ops in `app/portal`, `app/provider`, `app/verifier`, `app/sovereign` server pages.

**Service surface (sketch):**

```ts
// packages/core/src/lib/services/portal.ts
export async function loadProviderDashboard(actorId: string): Promise<ProviderDashboardView>;
export async function loadMyProvider(actorId: string): Promise<ProviderForOwnerView | null>;
export async function loadMyResources(actorId: string, filters?: {...}): Promise<ResourceForOwnerView[]>;
export async function loadMySubmissions(actorId: string): Promise<SubmissionView[]>;
export async function loadMyContactRequests(actorId: string): Promise<ContactRequestView[]>;
// ... one per portal page that reads owner-scoped data
```

Each function applies the actor-scope predicate internally: a provider can only see their own provider's data. No accidental cross-tenant reads.

**Risk:** Medium. Each portal page has its own composition of joined data; the service has to faithfully reproduce the projection the page expects. Code-review against the existing page is essential.

### PR 13D — Admin reads

**Scope:** ~70 ops in `app/api/admin/*` GET routes and `app/admin/*` server pages.

Mostly list+filter+paginate against each entity. The service shape mirrors `adminListProviders(filters, pagination)`, `adminGetResource(id)`, etc.

**Risk:** Medium. Each list endpoint has its own filter set (`q`, `role`, `status`, `verified`, etc.). The service functions need to accept these and return the same paginated envelope today's routes assemble inline.

### PR 13E — Admin writes (non-governance)

**Scope:** ~15 ops: create/update/delete for User, Provider, Resource, Complaint (excluding lifecycle transitions and review decisions, which go in PR 13F).

**Service surface (per entity):**

```ts
export async function adminCreateProvider(actor: SessionUser, input: AdminProviderInput): Promise<ProviderForOwnerView>;
export async function adminUpdateProvider(actor: SessionUser, id: string, patch: AdminProviderPatch): Promise<ProviderForOwnerView>;
export async function adminDeleteProvider(actor: SessionUser, id: string): Promise<void>;
// ...same shape for Resource, User, Complaint
```

Each write:
1. Validates the input.
2. Performs the write inside a `prisma.$transaction(...)` with a `writeAudit(...)` call in the same transaction.
3. Returns the public-projection view of the updated entity (no raw Prisma row leak).

**Risk:** Medium-high. Writes must preserve every behaviour of today's routes including the unrelated side-effects (email sends, contact-link updates, notification rows). The service does the data work; the route still owns the HTTP shape, email sends, and post-write effects.

This is the sub-PR where the **audit consistency** fix lands. All 14 sites currently doing `prisma.auditLog.create(...)` directly are rerouted through `writeAudit`.

### PR 13F — Governance writes (lifecycle, review, verification)

**Scope:** ~10 ops, all high-stakes:

- `recordReviewDecision(actor, reviewId, decision)` — replaces the body of `/api/admin/reviews/[id]/decide`
- `transitionResourceLifecycle(actor, resourceId, transition)` — replaces `/api/admin/resources/[id]/transition`
- `elevateResource(actor, resourceId, elevation)` — replaces `/api/admin/resources/[id]/elevate`
- `verifyProvider(actor, providerId, decision)` — replaces `/api/admin/providers/[id]/verify`

Each MUST:
1. Call `assertCanReview(actor, target)` — separation-of-duties enforcement, no bypass.
2. Apply the AIR-SPEC §11 review-checklist gate where applicable.
3. Write the audit row in the same transaction.
4. Trigger transactional emails through the email service (PR 9).

**Risk:** High. These are the routes the constitution most carefully protects. A bug here is the kind of bug that contradicts constitution §7. Unit tests + integration tests against the seed database are mandatory.

### PR 13G (optional follow-up) — Lib-helper reads + auth-flow writes

**Scope:** ~32 ops in `lib/portals/notifications.ts`, `lib/portals/search.ts`, `lib/portal/ensure-provider.ts`, `lib/branding.ts`, plus residual auth-flow Prisma calls (user creation in register, user lookup in login) not covered by PR 8's services.

**Risk:** Low-medium. These are shared helpers, well-scoped.

## 5. Sequencing and dependencies

```
13A (reference)  →  13B (public reads)  →  13C (portal-self)  →  13D (admin reads)  →  13E (admin writes)  →  13F (governance writes)
   |                                                                                                            ↑
   +---------- (independent) -----------------------------------------------------------------> 13G (lib + auth)
```

- 13A and 13G can run in parallel; nothing depends on each other.
- 13B–13F should land in order. Each adds vocabulary the next uses.
- Audit consistency (`prisma.auditLog.create` → `writeAudit`) lands as part of 13E.

## 6. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Service function diverges from the route it replaces | Medium | Wrong data returned to UI | Per-PR code review against the original route side-by-side; unit tests; staging deploy + manual smoke |
| Visibility predicate gets duplicated/forgotten | Medium | Public surface leaks data it shouldn't (constitution §5) | One canonical predicate in core/governance; service functions call it, never re-implement |
| Separation-of-duties bypass | Low | Constitution §7 violation | `assertCanReview` is the only path; no `force: true` parameter on any service |
| Audit row written but data write fails | Low | Audit/data mismatch | Every write-service uses `prisma.$transaction` to bundle audit + data |
| Performance regression from service overhead | Low | Latency increase on hot paths | Service functions translate 1:1 to the same Prisma queries today's routes issue; no extra round-trips |
| PR 13F blocked on the 14 raw-audit sites still being out there | Medium | Mixed audit posture on `main` during the transition | 13E's first task: do the `prisma.auditLog.create` → `writeAudit` rewrite as a standalone commit before the bigger service refactor begins |
| Truncated files surfacing again | Low (we restored from recovery) | Build failures | Pre-run the truncation sweep before each sub-PR starts |

## 7. Acceptance criteria for PR 13 overall

PR 13 is **done** when, on `main`:

1. `grep -rE "prisma\.[a-zA-Z]+\." apps/portal/src` returns **zero** matches.
2. The `@/lib/prisma` alias is removed from `apps/portal/tsconfig.json`.
3. No file under `apps/` imports `@airegistry/core/prisma` or `@airegistry/core/generated/prisma` as a value (the `Prisma` namespace type re-export at `@airegistry/sdk/server` stays).
4. `grep -rE "prisma\.auditLog\.create" apps/portal/src` returns zero matches.
5. ESLint `no-restricted-imports` enforces (1) and (4) as a CI check.
6. The seed database integration tests pass.
7. The four role portals (admin, provider, verifier, sovereign) work end-to-end against the seed.

## 8. Effort estimate

| Sub-PR | Service LOC | Codemod LOC | Tests LOC | Total | Calendar (1 eng FT) |
|---|---:|---:|---:|---:|---|
| 13A — reference | ~200 | ~150 | ~200 | ~550 | 2–3 days |
| 13B — public reads | ~50 | ~100 | ~100 | ~250 | 1–2 days |
| 13C — portal-self | ~400 | ~300 | ~300 | ~1000 | 5–7 days |
| 13D — admin reads | ~500 | ~400 | ~400 | ~1300 | 5–7 days |
| 13E — admin writes | ~600 | ~400 | ~600 | ~1600 | 7–10 days |
| 13F — governance writes | ~400 | ~200 | ~600 | ~1200 | 5–7 days |
| 13G — lib + auth tail | ~200 | ~100 | ~200 | ~500 | 2–3 days |
| **Total** | **~2350** | **~1650** | **~2400** | **~6400** | **~5–6 weeks** |

Calendar assumes one engineer full-time. Two engineers could parallelise 13A+13G, 13B+13C, and 13D+13E rear-overlap; that probably collapses to **3–4 weeks**.

## 9. What this plan deliberately does *not* do

- **It doesn't replace Prisma with another ORM.** Service functions still use Prisma internally; only the boundary changes.
- **It doesn't introduce a query DSL.** Service signatures are concrete per use case, not a generic filter builder.
- **It doesn't add caching.** Performance-equivalent to today's routes is the bar.
- **It doesn't change the public REST API at `/api/v1/...`** (still pinned by AIR-SPEC). Internal route handlers are refactored; the HTTP contract is unchanged.
- **It doesn't ship the `plugin-host` runtime.** That's still Phase 6.4 work (after Phase 6.1 is done).

## 10. Pre-flight checklist (before PR 13A starts)

- [ ] Sweep for residual file truncations: `python3 -c "$(scripts/truncation-sweep.py)"` (script to be added in Phase 6.0)
- [ ] Confirm `pnpm --filter @airegistry/portal build` is green on `main`
- [ ] Confirm `pnpm --filter @airegistry/core typecheck` is green
- [ ] Add the ESLint `no-restricted-imports` rule for `@airegistry/core/prisma` and `@airegistry/core/generated/prisma` to `apps/portal/.eslintrc` (warn-only initially; flip to `error` when PR 13 is done)
- [ ] Add a CI job that runs `grep -rE "prisma\." apps/portal/src` and reports the count; baseline at 378 and tracks down across the sub-PRs

---

**See also:** [`import-inventory.md`](./import-inventory.md) §3.1 ("@/lib/prisma — 101 imports") which is the input to this plan; [`extension-point-design.md`](./extension-point-design.md) §3 for the service-function obligations re: extensions.
