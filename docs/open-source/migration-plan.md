# Migration Plan: Open-Source Refactor

**Status:** Draft for discussion
**Owners:** Core team
**Companion docs:** [`extension-point-design.md`](./extension-point-design.md), [`open-source-readiness.md`](./open-source-readiness.md)
**Aligns with:** `ai-registry-specs/.speckit/implementation_plan.md` — this plan is **Phase 6 (Open-Source)**, sequenced after the Phase 4 / Phase 5 work currently in flight.

## 1. Target shape (recap)

```
ai-registry/
├── apps/
│   ├── public/            ← split out of apps/portal
│   └── portal/            ← admin + provider + verifier + sovereign (auth-gated)
├── packages/
│   ├── core/              ← kernel (existing, tightened boundary)
│   ├── sdk/               ← public contract (existing, expanded)
│   ├── plugin-host/       ← NEW, runtime extension loader
│   ├── portal-kit/        ← NEW, shared portal chrome
│   └── ui-kit/            ← existing
├── extensions/
│   ├── official/
│   └── examples/
└── (ai-registry-specs/    ← unchanged sibling repo)
```

## 2. Guiding principles

1. **The app never breaks.** Every phase is mergeable to `main` and deployable in isolation. No long-running branches.
2. **Boundary-first.** Tighten import rules before moving code. A `no-restricted-imports` lint fence catches violations cheaply.
3. **One concern per phase.** Don't split apps and introduce the plugin host in the same phase.
4. **Reversible.** Every phase has a documented rollback. Database migrations are forward-and-back testable.
5. **Specs first.** Any contract change lands in `ai-registry-specs/` before code.

## 3. Phase 6.0 — Pre-work (1 week)

**Goal:** clear the runway, no production behavior change.

