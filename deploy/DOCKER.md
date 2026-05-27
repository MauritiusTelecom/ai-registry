# Docker containerisation

How to build and run the AI Registry as a Docker container.

## Quick start

```bash
# Full stack (database + app)
docker compose up -d

# Rebuild after code changes
docker compose up -d --build

# Database only (for local next dev)
docker compose up -d postgres

# Tear down (data persists)
docker compose down

# Tear down including database volume
docker compose down -v
```

## Dockerfile (multi-stage)

The `Dockerfile` at the monorepo root produces a minimal production image using three stages:

| Stage | Base | Purpose |
|-------|------|---------|
| `deps` | `node:20-alpine` | Installs pnpm dependencies (frozen lockfile). Cached independently so code changes don't re-install. |
| `builder` | `node:20-alpine` | Copies source, generates Prisma client, runs `pnpm build`. Produces the Next.js standalone bundle. |
| `runner` | `node:20-alpine` | Contains **only** the standalone server, static assets, and the Node.js runtime. Runs as non-root user `nextjs` (uid 1001). |

### Design decisions

- **Standalone output:** `next.config.mjs` sets `output: "standalone"` with `outputFileTracingRoot` at the monorepo root — bundles all workspace packages and the Prisma client into a self-contained server.
- **Non-root execution:** The final stage runs as user `nextjs` (uid 1001).
- **Alpine base:** Final image is ~150 MB.
- **Port 3002:** Matches the development default.

## Docker Compose services

| Service | Image | Purpose |
|---------|-------|---------|
| `postgres` | `postgres:16-alpine` | Dev database. Creates `airegistry` DB with defaults (user `airegistry`, password `airegistry-dev`). Data persists in a named volume. |
| `app` | Built from `./Dockerfile` | Next.js portal. Waits for postgres health check. Reads `.env` for config. Overrides `DATABASE_URL` to use the compose-internal hostname. |

## Environment variables

The container reads all configuration from environment variables (see `.env.example`). The compose `app` service uses:

1. **`env_file: .env`** — loads the operator's full config.
2. **`environment:` block** — overrides `DATABASE_URL` to use the compose-internal Postgres hostname (`postgres:5432`).

For production without compose, supply env vars through your platform's secret management (Kubernetes secrets, cloud env config, etc.).

## Production notes

- **Run migrations first:** `pnpm prisma:migrate` or `pnpm deploy:db` before starting the container (or use an init container / job).
- The image does **not** run migrations on start — intentional for multi-replica safety.
- **Health check:** TCP probe on port 3002.
- **Horizontal scaling:** The app is stateless (cookie-based sessions), so multiple replicas work behind a load balancer without sticky sessions.

## .dockerignore

Excludes `node_modules`, `.next`, `.turbo`, `.git`, `.env`, and docs from the build context to keep builds fast and avoid leaking secrets into image layers.
