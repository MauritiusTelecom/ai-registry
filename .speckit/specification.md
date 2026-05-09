# AI Registry — Specification

**Sources:** AIR-SPEC 0.4 MVP Technical Specification (May 2026); *AI Registry: A Guide for Decision Makers* v0.4 (May 2026).  
**Reference deployment:** airegistry.mu (Mauritius Telecom as first reference operator).

**Monorepo:** This folder documents cross-cutting requirements. The **reference implementation** lives in [`ai-registry`](../../ai-registry/) (see [`specs.md`](../../ai-registry/specs.md) for the full operating spec, stack, file layout §19.3, REST/MCP §19.5, visibility §19.7, and MVP acceptance §20).

## 1. Vision and one-liner

The AI Registry is a **sovereign discovery layer**: a publicly listed, locally governed catalogue of locally relevant AI resources with stable identifiers and clear governance metadata. It tells people, developers, and AI systems **what exists, who provides it, why it matters locally, and where to find it**—without hosting workloads, gating access, or standing on the runtime path.

**Principle (three layers):** The registry points. The provider operates. The hosting environment secures.

## 2. Purpose and scope (MVP)

AIR-SPEC defines the minimum viable open-source AI Registry. The registry is a **metadata and discovery platform**. It does not host, execute, authorise, or intermediate listed AI resources.

**MVP objectives**

- Working **public portal** for discovery of sovereign AI resources.
- **Provider submission** for review and listing.
- **Sovereignty test** before publication or status elevation.
- **REST discovery API** for resource metadata.
- Stable **AIR-IDs** under the `air://` URI scheme.
- **Local configuration** for country, city, or sector deployments (no hardcoded jurisdiction).
- **Simplicity** for telcos and governments to deploy quickly.

## 3. Terminology

| Term | Definition |
|------|------------|
| AI Registry | Concept and deployable platform for sovereign AI discovery. |
| AIR-SPEC | Schemas, APIs, configuration, and operating rules. |
| AIR-Core | Generic open-source codebase implementing AIR-SPEC. |
| Reference implementation | Concrete deployment (e.g. airegistry.mu). |
| Provider | Organisation or person responsible for a listed resource. |
| Resource | A model, agent, tool, or skill listed in the registry. |
| Endpoint | External location where the provider states the resource can be accessed. |
| AIR-ID | Registry identifier under `air://`; not a runtime credential. |
| Sovereignty basis | Structured reason the resource is locally relevant. |

**Architecture principles:** Registry-only; open-source; locally governed; protocol-agnostic endpoints; identity-aware but not identity-operating (no SPIRE in registry scope); governance-light at MVP; interoperability-ready schema (including future federation).

## 4. Non-goals (out of scope)

| Out of scope | Rationale |
|--------------|-----------|
| Hosting AI resources | Providers or hosting partners host. |
| Access control for listed resources | Provider governs access. |
| AI / agent gateway | No mediation of tool calls or execution. |
| Runtime execution / orchestration | Not a runtime. |
| Billing, brokering, or commercial transactions | Outside registry scope. |
| Registry-operated SPIFFE/SPIRE | Runtime workload identity belongs to hosting. |
| Legal certification / provider liability | Metadata and status only; no universal correctness guarantee. |
| Mandatory TAIP posture trees | May inform later governance; not MVP. |

Listing is **not** universal endorsement. Status labels distinguish self-declaration, reviewed local relevance, and official-resource authorisation.

## 5. Deployment configuration

AIR-Core MUST be configurable (no jurisdiction hardcoding). Illustrative Mauritius configuration:

| Item | Example | Description |
|------|---------|-------------|
| `portal_domain` | airegistry.mu | Public portal domain. |
| `api_base_url` | `https://airegistry.mu/api/v1` (normative AIR-SPEC) | REST API base; reference app today uses `/api/` without `v1` — see §13. |
| `registry_name` | Mauritius AI Registry | Display name. |
| `jurisdiction` | MU | ISO or local jurisdiction code. |
| `identity_domain` | air.mu | AIR-ID namespace authority. |
| `operator_name` | Mauritius Telecom | Deployment operator. |
| `supported_languages` | en, fr, mfe | Enabled languages. |
| `default_language` | en | Fallback. |
| `resource_types` | model, agent, tool, skill | Accepted types. |

## 6. AIR-ID naming

**Format:**

