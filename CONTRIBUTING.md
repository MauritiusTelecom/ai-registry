# Contributing to ai-registry

Thanks for your interest. The reference implementation tracks [AIR-SPEC 0.4](../ai-registry-specs/.speckit/specification.md) and the [constitution](../ai-registry-specs/.speckit/constitution.md). This guide describes how to set up a local environment, the contribution flow, and the small set of conventions that keep the codebase consistent across portals.

## Local setup

See [`README.md`](README.md) "Quickstart" for the end-to-end commands. Short version:

```bash
npm install
cp .env.example .env       # then edit DATABASE_URL + deployment config
docker compose up -d postgres
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev                # http://localhost:3002
```

If your edits touch the schema, run `npm run prisma:format && npm run prisma:validate` before opening a PR.

## Contribution flow

1. **Open an issue first** for non-trivial changes. The issue is the place to align on scope before code is written. Issues that touch [`GOVERNANCE.md`](GOVERNANCE.md) §3 ("explicitly out of scope") will be closed.
2. **Branch from `main`.** Use a short kebab-case branch name (e.g. `phase-1/seed-script`, `phase-3/resolve-endpoint`).
3. **Make focused commits.** One commit per logical change; the commit subject should be a sentence in imperative form ("Add config validation for SUPPORTED_LANGUAGES").
4. **Open a PR** with the change description, the AIR-SPEC clause(s) the change traces to (where applicable), and a checklist confirming:
   - `npm run lint` passes;
   - `npm run prisma:validate` passes (if schema touched);
   - `npm run config:validate` passes (if `.env.example` or `src/lib/config.ts` touched);
   - `npm run db:seed` runs to completion against a fresh database (if `src/prisma/seed.ts` touched).
5. **Reviewers** — at least one approval for routine changes; two for schema changes. See [`GOVERNANCE.md`](GOVERNANCE.md) §5 for the full matrix.

## Code conventions

- **No jurisdiction hardcoding.** Anything that varies by deployment (`registry_name`, `jurisdiction`, `identity_domain`, language list, …) must come from `src/lib/config.ts`, never from a literal in code. CI enforces this for known deployment-specific tokens.
- **Audit primitive.** Every governance mutation goes through `writeAudit()` (Phase 4). Direct writes to `AuditLog` are rejected in review.
- **Listing ≠ endorsement.** Public-facing copy must distinguish provider-declared, sovereignty-reviewed, and official-resource states. Don't blur the labels.
- **TypeScript strict mode is on.** `tsconfig.json` `"strict": true`; `any` is allowed only with a justification comment.
- **No new gradients or hex literals in the public UI.** Use the design tokens defined in `src/components/public/styles.css` (and the prototype). See `ai-registry-specs/.speckit/design.md` §3.
- **Prisma reference tables.** Controlled vocabularies are tables (id / code / name / description / active / sortOrder), not Postgres enums — see `src/prisma/schema.prisma` headers.

## Spec changes

If a contribution requires an AIR-SPEC or module spec change, open the spec PR in [`../ai-registry-specs/`](../ai-registry-specs/) **first**, then reference it from the code PR. The reverse order — implementation drives spec — is acceptable only when fixing a clearly-stated bug in the spec.

## Tests

- Unit tests sit next to the file they cover (`foo.test.ts` next to `foo.ts`).
- Integration tests for routes / API live under `src/app/__tests__/`.
- E2E tests (when introduced in Phase 5 / T055) will live under `e2e/`.
- The current test runner is Vitest (configured in Phase 5 — until then, `npm run lint` and `npm run prisma:validate` are the gating checks).

## Code of conduct

We expect contributors to be respectful, patient, and mindful of the global, cross-jurisdiction nature of this project. Conduct that contradicts those values may result in PR closure or contributor blocks at maintainer discretion.

## License

By contributing, you agree your contributions are licensed under the project's [Apache 2.0 license](LICENSE).
