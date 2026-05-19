# Open-Source Readiness Checklist

**Status:** Draft for discussion
**Owners:** Core team + maintainers
**Companion docs:** [`extension-point-design.md`](./extension-point-design.md), [`migration-plan.md`](./migration-plan.md)

## How to use this doc

The refactor in [`migration-plan.md`](./migration-plan.md) is the *structural* part of going open-source. This doc covers everything else — what a contributor sees the first time they land on the repo, and what an operator needs to feel safe self-hosting. Treat each item as a tracked task. The repo should be **fully ready** before flipping visibility to public.

Sections are ordered roughly by what blocks a public launch the hardest.

## 1. Licensing & legal

- [ ] Confirm `LICENSE` at repo root is the intended license. (File exists.)
- [ ] Add SPDX header to all source files via a one-time codemod; enforce going forward with a lint rule (e.g. `eslint-plugin-license-header`).
- [ ] Verify all third-party dependencies are compatible. Run `pnpm licenses list` and review. Flag any GPL / AGPL / SSPL that would compromise the chosen license.
- [ ] Add `NOTICE` if attribution is required by any dependency.
- [ ] Confirm trademark posture. "AIRegistry" — is the name claimed? Document policy in `TRADEMARK.md` (forks may use the code but not the mark).
- [ ] Review constitution.md and AIR-SPEC for any text that needs a contributor license assertion. If yes, decide on DCO vs CLA. **Recommendation:** DCO (Developer Certificate of Origin) — lower friction.

## 2. Secrets & data hygiene

This is the single highest-risk task before the repo goes public.

- [ ] Run `gitleaks detect --source . --redact` across the full git history. Any hits → rotate the credential, then either rewrite history (`git filter-repo`) or accept that the secret is burned and rotated.
- [ ] Audit `.env.example` files — every variable documented, no real values.
- [ ] Audit `prisma/seed.ts` and any fixtures for real provider names, real emails, real jurisdictions. Replace with `Acme Labs`, `dev@example.org`, etc.
- [ ] Check `ai-registry-prototype` and `ai-registry-recovery` repos for anything that shouldn't be public. The prototype is design exploration; the recovery is the pre-refactor snapshot — both may contain breadcrumbs.
- [ ] Decide whether to make `ai-registry-prototype` and `ai-registry-recovery` public at all. **Recommendation:** keep them private; tag the recovery commit in the main repo's history if pre-refactor provenance matters.
- [ ] Add `gitleaks` and `truffleHog` to CI as a pre-merge check.

## 3. Repo hygiene

- [ ] `README.md` at root: one-paragraph what-it-is, screenshot, quickstart link, license badge, link to specs repo. **Not** a wall of text.
- [ ] `CONTRIBUTING.md`: how to file an issue, how to propose a feature (point at `ai-registry-specs/.speckit/`), how to run the test suite, how to sign commits (DCO).
- [ ] `GOVERNANCE.md`: who can merge, how decisions are made, link to the constitution as the architectural anchor. Acknowledge the pilot operator (Mauritius Telecom per constitution §9) and clarify their relationship to the open-source project.
- [ ] `CODE_OF_CONDUCT.md`: Contributor Covenant v2.1 is the default; pick one.
- [ ] `SECURITY.md`: how to report a vulnerability privately. Include a PGP key or a security@ alias. **Don't** ask reporters to use public issues.
- [ ] `SUPPORT.md`: where to ask questions (Discussions vs Issues — pick one for questions).
- [ ] Issue templates under `.github/ISSUE_TEMPLATE/`: bug, feature, security advisory (with redirect to SECURITY.md).
- [ ] PR template under `.github/pull_request_template.md`: link to issue, checklist (tests, docs, audit instrumentation if relevant).
- [ ] `CHANGELOG.md`: adopt Keep-a-Changelog format, or wire up an automated generator (e.g. `changesets`).
- [ ] Labels: standardize on `type:bug`, `type:feature`, `area:portal`, `area:core`, `area:sdk`, `area:plugin-host`, `good first issue`, `help wanted`.

## 4. Documentation site

The README + the specs repo are not enough on their own for an unfamiliar contributor. Pick one:

- **Option A:** Single `docs/` folder with rendered Markdown — simplest, ships with the repo.
- **Option B:** Dedicated docs site (Nextra, Astro Starlight, Docusaurus) — better discoverability, more maintenance.

**Recommendation:** start with Option A under `docs/`, organized as:

```
docs/
├── README.md               ← landing
├── getting-started/
│   ├── quickstart.md
│   ├── docker-compose.md
│   └── architecture.md
├── concepts/
│   ├── constitution.md     ← link to specs repo
│   ├── air-id.md
│   ├── governance.md
│   └── sovereignty.md
├── operating/
│   ├── deployment.md
│   ├── configuration.md
│   ├── observability.md
│   └── backups.md
├── extending/
│   ├── overview.md         ← summary of extension-point-design.md
│   ├── writing-an-extension.md
│   ├── examples.md
│   └── api-reference.md    ← generated from SDK
└── open-source/
    ├── extension-point-design.md   ← this file's siblings
    ├── migration-plan.md
    └── open-source-readiness.md
```

- [ ] Pick A or B, scaffold.
- [ ] Migrate the planning docs in `docs/open-source/` to live alongside the rest.
- [ ] Generate SDK API reference from TypeScript (`typedoc` or similar).
- [ ] Add a "What is AIRegistry?" page that links the AIR-SPEC, the constitution, and the architectural diagram.

## 5. Demo experience

The first impression for an evaluator is "can I `clone` and `run` in under 5 minutes?" If no, attention is lost.

