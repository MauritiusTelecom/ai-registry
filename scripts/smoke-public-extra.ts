#!/usr/bin/env tsx
/**
 * scripts/smoke-public-extra.ts
 *
 * Companion to `smoke-public.ts` — exercises public read APIs that do not
 * require admin/provider auth and are not covered by `npm run smoke`.
 *
 *   GET /api/discover?capability=…   (+ missing-param 400)
 *   GET /api/providers
 *   GET /api/openapi
 *   GET /api/jurisdictions
 *   GET /api/languages
 *   GET /api/sectors
 *   GET /api/sovereignty-bases
 *   GET /api/protocols
 *   GET /api/mcp                      (expects 405 per Streamable HTTP stub)
 *
 * Usage:
 *
 *   BASE=http://localhost:3002 npm run smoke:extra
 *
 * Prerequisite: app running (e.g. `npm run dev`) with a migrated + seeded DB.
 * Exit code is non-zero if any check fails.
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
  const body = (await res.json()) as T & { error?: string; title?: string };
  if (!res.ok) {
    throw new Error(`${path} → ${res.status} ${body?.error ?? body?.title ?? ""}`.trim());
  }
  return body;
}

async function expectStatus(
  path: string,
  expected: number,
  init?: RequestInit
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (res.status !== expected) {
    throw new Error(`${path} → expected ${expected}, got ${res.status}`);
  }
  return { status: res.status, body };
}

type RowsResponse = { rows: unknown[]; total: number; generatedAt?: string };

async function main() {
  await check("GET /api/discover (missing capability → 400)", () =>
    expectStatus("/api/discover", 400).then(({ body }) => {
      const p = body as { status?: number; title?: string };
      if (p.status !== 400) throw new Error(`problem.status=${p.status}`);
      return body;
    })
  );

  await check(
    "GET /api/discover?capability=mcp",
    () =>
      getJson<{ capability: string; rows: unknown[]; total: number }>(
        "/api/discover?capability=mcp"
      ).then((v) => {
        if (v.capability !== "mcp") throw new Error(`capability=${v.capability}`);
        if (!Array.isArray(v.rows)) throw new Error("rows is not an array");
        return v;
      }),
    (v) => `total=${v.total}`
  );

  await check(
    "GET /api/providers?limit=5",
    () =>
      getJson<RowsResponse & { counts?: Record<string, number> }>(
        "/api/providers?limit=5"
      ).then((v) => {
        if (!Array.isArray(v.rows)) throw new Error("rows is not an array");
        if (typeof v.total !== "number") throw new Error("missing total");
        return v;
      }),
    (v) => `total=${v.total}, returned=${v.rows.length}`
  );

  await check("GET /api/openapi", () =>
    getJson<{ openapi: string; info: { version: string }; paths: Record<string, unknown> }>(
      "/api/openapi"
    ).then((v) => {
      if (v.openapi !== "3.0.3") throw new Error(`openapi=${v.openapi}`);
      if (!v.paths["/health"]) throw new Error("missing paths./health");
      return v;
    }),
    (v) => `openapi=${v.openapi}, info.version=${v.info.version}`
  );

  await check(
    "GET /api/jurisdictions",
    () => getJson<RowsResponse>("/api/jurisdictions"),
    (v) => `total=${v.total}`
  );

  await check(
    "GET /api/languages",
    () => getJson<RowsResponse>("/api/languages"),
    (v) => `total=${v.total}`
  );

  await check(
    "GET /api/sectors",
    () => getJson<RowsResponse>("/api/sectors"),
    (v) => `total=${v.total}`
  );

  await check(
    "GET /api/sovereignty-bases",
    () => getJson<RowsResponse>("/api/sovereignty-bases"),
    (v) => `total=${v.total}`
  );

  await check(
    "GET /api/protocols",
    () => getJson<RowsResponse>("/api/protocols"),
    (v) => `total=${v.total}`
  );

  await check("GET /api/mcp (SSE stub → 405)", () =>
    expectStatus("/api/mcp", 405, { method: "GET" }).then(({ body }) => {
      const b = body as { transports?: string[] };
      if (!Array.isArray(b.transports) || b.transports.length < 1) {
        throw new Error("missing transports hint");
      }
      return body;
    })
  );

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
  process.stderr.write(
    `smoke:extra run crashed: ${e instanceof Error ? e.message : e}\n`
  );
  process.exit(2);
});
