import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { requireRole } from "@/lib/portals/auth-gate";
import { getRefTable } from "@/lib/admin/reference-tables";
import { isPrismaKnownError, modelFor, PrismaErrorCode } from "@/lib/admin/ref-prisma";
import { projectInputs } from "@/lib/admin/ref-payload";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ref/[table]
 *
 * Query params:
 *   q          search (case-insensitive contains across `searchable` fields)
 *   active     "true" | "false" | "all" (only meaningful when the table has the column)
 *   page       1-based, default 1
 *   pageSize   default 20, max 200
 *   sort       field name (default = config.defaultSort.field)
 *   dir        "asc" | "desc"
 *
 * POST /api/admin/ref/[table] - create.
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const guarded = await ensureAdmin();
  if (guarded) return guarded;

  const { table } = await params;
  const config = getRefTable(table);
  if (!config) return notFound(table);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const activeRaw = url.searchParams.get("active") ?? "all";
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20)
  );
  const sortField = url.searchParams.get("sort") ?? config.defaultSort.field;
  const sortDir: "asc" | "desc" = url.searchParams.get("dir") === "desc" ? "desc" : "asc";

  // Build the WHERE clause.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (config.hasActive && activeRaw !== "all") {
    where.active = activeRaw === "true";
  }
  if (q !== "") {
    const searchables = config.fields.filter((f) => f.searchable).map((f) => f.key);
    if (searchables.length > 0) {
      where.OR = searchables.map((key) => ({
        [key]: { contains: q, mode: "insensitive" }
      }));
    }
  }

  const proxy = modelFor(config);
  const orderBy = { [sortField]: sortDir } as Record<string, "asc" | "desc">;

  const [rowsRaw, total] = await Promise.all([
    proxy.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    proxy.count({ where })
  ]);

  const rows = (rowsRaw as Record<string, unknown>[]).map((r) => projectRow(config, r));

  return NextResponse.json(
    {
      rows,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    },
    { status: 200 }
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const guarded = await ensureAdmin();
  if (guarded) return guarded;

  const { table } = await params;
  const config = getRefTable(table);
  if (!config) return notFound(table);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { data, errors } = projectInputs(config, body, "create");
  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  try {
    const created = await modelFor(config).create({ data });
    await prisma.auditLog.create({
      data: {
        entityType: `ref.${config.id}`,
        entityId: (created as { id: string }).id,
        action: "ref.created",
        newValue: data as unknown as Prisma.InputJsonValue
      }
    });
    return NextResponse.json(projectRow(config, created as Record<string, unknown>), {
      status: 201
    });
  } catch (e) {
    return prismaErrorResponse(e);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function ensureAdmin(): Promise<Response | null> {
  // requireRole calls notFound() on missing role - but route handlers return
  // a Response; we bypass by doing the lookup ourselves.
  try {
    await requireRole("admin", { redirectTo: "/admin" });
    return null;
  } catch {
    return new Response(JSON.stringify({ error: "admin required" }), {
      status: 403,
      headers: { "content-type": "application/json" }
    });
  }
}

function notFound(table: string) {
  return NextResponse.json(
    {
      type: "https://airegistry.spec/problem/ref-not-found",
      title: "Reference table not found",
      status: 404,
      detail: `No reference table with id "${table}".`
    },
    { status: 404, headers: { "content-type": "application/problem+json" } }
  );
}

export function projectRow(
  config: { fields: { key: string }[] },
  r: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { id: r.id };
  for (const f of config.fields) out[f.key] = r[f.key];
  if (r.createdAt instanceof Date) out.createdAt = r.createdAt.toISOString();
  if (r.updatedAt instanceof Date) out.updatedAt = r.updatedAt.toISOString();
  return out;
}

export function prismaErrorResponse(e: unknown) {
  if (isPrismaKnownError(e)) {
    if (e.code === PrismaErrorCode.UNIQUE_VIOLATION) {
      return NextResponse.json(
        {
          type: "https://airegistry.spec/problem/unique-violation",
          title: "Duplicate value",
          status: 409,
          detail: "A row with the same unique field already exists."
        },
        { status: 409, headers: { "content-type": "application/problem+json" } }
      );
    }
    if (e.code === PrismaErrorCode.FK_CONSTRAINT) {
      return NextResponse.json(
        {
          type: "https://airegistry.spec/problem/in-use",
          title: "Row is in use",
          status: 409,
          detail:
            "Other rows reference this entry. Toggle `active = false` to retire it without deleting."
        },
        { status: 409, headers: { "content-type": "application/problem+json" } }
      );
    }
    if (e.code === PrismaErrorCode.NOT_FOUND) {
      return NextResponse.json(
        {
          type: "https://airegistry.spec/problem/not-found",
          title: "Not found",
          status: 404
        },
        { status: 404, headers: { "content-type": "application/problem+json" } }
      );
    }
  }
  console.error("ref-table API error", e);
  return NextResponse.json(
    {
      type: "https://airegistry.spec/problem/internal",
      title: "Internal error",
      status: 500
    },
    { status: 500, headers: { "content-type": "application/problem+json" } }
  );
}
