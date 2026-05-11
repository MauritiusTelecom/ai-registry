#!/usr/bin/env tsx
/**
 * scripts/smoke-public.ts
 *
 * Phase 5 / T055 - minimal smoke for the public discovery + adapters surface.
 * Exercises:
 *
 *   GET /api/health                 - DB readiness
 *   GET /.well-known/ai-registry    - capability document
 *   GET /api/resources              - list (paginated)
 *   GET /api/resources/[type]/[slug] - first row's detail (when a row exists)
 *   GET /api/resolve?identity=...   - AIR-ID resolve, if a listed AIR-ID exists
 *   POST /api/mcp                   - JSON-RPC initialize + tools/list
 *
 * Usage:
 *
 *   BASE=http://localhost:3002 npm run smoke
 *
 * Exit code is non-zero if any check fails. The script is intentionally
 * dependency-free (only `node:fetch`) so it can run in any CI runner that
 * boots `next start` against a seeded database.
 */

const BASE = process.env.BASE?.replace(/\/+$/, "") ?? "http://localhost:3002";

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];

async function check<T>(
  name: string,
  fn: () => Promise<T>,
  detail?: (v: T) => string
): Promise<T | undefined> {
  try {
    const v = await fn();
    checks.push({ name, ok: true, detail: detail ? detail(v) : "ok" });
    return v;
  } catch (e) {
    checks.push({
      name,
      ok: false,
      detail: e instanceof Error ? e.message : String(e)
    });
    return undefined;
  }
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(`${path} → ${res.status} ${body?.error ?? ""}`.trim());
  }
  return body;
}

async function main() {
  await check("GET /api/health", () =>
    getJson<{ status: string; db: string }>("/api/health").then((v) => {
      if (v.db !== "ok") throw new Error(`db=${v.db}`);
      return v;
    })
  );

  await check("GET /.well-known/ai-registry", () =>
    getJson<{ identityDomain: string; airSpecVersion: string }>(
      "/.well-known/ai-registry"
    ).then((v) => {
      if (v.airSpecVersion !== "0.4") throw new Error(`spec=${v.airSpecVersion}`);
      return v;
    })
  );

  const list = await check(
    "GET /api/resources?limit=5",
    () =>
      getJson<{
        rows: { slug: string; airId: string | null; kind: string }[];
        total: number;
      }>("/api/resources?limit=5"),
    (v) => `total=${v.total}, returned=${v.rows.length}`
  );

  if (list && list.rows[0]) {
    const head = list.rows[0];
    await check(
      `GET /api/resources/${head.kind}/${head.slug}`,
      () =>
        getJson<{ airId: string | null; lifecycle: { code: string } }>(
          `/api/resources/${head.kind}/${head.slug}`
        ),
      (v) => `lifecycle=${v.lifecycle?.code ?? "?"}`
    );

    if (head.airId) {
      await check(
        `GET /api/resolve?identity=${head.airId}`,
        () =>
          getJson<{ airId: string | null }>(
            `/api/resolve?identity=${encodeURIComponent(head.airId!)}`
          ),
        (v) => `airId=${v.airId}`
      );
    }
  }

  await check("POST /api/mcp initialize", async () => {
    const res = await fetch(`${BASE}/api/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {}
      })
    });
    const body = (await res.json()) as {
      result?: { serverInfo?: { name?: string } };
      error?: { message?: string };
    };
    if (!res.ok || !body.result?.serverInfo?.name) {
      throw new Error(`status=${res.status} ${body?.error?.message ?? ""}`.trim());
    }
    return body;
  });

  await check("POST /api/mcp tools/list", async () => {
    const res = await fetch(`${BASE}/api/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list"
      })
    });
    const body = (await res.json()) as {
      result?: { tools?: { name: string }[] };
    };
    const n = body.result?.tools?.length ?? 0;
    if (n < 1) throw new Error(`expected ≥1 tool, got ${n}`);
    return body;
  });

  // ── Report ─────────────────────────────────────────────────────────────────
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    const tag = c.ok ? "PASS" : "FAIL";
    process.stdout.write(`${tag}  ${c.name} - ${c.detail}\n`);
  }
  process.stdout.write(
    `\n${checks.length - failed.length}/${checks.length} checks passed\n`
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  process.stderr.write(`smoke run crashed: ${e instanceof Error ? e.message : e}\n`);
  process.exit(2);
});
