# AI Registry — Implementation Plan

**Aligned to:** AIR-SPEC 0.4 (§14–§17, §22); *Decision Makers Guide* v0.4.  
**Purpose:** Phased delivery of an AIR-SPEC–conformant deployment (reference: airegistry.mu), without hardcoding jurisdiction or operator.

**Reference codebase:** [`ai-registry`](../../ai-registry/) — follow [`specs.md`](../../ai-registry/specs.md) (especially §19 architecture, §19.5 API surface, §19.7 visibility, §20 MVP acceptance). Dev server defaults to **port 3002** per [`README.md`](../../ai-registry/README.md).

## Phasing

Five phases; each ends in a demonstrable slice. Phases 1–4 are strongly sequential; Phase 5 parallels hardening and optional adapters.

### Phase 1 — Foundations and data model

- Repository layout suitable for **open-source** norms (README, LICENSE, CONTRIBUTING, SECURITY, GOVERNANCE with scope statement)—per AIR-SPEC §16.
- **Configuration layer** for `portal_domain`, `api_base_url`, `registry_name`, `jurisdiction`, `identity_domain`, `operator_name`, languages, resource types (§4 specification).
- Primary database (PostgreSQL suggested) with migrations; **single source of truth** for schema (ORM such as Prisma is acceptable).
- Seed reference data: jurisdictions, languages, sovereignty bases, resource types, exemplar provider(s) and resources.
- Minimal public shell: home or directory stub proving config + DB connectivity.

**Exit:** App runs locally; seeds load; one smoke test hits the database; **no Mauritius-only hardcoding** in defaults.

### Phase 2 — Authentication and provider identity

- OAuth/OIDC-class sign-in (and optional credentials) for providers and staff; email flows if used.
- Roles for provider vs operator/reviewer/auditor namespaces; session model carrying linkage to `provider_id` where applicable.
- Separation-of-duties hooks at the **application** layer (reviews cannot target own provider record).

**Exit:** New provider completes registration and reaches a protected dashboard or equivalent.

### Phase 3 — Public discovery (portal + REST)

- **Resource directory:** browse, search, filters per AIR-SPEC §13 (type, jurisdiction, capability, provider, sovereignty_basis, status, protocol, language).
- **Resource detail:** full public-safe field set including governance labels and disclaimer (portal + `GET /api/resources/[slug]` in reference).
- **REST:** Implement AIR-SPEC list/detail/resolve/discover semantics. **Reference** exposes JSON under **`/api/...`** (`specs.md` §19.5); optionally mount **`/api/v1/...`** and **`/.well-known/ai-registry`** at the edge for strict AIR-SPEC URL parity.
- Pagination (default 20, max 100), ordering (status priority then `updated_at` desc), rate limits, `Accept-Language` + `Content-Language` on reads.
- Static legal/trust pages consistent with “listing ≠ endorsement” messaging (`specs.md` §19.10 / `src/content/disclaimer.md` in reference).

**Exit:** Unauthenticated visitor completes search → detail → optional resolve; complaint path where product includes `POST /api/complaints`.

### Phase 4 — Provider submission and governance workflows

- Draft → submit pipeline for all four resource types with **sovereignty_evidence** capture and endpoint editor.
- Operator/reviewer UI implementing **§11 checklist** (explicit yes/no captured in storage or audit payload).
- Lifecycle transitions: enforce **elevation rules** (sovereignty_reviewed, official_resource conditions).
- **`writeAudit()`-style** instrumentation on every governance mutation; fields per AIR-SPEC §18.1 (event_id, timestamps, actor, role, action, resource_id, before/after, reviewer notes, correlation ids).
- Provider profile verification states (`unverified` → `verified` → `official_provider` as policy permits).

**Exit:** Operator lists a submitted resource, records review, sees governance fields on public detail; AIR-ID issued at listing-equivalent transition; audit entries visible to authorised roles.

### Phase 5 — Adapters, conformance, hardening

- **MCP:** Reference ships Streamable HTTP at **`/api/mcp`** with tools listed in `specs.md` §19.5 (see `ai-registry/specs/001-ai-registry/contracts/mcp.md`).
- URL/schema validation hardened; optional HEAD/GET probes for broken endpoints (§17 should).
- Automated tests: unit coverage for validators/AIR-ID/resolution; integration or e2e for public discovery, auth, submit flow, review flow, API contracts.
- Operational: backups, health checks, incident/contact documentation; production container story if applicable.

**Exit:** AIR-SPEC **§22 conformance checklist** and acceptance criteria in `specification.md` **plus**, when using `ai-registry`, **`specs.md` §20** (`npm run test`, `npm run test:e2e` on seeded DB) evidenced in CI.

## Architectural decisions

- **REST-first:** MCP/A2A are adapters, not competing sources of truth.
- **Config-driven identity_domain:** Enables any jurisdiction without renaming code paths.
- **Append-only audit:** Matches §18 retention (≥24 months); tamper-evidence strategy (checksums / signed batches) encouraged.
- **Federation:** No MVP worker; schema fields for `origin_registry` reserved.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Trust-signal misuse / self-approval | Role checks + conflict-of-interest on resource provider |
| AIR-ID collision | DB uniqueness + deterministic generation with conflict handling |
| Misleading “official” UX | Strict mapping of `declaration_status` / resource status to UI copy |
| API drift from AIR-SPEC | Contract tests against §13 tables; versioned OpenAPI; document `/api/` vs `/api/v1/` |
| Over-scoping Phase 3 | Ship `.well-known` and resolve early—required for interop |

## Explicitly later (per AIR-SPEC)

- A2A adapter, webhooks, federation sync, automated TAIP posture trees, registry-operated SPIRE.