- [ ] `docker-compose.yml` at repo root that brings up: Postgres, the app(s), seed data. Single command.
- [ ] Seed data covers: 3 providers, 8 resources spanning each `ResourceType`, sample reviews, sample sovereignty evidence. Enough to make every page non-empty.
- [ ] Default credentials documented in the quickstart, with an explicit "change these immediately in production" warning.
- [ ] Pre-built container images published to GHCR (or similar) under a permissive pull policy.
- [ ] Demo deployment (`demo.airegistry.example`?) that re-seeds on a schedule. Optional but high-impact.
- [ ] `scripts/dev.sh` (and `dev.ps1` for Windows parity, since the team uses Windows): wraps the pnpm + docker incantations.

## 6. CI / CD made public-friendly

- [ ] Move CI to GitHub Actions (or equivalent) if not already there.
- [ ] Remove any secrets-bearing workflows from the public path; gate them on `if: github.event.pull_request.head.repo.full_name == github.repository` (i.e. internal PRs only).
- [ ] Required checks on `main`: typecheck, lint, unit tests, build, secrets scan, license check.
- [ ] Add a "first-time contributor" workflow: friendly welcome comment, label `first-contribution`.
- [ ] Codecov (or similar) for coverage visibility — even if no enforcement, the badge signals seriousness.
- [ ] Dependabot or Renovate for dependency updates. Group minor updates; auto-merge dev-dep patches.
- [ ] CodeQL for security analysis on every PR.

## 7. Testing posture

The current state per the specs has tests planned in Phase 5 ("Adapters & hardening"). Before going public, make sure:

- [ ] Unit tests cover `packages/core/src/lib/audit/`, `auth/`, `governance/`, `validators/`, `discovery/`. These are the kernel; they need the highest coverage.
- [ ] Integration tests cover the public REST surface (`/api/v1/...`) against the spec.
- [ ] At least one end-to-end test per role portal: log in as that role, perform the primary action.
- [ ] Document how to run tests in `CONTRIBUTING.md` and in the quickstart.
- [ ] Test against the seed database to keep parity with the demo experience.

## 8. Release process

- [ ] Adopt semver. Public commitment: anything in `packages/sdk` is SemVer-protected; anything in `packages/core` internals can break in any minor.
- [ ] Use `changesets` (or equivalent) to manage version bumps across the workspace.
- [ ] Tag releases. Publish to npm if SDK is meant to be consumable outside the monorepo.
- [ ] Maintain a public roadmap (GitHub Projects board pinned to the repo). Tie items to phase numbers in the specs and the migration plan.
- [ ] Define release cadence (recommendation: a minor every 4–6 weeks during active development).

## 9. Observability & operator docs

A self-hoster needs to know what's healthy.

- [ ] Add OpenTelemetry instrumentation to core service functions and to the plugin host's permission grants.
- [ ] Healthcheck endpoint (`/healthz`) on both apps.
- [ ] Document SLOs in `docs/operating/observability.md`: what to alert on (audit-write failures, plugin error rate, session-store errors).
- [ ] Document backup/restore for the database. Reference `scripts/split-databases/` if relevant.
- [ ] Document how to read the audit log for incident response.

## 10. Community on-ramp

This is the difference between a repo that *can* be contributed to and one that *is*.

- [ ] Curate 10–20 `good first issue` tickets before launch. Real fixes, not busywork. Each with reproducer and pointers to the relevant files.
- [ ] Pick a chat venue (Matrix, Discord, GitHub Discussions). Discussions is lowest-friction.
- [ ] Announce on launch with a clear ask: "we want contributors in these areas: extensions, design system, i18n, docs." Vague calls get vague help.
- [ ] Designate maintainers in `CODEOWNERS`. Ownership per package: `packages/core` → core team, `packages/sdk` → core team, `packages/plugin-host` → core team, `extensions/examples/*` → community.
- [ ] Define what "good" looks like for an external PR: small, scoped, with tests, referencing an issue. Document in CONTRIBUTING.md.

## 11. Constitution & spec governance

The specs repo (`ai-registry-specs/`) is your architectural anchor. Going open-source means clarifying how it evolves.

- [ ] Decide: is the spec open-source too? **Recommendation:** yes, same license.
- [ ] Decide: who can amend the constitution? **Recommendation:** RFC process in the specs repo, core-team approval, recorded in `decisions/` with date and rationale.
- [ ] Add `ai-registry-specs/CONTRIBUTING.md` covering the RFC process.
- [ ] Cross-link the constitution from the main repo README so newcomers find it.

## 12. Pre-launch dry run

Before flipping repo visibility:

- [ ] Have a person who hasn't seen the repo run the quickstart. Watch them. Fix every paper cut.
- [ ] Run the full CI suite on a fresh clone from a public-shaped fork.
- [ ] Verify all external links resolve.
- [ ] Verify no internal hostnames or IPs in the codebase.
- [ ] Get sign-off from legal on license and any trademark notices.
- [ ] Pick a launch date with a buffer; don't launch on a Friday.

## 13. Post-launch first 90 days

- [ ] Respond to every issue within 48 hours, even just "thanks, looking into it."
- [ ] Triage labels weekly.
- [ ] Ship one release in the first 30 days to demonstrate the project is alive.
- [ ] Write a "first 90 days" retrospective. Adjust this checklist for v2.

## 14. Scope explicitly out of v1

- Multi-tenancy (one instance, one organization).
- Plugin marketplace.
- Federation across registries (constitution §10 reserves it; deliver in a later major).
- UI theming via plugins (reserved to core).
- Hot-reloading extensions (restart required).

---

**See also:**

- [`extension-point-design.md`](./extension-point-design.md) — what extensions can do, and the contract they get.
- [`migration-plan.md`](./migration-plan.md) — phased structural refactor.
- `ai-registry-specs/.speckit/constitution.md` — the architectural anchor that overrides everything else if there's a conflict.