1. Update `ai-registry-specs/.speckit/constitution.md` if any guardrail needs amendment for the open-source split (likely none).
2. Add `ai-registry-specs/.speckit/extension-architecture.md` — the normative version of [`extension-point-design.md`](./extension-point-design.md). The doc in this folder is the engineering view; the spec is the contract version.
3. Inventory all imports from `apps/portal` into `packages/core/src/lib/...` that bypass the SDK. List them in `docs/open-source/import-inventory.md`. Each one is a future tightening task.
4. **Rewrite internal `@/*` aliases inside `packages/core/src/` and `packages/sdk/src/` to relative paths.** This is a **hard precondition for Phase 6.1** and was missed in the original draft of this plan. See §3.1 below.
5. Pick the open-source license file location (`LICENSE` exists at repo root — confirm SPDX header matches what's in `package.json`).
6. CI: add a job that runs `pnpm -w build` and `pnpm -w test` on PRs. If not present, this is a hard prerequisite.

**Rollback:** trivial; nothing structural changes.

### 3.1 Why internal `@/*` aliases must be relativised first

The prior monorepo migration (see `MIGRATION.md`) moved files into `packages/core/` but left their internal imports written as `@/lib/<module>` and `@/generated/<module>`. These resolve correctly when `packages/core` is typechecked standalone because `packages/core/tsconfig.json` declares `"@/*": ["./src/*"]`. They **also** resolve when bundled into `apps/portal` because `apps/portal/tsconfig.json` historically aliased each `@/lib/<module>` directly to `../../packages/core/src/lib/<module>`. That second resolution is what Turbopack uses when it walks the import graph across package boundaries — it consults the **importing app's** tsconfig, not the file's home package.

The moment Phase 6.1 starts deleting alias rows from `apps/portal/tsconfig.json`, Turbopack falls back to the generic catch-all `"@/*": ["./src/*"]` (still pointing at `apps/portal/src/*`) and looks for the symbol inside `apps/portal/src/lib/<module>` — which doesn't exist. The build breaks with `Module not found: Can't resolve '@/lib/config'` (or similar) for any core file pulled into the portal's bundle graph.

The fix is **per-package and `tsconfig`-agnostic**: rewrite each internal import as a relative path (e.g. `from "@/lib/config"` becomes `from "./config"` or `from "../config"` depending on the file's depth). Relative paths work in both contexts — standalone core typecheck **and** cross-package bundling — without depending on alias maps.

**How to find them:**

```bash
grep -rn "^import.*from ['\"]@/" packages/core/src packages/sdk/src
```

Any match is a leak. Mechanical rewrite (Python or `jscodeshift`) handles them in one pass. There were 7 in the initial pre-work run, including:

- `packages/core/src/lib/email.ts` → `from "./config"`
- `packages/core/src/lib/email/transactional-send.ts` → `from "../email"`
- `packages/core/src/lib/audit/write-audit.ts` → `from "../prisma"`
- `packages/core/src/lib/auth/current-user.ts` → `from "../config"`, `from "../prisma"`
- `packages/core/src/lib/auth/session.ts` → `from "../config"`
- `packages/core/src/lib/contacts/link-to-user.ts` → `from "../../generated/prisma"`

If you skip this step, Phase 6.1 will surface the same error mid-PR. (It did the first time we ran the plan.)

## 4. Phase 6.1 — Boundary tightening (1–2 weeks)

**Goal:** make `apps/portal` consume `packages/core` only through `@airegistry/sdk`. This is the precondition for every subsequent phase.

1. For each entry in the import inventory: either move the symbol to `packages/sdk`, or wrap it in a service function the SDK re-exports. Avoid blanket re-export — choose what's contract.
2. Add ESLint rule:
   ```json
   "no-restricted-imports": ["error", {
     "patterns": [
       { "group": ["@airegistry/core/*"], "message": "Apps must import from @airegistry/sdk only." }
     ]
   }]
   ```
   Apply this rule to `apps/portal` and (future) `apps/public`. Not to `packages/plugin-host`.
3. Add a CI step that fails if `apps/*/src` files import from `@airegistry/core`.
4. Audit `packages/sdk/src/index.ts` — every export is a SemVer commitment. Mark internal-ish exports `@internal` or hide them.

**Checkpoint:** `grep -r "@airegistry/core" apps/` returns nothing in `src/`.

**Rollback:** revert the lint rule and the import rewrites. No runtime change to roll back.

**Risk:** medium. Easy to break a non-obvious import chain. Mitigation: change in PRs no larger than one feature surface (auth, discovery, admin, etc.).

## 5. Phase 6.2 — Extract `portal-kit` (1 week)

**Goal:** the shared portal chrome (`PortalShell`, `PortalLayoutChrome`, `PortalSidebar`, `StatusPill`, `DataTable`) becomes its own package so both today's portal app and tomorrow's split apps can consume it.

1. `pnpm create-package packages/portal-kit` with the same tsconfig pattern as `packages/ui-kit`.
2. Move `apps/portal/src/components/portals/*` → `packages/portal-kit/src/`.
3. Move `apps/portal/src/lib/portals/*` (the sidebar group config) → `packages/portal-kit/src/config/`. Each role still exports its own group set; portal-kit just owns the types.
4. Update imports in `apps/portal`. Run typecheck. Ship.

**Checkpoint:** portal app still renders all four role portals; visual diff is zero.

**Rollback:** move files back. The package boundary is the only thing introduced.

**Risk:** low. Mostly file moves with import rewrites.

## 6. Phase 6.3 — Split `apps/portal` into `apps/public` + `apps/portal` (2–3 weeks)

**Goal:** the public-facing site and the authenticated portals become separate Next.js apps. This is the biggest structural change; do not combine with any other phase.

### 6.3.1 Strategy

Keep the existing app as `apps/portal`. Create a new `apps/public` and **move** public routes into it. Public routes today:

```
/                  /docs           /governance       /ecosystem
/login             /register       /registry         /providers
/contact           /privacy        /acceptable-use   /audit-log
/terms             /whitepaper
```

Portal routes (stay in `apps/portal`):

```
/admin/*           /provider/*       /verifier/*
/sovereign/*       /portal/*
```

Decide where `/login` and `/register` live. Recommendation: **`apps/public`** owns them and redirects to portal on success. This keeps the portal app fully authenticated.

### 6.3.2 Steps

1. Scaffold `apps/public` from the same Next.js 16 + React 19 template as `apps/portal`. Same tsconfig, same lint, same `@airegistry/*` workspace deps.
2. Reuse `packages/ui-kit` and (where needed) `packages/portal-kit` for the auth shell only.
3. Move public route folders into `apps/public/src/app/`. **Don't delete from `apps/portal` yet** — leave them in place and add a 308 redirect from portal-app public paths to public-app public paths. This lets you ship the new public app while the portal still answers the old URLs as a fallback.
4. Update deploy config: `apps/public` deploys to the root domain, `apps/portal` deploys to `portal.<domain>` (or `/portal/*` via reverse proxy — operator's choice).
5. Once `apps/public` is live and stable for one release cycle, delete the moved routes from `apps/portal`.

### 6.3.3 Database & session

Both apps connect to the same database. Session cookies must be valid across both — use a parent-domain cookie (`.example.org`) or a shared subdomain strategy. Document this in `apps/public/README.md`.

### 6.3.4 Checkpoint per step

- After step 3: both apps build, public routes work from either origin, portal routes work only from portal origin.
- After step 5: portal app no longer serves public routes.

**Rollback:** if the public app is failing in production, switch DNS back to the portal app (which still serves the routes until step 5). This is why we don't delete early.

**Risk:** high. Mitigations: DNS-level rollback path, dual-serving window, careful session-cookie testing in staging.

## 7. Phase 6.4 — Introduce `plugin-host` (2–3 weeks)

**Goal:** stand up the runtime described in [`extension-point-design.md`](./extension-point-design.md). Ship with one trivial example plugin.

1. `pnpm create-package packages/plugin-host`. Depends on `@airegistry/core` (only host can) and `@airegistry/sdk`.
2. Implement manifest loader, validator, and the in-memory registry for routes/slots/cron/MCP/discovery wrappers.
3. Wire `apps/public` and `apps/portal` to read the slot registry. Add the `<Slot id="..."/>` component to ui-kit. Identify the slot IDs to start with: pick three from the catalog in the design doc (e.g. `public.registry.card.badges`, `portal.resource.detail.tabs`, `public.home.hero.below`). Defer the rest.
4. Implement the capability system. Permission grants are read from manifest, enforced at the SDK boundary by a host-installed proxy. Permission denial throws `PluginPermissionError`.
5. Implement audit-event consumer wiring (in-process pub-sub backed by Postgres LISTEN/NOTIFY if cross-process is needed, in-memory otherwise).
6. Implement `ext_<plugin-id>` schema lifecycle: create on install, optional migration on enable, drop on uninstall.
7. Ship `extensions/examples/hello/` — a plugin that adds a badge to registry cards and a tab to the resource detail page. End-to-end test from manifest to rendered DOM.
8. Add `/admin/plugins` page (behind `admin` role) listing loaded plugins, their state, recent errors, and permissions granted.

**Checkpoint:** install the hello plugin, see the badge render. Disable it, see the badge vanish without restart.

**Rollback:** if `plugin-host` is unstable, set `PLUGINS_ENABLED=false` in config. The host short-circuits at startup. The rest of the app runs unaffected.

**Risk:** medium. New runtime surface, but isolated by feature flag.

## 8. Phase 6.5 — Extension catalog hardening (1 week)

**Goal:** flesh out the remaining slot IDs from §5.4 of the design doc, add the validator/serializer-wrapper extension points, document each with a code example.

1. Add the remaining slot IDs to `packages/ui-kit/src/slot.tsx` and place `<Slot/>` in the corresponding pages.
2. Implement the discovery serializer wrap protocol. Test with a wrapper that adds a `ext.demo.score` field.
3. Implement the validator registration protocol. Test with a custom validator on an ext-schema field.
4. Write `docs/open-source/writing-an-extension.md` — the first-class tutorial. Reference the hello example.

**Rollback:** revert the slot additions; the host already tolerates unknown slot IDs (logs a warning).

## 9. Phase 6.6 — Public-launch readiness (parallel with 6.5)

This is the operational track covered fully in [`open-source-readiness.md`](./open-source-readiness.md). At a glance:

- Secrets audit, CI public-friendly, demo `docker compose up`, CONTRIBUTING/GOVERNANCE/SECURITY docs, public roadmap.
- Should land **before** the repo is made public, not after.

## 10. Sequencing summary

| Phase | Title                                  | Duration  | Can run parallel? |
|-------|----------------------------------------|-----------|-------------------|
| 6.0   | Pre-work                               | 1 week    | —                 |
| 6.1   | Boundary tightening                    | 1–2 weeks | Blocks 6.2+       |
| 6.2   | Extract portal-kit                     | 1 week    | After 6.1         |
| 6.3   | Split public / portal apps             | 2–3 weeks | After 6.2         |
| 6.4   | Introduce plugin-host                  | 2–3 weeks | After 6.3         |
| 6.5   | Extension catalog hardening            | 1 week    | After 6.4         |
| 6.6   | Open-source readiness                  | 2 weeks   | Parallel to 6.4–6.5 |

Total elapsed: roughly **8–12 weeks** with one full-time engineer, less with two.

## 11. What this plan deliberately does **not** do

- **Doesn't split portals into separate apps.** Constitution §7 (separation of duties) is enforced in `core/auth`, not by deploying four apps. One portal app with route groups is the right grain.
- **Doesn't replace the database with a microservice architecture.** AIR-SPEC's discovery-only contract makes this unnecessary.
- **Doesn't introduce a marketplace.** Distribution is out of scope for v1.
- **Doesn't change AIR-SPEC.** Public API at `/api/v1/...` stays exactly as specified. Plugin routes live under `/api/ext/...` and are explicitly not part of the spec contract.

## 12. Decision points the team needs to make before Phase 6.3

1. **Subdomain or path-based split?** `portal.example.org` vs `example.org/portal/*`. Affects cookies and reverse proxy config.
2. **Auth ownership.** Does `apps/public` own `/login` and `/register`? (Recommendation: yes.)
3. **CI deployment topology.** One pipeline that builds both apps, or two pipelines? (Recommendation: one; deploy in parallel.)
4. **Plugin feature-flag default.** Ship with `PLUGINS_ENABLED=false` and let operators opt in for v1? (Recommendation: yes.)

---

**Next:** see [`open-source-readiness.md`](./open-source-readiness.md) for the contributor-facing readiness work that runs alongside Phase 6.4–6.5.
