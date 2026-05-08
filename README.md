# airegistry

Sovereign AI Registry — **database shape** for the registry, expressed as Prisma models on PostgreSQL schema `registry`.

## Data model

This repo mirrors the entities documented in [`airegistry-specs/data-model.md`](../airegistry-specs/data-model.md) (§3) and matches the authoritative DDL used by [`ai-registry`](../ai-registry/) at `ai-registry/src/prisma/schema.prisma`. Use this package when you want the registry schema as a **standalone** Prisma project (for migrations, client generation, or sharing DDL without the full Next.js app).

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` (database must allow Prisma multi-schema usage with a `registry` schema).
2. Install and validate:

```bash
npm install
npm run prisma:validate
```

3. Generate the client (writes under `src/generated/prisma` per `schema.prisma`):

```bash
npm run prisma:generate
```

4. Create migrations from this repo with `prisma migrate dev` when you are ready to own migration history here (otherwise treat `ai-registry` as the migration source of truth and sync this file when the reference schema changes).

## Layout

| Path | Purpose |
|------|---------|
| `src/prisma/schema.prisma` | All `registry` models (reference tables + operational tables). |
