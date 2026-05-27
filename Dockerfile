# ─── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/portal/package.json ./apps/portal/
COPY packages/core/package.json ./packages/core/
COPY packages/ui-kit/package.json ./packages/ui-kit/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/public/package.json ./packages/public/
COPY packages/plugin-host/package.json ./packages/plugin-host/
COPY extensions/examples/hello/package.json ./extensions/examples/hello/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build the application ──────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/portal/node_modules ./apps/portal/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/ui-kit/node_modules ./packages/ui-kit/node_modules
COPY --from=deps /app/packages/sdk/node_modules ./packages/sdk/node_modules
COPY --from=deps /app/packages/public/node_modules ./packages/public/node_modules
COPY --from=deps /app/packages/plugin-host/node_modules ./packages/plugin-host/node_modules
COPY --from=deps /app/extensions/examples/hello/node_modules ./extensions/examples/hello/node_modules

COPY . .

RUN pnpm prisma:generate
RUN pnpm build

# ─── Stage 3: Production runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/apps/portal/public ./apps/portal/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/portal/.next/static ./apps/portal/.next/static

USER nextjs

EXPOSE 3002

CMD ["node", "apps/portal/server.js"]
