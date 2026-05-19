# AI Registry

**Open-source infrastructure for sovereign AI discovery.**

AI Registry is an open specification and a generic open-source platform that any country, city, telco or trusted public digital infrastructure operator can deploy to create a sovereign registry of locally relevant AI resources. It lists, identifies, describes and helps discover those resources. It does not host, execute, authorise or intermediate them.

The reference implementation is [airegistry.mu](https://www.airegistry.mu), operated by Mauritius Telecom.

## What this is

A national or municipal AI Registry tells people, developers and AI systems what sovereign AI resources exist, who provides them, why they are locally relevant, and where to find them. It exposes structured metadata and stable identifiers, but does not sit on the runtime path between consumer and provider.

> The registry points. The provider operates. The hosting environment secures.

Three resource types are covered: **models** (trained or tuned with local data, language or purpose), **agents** (AI systems that perform tasks in a local context) and **skills** (packaged local expertise that AI systems can load and use). Each must meet a published sovereignty test against local law, data, systems or language and culture.

## Status

This repository is at **v0.4 (working draft)**. The specification is stable enough to deploy a reference implementation and stress-test it with partners, but is expected to evolve through v0.5 (partner feedback) to v1.0 (public launch). Expect breaking changes during this phase.

## Documentation

The illustrated whitepaper is the canonical introduction: what the registry is, why it matters, how it works, and what is in and out of scope.

- [`docs/AI_Registry_Whitepaper_Illustrated_v0.4.docx`](docs/AI_Registry_Whitepaper_Illustrated_v0.4.docx)

Other artefacts (concept whitepaper, technical specification, presentation deck, prior versions) live alongside it in `docs/` and `docs/archive/`.

## Architecture in one line

```
air://{identity_domain}/{resource_type}/{provider_slug}/{resource_slug}
```

For example: `air://air.mu/skill/gov/mra-tax-calculator`. The `air://` URI scheme is dedicated to registry identifiers and is intentionally separate from SPIFFE's `spiffe://`, which remains reserved for runtime workload identity.

## Quick start

> The codebase is being open-sourced. This section describes the intended deployment shape; specific commands will land alongside the first tagged release.

A deployment is a single configurable application:

1. Clone this repository.
2. Create a country or city configuration in `configs/countries/<jurisdiction>.json` (see `mu.example.json` for the Mauritius reference).
3. Build and run the platform with Docker. The default entry point is `apps/web`, which serves both the public portal and the discovery API at `/api/v1`.
4. Configure provider authentication, set up reviewer roles, and seed your first three to five sovereign resources.

A complete operator playbook will live under `docs/deployment/` once the repository is published.

## Repository layout

```
apps/web              public portal and admin console
apps/api              discovery API service (when split)
packages/schema       AIR-SPEC JSON schemas
packages/adapters     REST, MCP, A2A and future views
configs/countries     per-jurisdiction configuration
docs                  whitepapers, specification, deck
examples              sample resources, providers, skills
docker                container definitions
```

The codebase is generic. Country-specific values (identity domain, portal name, operator, languages) live in configuration, not in code. The Mauritius implementation is one configuration of the same platform.

## What is in scope

Public resource directory and search; resource detail pages; provider onboarding and submission workflow; admin review workflow; sovereignty review process; REST discovery API; configurable jurisdiction; AIR-ID issuance; localisation; audit logging.

## What is out of scope

Hosting AI resources; runtime execution; AI Gateway or Agent Gateway; access control for third-party resources; marketplace, billing or commercial transactions; registry-operated SPIRE or runtime SVID issuance; legal certification or provider liability management. The registry-only boundary is part of the product.

## Contributing

Contributions are welcome from telcos, government digital agencies, sovereign cloud operators, public-interest technology foundations, regional standards bodies, and individual developers. See `CONTRIBUTING.md` for the contribution process and `GOVERNANCE.md` for the working-group structure (both arriving with the first tagged release).

The project is governed under the principle of open code, local control and sovereign discovery. Code changes that breach the registry-only boundary will be declined.

## Licence

Intended licence: Apache 2.0. The final `LICENSE` file ships with the first tagged release.

## Reference implementation

The Mauritius reference implementation is at [airegistry.mu](https://www.airegistry.mu), operated by Mauritius Telecom. It is one deployment of this codebase, configured for Mauritius. Other jurisdictions are encouraged to stand up their own.

## Acknowledgements

AI Registry was spearheaded by Mauritius Telecom and is being shaped together with peers across the digital public infrastructure community. The list of co-creating organisations will grow as the working group forms.
