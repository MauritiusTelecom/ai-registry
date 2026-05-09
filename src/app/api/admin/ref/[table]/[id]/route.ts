import { NextResponse } from "next/server";
import { requireRole } from "@/lib/portals/auth-gate";
import { getRefTable } from "@/lib/admin/reference-tables";
import { modelFor } from "@/lib/admin/ref-prisma";
import { projectInputs } from "@/lib/admin/ref-payload";
import { prisma } from "@/lib/prisma";
import { prismaErrorResponse, projectRow } from "../route";

/**
 * GET    /api/admin/ref/[table]/[id]   — single row.
 * PATCH  /api/admin/ref/[table]/[id]   — partial update.
 * DELETE /api/admin/ref/[table]/[id]   — hard delete (409 when row is in use).
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const guarded = await ensureAdmin();
  if (guarded) return guarded;

  const { table, id } = await params;
  const config = getRefTable(table);
  if (!config) return notFound(table);

  const row = await modelFor(config).findUnique({ where: { id } });
  if (!row) return notFoundRow();
  return NextResponse.json(projectRow(config, row as Record<string, unknown>));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const guarded = await ensureAdmin();
  if (guarded) return guarded;

  const { table, id } = await params;
  const config = getRefTable(table);
  if (!config) return notFound(table);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { data, errors } = projectInputs(config, body, "update");
  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  try {
    const before = await modelFor(config).findUnique({ where: { id } });
    if (!before) return notFoundRow();
    const updated = await modelFor(config).update({ where: { id }, data });
    await prisma.auditLog.create({
      data: {
        entityType: `ref.${config.id}`,
        entityId: id,
        action: "ref.updated",
        previousValue: projectRow(config, before as Record<string, unknown>) as Record<
          string,
          unknown
        >,
        newValue: projectRow(config, updated as Record<string, unknown>) as Record<string, unknown>
      }
    });
    return NextResponse.json(projectRow(config, updated as Record<string, unknown>));
  } catch (e) {
    return prismaErrorResponse(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const guarded = await ensureAdmin();
  if (guarded) return guarded;

  const { table, id } = await params;
  const config = getRefTable(table);
  if (!config) return notFound(table);

  try {
    const before = await modelFor(config).findUnique({ where: { id } });
    if (!before) return notFoundRow();
    await modelFor(config).delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        entityType: `ref.${config.id}`,
        entityId: id,
        action: "ref.deleted",
        previousValue: projectRow(config, before as Record<string, unknown>) as Record<
          string,
          unknown
        >
      }
    });
    return new Response(null, { status: 204 });
  } catch (e) {
    return prismaErrorResponse(e);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function ensureAdmin(): Promise<Response | null> {
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

function notFoundRow() {
  return NextResponse.json(
    {
      type: "https://airegistry.spec/problem/row-not-found",
      title: "Row not found",
      status: 404
    },
    { status: 404, headers: { "content-type": "application/problem+json" } }
  );
}