```text
air://{identity_domain}/{resource_type}/{provider_slug}/{resource_slug}
```

- **Unique** within a deployment; `identity_domain` is configurable per deployment.
- AIR-ID is **not** a certificate, token, credential, or proof of a live workload. Hosting may issue `spiffe://` SVIDs separately.

**Examples:**  
`air://air.mu/model/mt/kreol-llm-v2`, `air://air.mu/tool/gov/mra-tax-calculator`, `air://air.mu/agent/mt/tax-filing-assistant`, `air://air.mu/skill/community/comptable-mu`.

## 7. Resource taxonomy and required fields

| Type | Definition | MVP required fields |
|------|------------|---------------------|
| model | AI/ML model with local data, language, or purpose. | modality, architecture, sovereignty_basis, endpoints. |
| agent | AI system acting in local context. | capabilities, dependencies, endpoints, sovereignty_basis. |
| tool | Callable API/function for a local operation. | input_schema, output_schema, endpoints, sovereignty_basis. |
| skill | Packaged local expertise / knowledge artefact. | domain, regulatory_refs, package_url (optional manifest_url). |

**Sovereignty basis values:** `local_law`, `local_data`, `local_system`, `local_language_culture`.

## 8. Canonical metadata model (summary)

Resources MUST support at minimum: internal `id`; `registry_identity` (AIR-ID); `type`; `name`; optional `name_localized`; `slug`; `description`; optional `description_localized`; `provider_id`; `version`; `jurisdiction`; `sovereignty_basis` (array); `sovereignty_evidence` (array); optional `capabilities`; optional `endpoints`; optional `documentation_url`; **governance** object (§9); **status** (§10); optional `origin_registry` (federation hint); `created_at`; `updated_at`.

**Internationalisation:** Default language in canonical `name` / `description`. Optional maps keyed by ISO 639-1 (or 639-3 where needed). Consumers MAY send `Accept-Language`; fallback to default. For **official_resource**, deployments serving multiple official languages SHOULD require translation for at least one non-default supported language.

**Skills:** Prefer provider-hosted `manifest_url` over large inline manifests; optional inline `contents_manifest` when no hosted manifest exists. Registry does not host or repackage skill binaries.

## 9. Endpoint model

Endpoints reference provider-controlled URLs only. The registry does not proxy, authenticate for the provider, authorise provider calls, or execute them.

Fields: `protocol` (enum: rest, mcp, a2a, grpc, graphql, https, custom); `url`; optional `version`, `transport`; optional `auth_hint` (api_key, oauth2, mtls, public, provider_managed); optional `capabilities`, `metadata`, `terms_url`.

## 10. Governance metadata (MVP)

| Field | Values / type | Role |
|-------|----------------|------|
| `declaration_status` | self_declared, registry_reviewed, official_resource, externally_reviewed | How to interpret the listing. |
| `sovereignty_review_status` | pending, passed, failed, not_required | Local relevance review outcome (§11). |
| `provider_verification_status` | unverified, verified, official_provider | Provider identity posture. |
| `last_reviewed`, `next_review_due` | datetime / null | Review cadence. |
| `reviewer` | string / ref / null | Who reviewed. |
| `evidence_links` | array | Supporting documentation. |
| `notes_public`, `notes_internal` | text / null | Public vs internal notes. |

Future optional extensions (TAIP-inspired claims, controls, assessments) do not alter MVP conformance.

## 11. Provider and resource lifecycle

**Provider:** `unverified` → `verified` → optionally `official_provider`; `suspended` blocks publishing/updating.

**Resource (AIR-SPEC shorthand):** `draft` → public listing → optional elevated sovereignty / official semantics → `deprecated` (still visible with warning); `removed` (not publicly listed).

**Reference lifecycle (`ai-registry`, `specs.md` §8.1):** `DRAFT` → `SUBMITTED` → `IN_REVIEW` → `LISTED`, plus `NEEDS_UPDATE`, `SUSPENDED`, `DEPRECATED`, `REMOVED`. Map these codes to AIR-SPEC narrative states in APIs and docs. AIR-ID is issued when the resource reaches **`LISTED`** (publication).

**Elevation rules (normative):**

- `listed` → `sovereignty_reviewed`: passed §11 checklist and recorded reviewer.
- `sovereignty_reviewed` → `official_resource`: `provider_verification_status = official_provider` and explicit endorsement evidence.
- Material changes to sovereignty_basis, sovereignty_evidence, jurisdiction, or **version** trigger **re-review**.

