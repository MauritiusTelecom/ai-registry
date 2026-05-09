# AI Registry — Constitution

> Architectural and governance principles derived from **AIR-SPEC 0.4** and the **Decision Makers Guide v0.4**. All AIR-Core implementation SHOULD be consistent with this document. If implementation diverges, update the normative specification (`specification.md`) and this constitution together.

## 1. Core principle

> The registry points. The provider operates. The hosting environment secures.

The AI Registry is a **discovery and governance metadata layer**. It never:

- hosts AI workloads,
- proxies or mediates provider APIs or agent/tool execution,
- issues runtime credentials or SVIDs,
- bills users on behalf of providers,
- guarantees safety, accuracy, or legal correctness of any listing.

It does:

- list resources with **stable AIR-IDs** under `air://`,
- describe **sovereignty bases** and **evidence**,
- expose **lightweight governance metadata** (declaration, sovereignty review outcome, provider verification—kept separable so the registry is not a de-facto universal certifier),
- maintain an **append-only audit trail** of governance-relevant actions,
- expose discovery through a **public REST API** and optional **protocol adapters** (e.g. MCP) that are **views** over the same data.

**Quality over noise:** A small, credible catalogue is preferable to a large generic one (Decision Makers Guide §5).

## 2. Separations (non-negotiable)

1. **Listing vs endorsement.** Public metadata MUST use status labels that distinguish existence, reviewed local relevance, and official-resource authorisation.
2. **Discovery identity vs runtime identity.** AIR-IDs name what is **listed**; `spiffe://` (or other) names what **runs**. The registry operates in the former only.
3. **Local vs federated.** Future mirrored metadata carries `origin_registry` and does **not** silently inherit local trust without explicit policy.
4. **Sovereignty review vs official-resource.** Local relevance review is separate from endorsement by an official provider/competent authority.
5. **Current public face vs audit history.** Public surfaces reflect current authorised state; the audit log preserves superseded decisions.

## 3. Sovereignty discipline

Elevating sovereignty or official status REQUIRES:

- enumerated **sovereignty_basis** values aligned with AIR-SPEC,
- concrete **sovereignty_evidence** references,
- **§11 reviewer checklist** outcomes recorded before `passed` or equivalent,
- **re-review** when sovereignty inputs, jurisdiction, or version changes materially.

Vague tests are out of constitution compliance.

## 4. Stack posture (AIR-SPEC guidance)

Suggested direction (implementations MAY vary if conformance holds):

- **Web:** framework such as Next.js + TypeScript + accessible component primitives.
- **API:** consolidated or split services; MUST expose normative REST behaviour (AIR-SPEC `/api/v1`; reference `ai-registry` uses `/api/` until aliased).
- **Data:** PostgreSQL (or equivalent) with migrations and a single authoritative schema definition.
- **Auth:** OAuth/OIDC-class flows for portal; machine credentials for integrations as needed.
- **Audit:** Governance writes MUST funnel through a documented audit primitive with required fields per AIR-SPEC §18.1.

## 5. Visibility rule (implementations derive concrete predicates)

Public discovery MUST only include resources whose combined **lifecycle**, **provider posture**, and **operator flags** satisfy deployment policy equivalent to:

- lifecycle allows public visibility (`listed`-class paths, `deprecated` with warning, exclude `removed` / withheld states),
- provider not suspended as defined for the deployment.

Exact column names MAY differ from AIR-SPEC labels; behavioural intent MUST match.

## 6. AIR-ID rule (normative form)

```
air://{identity_domain}/{resource_type}/{provider_slug}/{resource_slug}
```

- `identity_domain` is **configuration**, not necessarily the web hostname string.
- AIR-ID issuance MUST occur only when transitioning to an irreversible listed identity (typically first public listing-equivalent transition); thereafter slugs and identity_domain binding are immutable for that record’s AIR-ID stability.
- Uniqueness MUST be enforced in storage.

Why `air://` (not borrowing `spiffe://` alone): avoids conflating **registry identifier** with **runtime credential**, per AIR-SPEC §5 and Decision Makers Guide §3.

## 7. Separation of duties

Governance actors MUST NOT approve or elevate trust on **their own** provider-scoped submissions where policy forbids conflicts. Automated checks SHOULD enforce actor ↔ resource independence for review endpoints.

Providers MAY **request** elevated signals; ONLY authorised governance roles MAY **grant** them.

## 8. Out of scope (permanent boundary)

Remain **out** of AIR-Core mandate:

| Hosting / inference proxying |
| Gatewaying or enforcing rate limits for provider workloads |
| Runtime credential issuance (SPIFFE/SPIRE operation) |
| Billing, payments, or transaction settlement |
| Mandatory universal legal certification or warranty |
| Acting as arbiter of provider liability |

Contribution process (GOVERNANCE.md) SHOULD reject scope creep explicitly.

## 9. Operators and legitimacy (Decision Makers Guide)

Prefer **digital public infrastructure enablers**—operators already trusted at national neutral scale—such as telecoms acting as DPI partners with government legitimacy. Mauritius Telecom pilots the **reference** deployment; forks MUST configure operator and jurisdiction independently.

## 10. Evolution

- **Federation:** Optional later; MVP MUST NOT forbid `origin_registry` and peer metadata patterns AIR-SPEC reserves.
- **TAIP-inspired fields:** Future optional extensions only.

If a planned feature violates §1–§2 or AIR-SPEC §3 non-goals, it MUST be refused or parked outside AIR-Core repositories.
