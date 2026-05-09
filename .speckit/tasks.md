# AI Registry — Task Breakdown

**Traceability:** Tasks map to AIR-SPEC 0.4 §17 (MVP build requirements), §12–§14 (API/adapters), §18 (audit/security), and §22 (conformance). IDs are stable for planning; adjust estimates per team.

## Phase 1 — Foundations

- **T001** — Repository bootstrap: package manifest, TypeScript/build config, lint/format, env samples; **no jurisdiction hardcoding** in app defaults.
- **T002** — **Configuration module** (`registry_name`, `portal_domain`, `api_base_url`, `jurisdiction`, `identity_domain`, `operator_name`, `supported_languages`, `default_language`, `resource_types`) with validation + sample deploy configs.
- **T003** — Database schema authoring + initial migration covering resources, providers, endpoints, sovereignty evidence, governance block, audits, locales.
- **T004** — DB client singleton and migration runner in CI.
- **T005** — Seed script: taxonomies + ≥1 exemplar provider with one resource per type (model/agent/tool/skill) and evidence stubs.
- **T006** — Public layout shell: landmark structure, footer with registry disclaimer posture (“listing ≠ endorsement”).
- **T007** — Dev orchestration (e.g. Docker Compose for PostgreSQL) and `README` quickstart.

## Phase 2 — Identity and access

- **T010** — Auth integration (OAuth/OIDC + optional password) and session wiring (`user_id`, roles, optional `provider_id`, onboarding flag).
- **T011** — Registration, verification (if email), password reset (if applicable), onboarding to provider profile.
- **T012** — Route/middleware gates for provider dashboard and admin/reviewer areas.
- **T013** — Notification/email helpers with safe dev fallbacks (e.g. log link when SMTP absent).

## Phase 3 — Public discovery

- **T020** — Directory route: full-text or DB search + facet filters (type, jurisdiction, sovereignty_basis, capability, provider, status, protocol, language).
- **T021** — Resource detail page: metadata, provider, public evidence, endpoints, governance panel, AIR-ID display + copy, deprecation banner when applicable.
- **T022** — **REST `GET` list/search** under configured API base with pagination (20/100), sort order per spec, rate-limit headers.
- **T023** — **REST `GET` resource by type + slug**; hydrate localisation from `Accept-Language`.
- **T024** — **`GET /resolve`** (or equivalent) mapping `air://` URI to record; 404 vs 410 semantics defined.
- **T025** — **`GET /discover?capability=`** filter implementation.
- **T026** — **`GET /.well-known/ai-registry`** JSON document (version, supported resource types, API base, operator contact hints per policy).
- **T027** — Reference data APIs as needed (jurisdictions, sectors, languages) if exposed to integrators.
- **T028** — Optional public complaint intake (if in product scope) with PII minimisation.

## Phase 4 — Provider and governance

- **T030** — Provider dashboard: profile editor, verification request hooks.
- **T031** — Resource CRUD (draft), type-specific fields (model/agent/tool/skill), sovereignty_basis + evidence editor, endpoint editor.
- **T032** — Submit for review transition; immutable AIR-ID components after listing-equivalent publish.
- **T033** — **Admin review queue** with **§11 checklist** UI (six yes/no + notes) persisting to DB/audit.
- **T034** — Status engine aligned to deployment: reference **`ai-registry`** uses `DRAFT` → `SUBMITTED` → `IN_REVIEW` → `LISTED` plus `NEEDS_UPDATE`, `SUSPENDED`, `DEPRECATED`, `REMOVED` (`specs.md` §8.1); trust-signal and official-authorisation flows sit alongside lifecycle.
- **T035** — Provider verification workflow (`unverified`/`verified`/`official_provider`) and conflict-of-interest checks on review APIs.
- **T036** — Official-resource elevation only when policy + evidence satisfied.
- **T037** — **Audit module** (`writeAudit`): append-only writes on all governance mutations; retention policy documented (≥24 months).
- **T038** — Taxonomy admin (jurisdictions, languages, tags) if not file-backed only.

## Phase 5 — Adapters, quality, release

- **T050** — **OpenAPI** (or equivalent) published for public discovery + authenticated provider/admin subsets.
- **T051** — **Health** endpoint: DB + migration status.
- **T052** — **MCP** Streamable HTTP (reference: **`/api/mcp`**) with tools matching REST discovery (`specs.md` §19.5, `ai-registry/specs/001-ai-registry/contracts/mcp.md`).
- **T053** — Validators: AIR-ID format, URL safety, JSON schema hooks for tool I/O declarations.
- **T054** — **Optional** endpoint reachability probe job (HEAD/GET) with non-destructive flagging.
- **T055** — Automated tests: contract tests for §13 behaviour; e2e for browse → detail → resolve; provider submit → review → public visibility.
- **T056** — Production image/build, reverse-proxy notes (`api_base_url`, TLS, rate limits).

## Documentation and governance artefacts

- **T100** — `GOVERNANCE.md` with maintainers, decision process, and **explicit out-of-scope** list (AIR-SPEC §3/§16).
- **T101** — `SECURITY.md`, `CONTRIBUTING.md`, roadmap section for federation vs MVP.
- **T102** — Conformance checklist (§22) as a reviewer worksheet or CI checklist document in-repo.

## Cross-cutting

- **T200** — Internationalisation plumbing: persisted `name_localized`/`description_localized`, `Accept-Language` resolution helpers shared by REST and SSR.
- **T201** — Structured logging (`pino`; `specs.md` §19.8) with request correlation IDs matching audit entries.