## 12. Sovereignty review rubric (§11 normative)

**Required submission inputs:**

- ≥1 sovereignty_basis value.
- `sovereignty_evidence` with ≥1 substantive reference.
- Jurisdiction aligned with deployment or explicit cross-jurisdiction note.

**Evidence reference shape:** `type` ∈ law, regulation, dataset, institution, language_asset, cultural_artefact, other; `reference` (citation/id); optional `url`; `notes`.

**Reviewer MUST answer yes/no before `sovereignty_review_status = passed`:**

1. Cited basis matches a recognisable category (law, data, system, language/culture)?
2. Evidence is specific (named law, dataset, institution, language) not generic fluff?
3. Described behaviour actually exercises the cited basis?
4. Scope matches declared jurisdiction (no overclaim)?
5. Factual claims needing provider re-confirmation flagged?
6. Distinguishable from a generic global resource of the same type?

Failed items → `failed` with notes; provider may revise and resubmit.

## 13. Discovery API (REST)

Public discovery SHOULD be readable without authentication where policy allows; submission and admin require authentication.

**Normative routes (AIR-SPEC, relative to configurable API base, e.g. `/api/v1`):**

| Method | Endpoint | Purpose | Public |
|--------|-----------|---------|--------|
| GET | `/resources` | List/search resources | yes |
| GET | `/resources/{type}` | By type | yes |
| GET | `/resources/{type}/{slug}` | Detail | yes |
| GET | `/resolve?identity={uri}` | Resolve AIR-ID | yes |
| GET | `/discover?capability={tag}` | By capability tag | yes |
| GET | `/.well-known/ai-registry` | Registry metadata & capabilities | yes |
| POST | `/provider/resources` | Submit resource | no |
| PATCH | `/provider/resources/{id}` | Provider update | no |
| POST | `/admin/reviews/{id}` | Record review decision | no |

**Reference implementation (`ai-registry`, `specs.md` §19.5 — parallel JSON REST under Next `/api/`):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Liveness + DB |
| GET | `/api/resources` | List published resources (filters) |
| GET | `/api/resources/[slug]` | Resource detail |
| GET | `/api/providers` | List providers |
| GET | `/api/providers/[slug]` | Provider detail |
| GET | `/api/jurisdictions` | Reference data |
| GET | `/api/sectors` | Reference data |
| GET | `/api/languages` | Reference data |
| POST | `/api/complaints` | Public complaint |
| GET/POST | `/api/auth/[...nextauth]` | Auth |

Provider mutations and admin actions are additionally exposed via **server actions** and **route handlers** under `/api/dashboard/…` and `/api/admin/…` (see `specs.md` §19.3). A deployment MAY front the same behaviour at `/api/v1/...` via rewrite. **`/.well-known/ai-registry`** is specified by AIR-SPEC; add when conforming the public host.

**Search filters:** type, jurisdiction, capability, provider, sovereignty_basis, status, protocol, language.

**Pagination:** Cursor or offset; default page size 20, max 100; total count and pagination metadata in responses.

**Default sort:** Status priority (`official_resource` > `sovereignty_reviewed` > `listed`), then `updated_at` descending.

**Rate limiting:** Required on public list/search; standard rate-limit response headers.

**Localisation:** `Accept-Language` on read paths; respond with `Content-Language`; fallback to default.

## 14. Protocol adapters

Adapters are **read-only views** over the same metadata.

| Adapter | MVP |
|---------|-----|
| REST under `/api/v1` (normative) or `/api/` (reference) | Required |
| `/.well-known/ai-registry` | Required by AIR-SPEC; wire on public host when shipping conformance |
| MCP — Streamable HTTP at **`/api/mcp`** (`ai-registry`) | Shipped in reference; tools per `specs.md` §19.5 and `specs/001-ai-registry/contracts/mcp.md` |
| A2A / agent-card style | Later |

## 15. Personas (for backlog and UX)

- **Visitor:** Browse/search/resolve resources; read governance labels; MAY submit complaints without an account where offered.
- **Provider:** Register, maintain profile and resources, attach evidence/endpoints, request reviews.
- **Registry operator:** Triage submissions, statuses, completeness, deprecation/removal.
- **Sovereignty reviewer:** Apply §11 checklist; MUST NOT approve own submissions (separation of duties).
- **Provider verifier / official authority roles:** Identity verification and official-resource endorsement per policy.
- **Auditor:** Read governance/audit artefacts as permitted.

## 16. User stories (derived from AIR-SPEC §17 MVP)

Stories are labelled **must** unless noted. Implementation MAY map statuses and roles to AIR-SPEC enums above.

### Public discovery

- **US-D01 (must).** Visitor can browse a directory with search/filter (type, jurisdiction, sovereignty basis, capability, provider, protocol, language, status).
- **US-D02 (must).** Visitor can open a resource detail page: metadata, provider, sovereignty basis, evidence summaries safe for public display, endpoints, governance status, disclaimer—not implying universal endorsement.
- **US-D03 (must).** Visitor can resolve an AIR-ID to metadata via REST.
- **US-D04 (must).** Client can retrieve registry capability metadata via `/.well-known/ai-registry` (or equivalent documented capability document until that route is mounted).

### Providers

- **US-P01 (must).** Provider can register and manage account/profile.
- **US-P02 (must).** Provider can draft and submit models, agents, tools, skills with sovereignty_basis and sovereignty_evidence.
- **US-P03 (must).** Provider can maintain endpoints (protocol, URL, hints) without the registry executing calls.

### Governance and admin

- **US-G01 (must).** Operators can approve/reject/request changes with reviewer checklist captured for sovereignty review.
- **US-G02 (must).** System enforces lifecycle rules and distinguishes `official_provider` from `official_resource`.
- **US-G03 (must).** Audit log satisfies §18; providers MAY query their own resource history where policy allows.

### API and interoperability

- **US-A01 (must).** REST list/detail/resolve behave per §13 (pagination, ordering, limits, filters).
- **US-A02 (optional).** MCP (or equivalent) exposes discovery aligned with §14 for MCP-capable listings.

### Internationalisation

- **US-I01 (must).** Canonical model supports `name_localized` / `description_localized` and `Accept-Language` behaviour per §8.

### Security baseline

- **US-S01 (must).** HTTPS, RBAC, URL/schema/metadata validation, clear status labelling, backup guidance, deprecation/removal workflows, disclosure contact (§18).

## 17. Non-functional requirements

- **Accessibility:** WCAG 2.1 AA on public surfaces where a web portal is used.
- **Performance:** AIR-SPEC does not prescribe ms budgets; deployments SHOULD meet local SLOs; list endpoints SHOULD remain responsive under pagination limits.
- **Observability:** Health checks SHOULD cover DB/config; structured logging recommended.
- **Data minimisation:** Avoid storing secrets for external provider resources unless strictly necessary.

## 18. Federation (non-MVP)

Not required for MVP. Schema retains `origin_registry` and AIR-ID global addressing. Principles: bilateral explicit trust; metadata-only; **no transitive** federation trust; runtime identity stays with hosting/provider.

## 19. MVP conformance checklist (AIR-SPEC §22)

Conformance claims MUST satisfy:

- Configurable portal and identity domains.
- Types: model, agent, tool, skill.
- Sovereignty basis + §11 rubric implemented.
- Stable `air://` AIR-IDs.
- Public detail with localisation support.
- REST discovery + resolve (and /.well-known as specified).
- Pagination, ordering, rate limits on lists.
- Provider and resource lifecycles; distinction of official_provider vs official_resource.
- Audit log ≥24 months retention (§18).
- URL and metadata validation.
- Governance UX does not imply universal legal approval unless status says official.
- No mandatory registry SPIRE or TAIP.
- Deployable **without hardcoded Mauritius values** via configuration.
- Open-source governance docs: licence, GOVERNANCE.md (scope), CONTRIBUTING.md, SECURITY.md.

## Acceptance criteria

The MVP is **accepted** when all **must** items in §17 (AIR-SPEC) and §19 herein are demonstrated on a seeded deployment—including public discovery, detail, resolve/.well-known, provider submit path, sovereignty checklist capture, AIR-ID issuance at listing-equivalent transition, REST behaviour, audit retention policy, and localisation hooks—and automated tests covering the critical paths are passing.

When the implementation under test is **[`ai-registry`](../../ai-registry/)**, also satisfy **[`specs.md`](../../ai-registry/specs.md) §20** (thirteen enumerated MVP checks including portal, trust signals, MCP parity with REST, complaints, disclaimer, seed coverage, `npm run test` and `npm run test:e2e`).
