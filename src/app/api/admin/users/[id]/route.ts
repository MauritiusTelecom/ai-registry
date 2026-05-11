import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write-audit";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * PATCH /api/admin/users/:id - edit a user (name / email / role / status /
 *   provider linkage). Email change clears emailVerified + onboardingComplete.
 * DELETE /api/admin/users/:id - hard delete. Refused for the actor's own
 *   account or for the last admin.
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.3.
 */

type Body = {
  name?: unknown;
  email?: unknown;
  roleCode?: unknown;
  statusCode?: unknown;
  providerSlug?: unknown | null;
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    include: {
      role: { select: { code: true, name: true } },
      status: { select: { code: true, name: true } },
      provider: { select: { slug: true } }
    }
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  const before = {
    name: target.name,
    email: target.email,
    role: target.role.code,
    status: target.status.code,
    provider: target.provider?.slug ?? null
  };

  if (typeof body.name === "string") {
    const t = body.name.trim();
    if (t.length < 2) {
      return NextResponse.json({ error: "name too short" }, { status: 400 });
    }
    data.name = t;
  }

  if (typeof body.email === "string") {
    const t = body.email.trim().toLowerCase();
    if (!EMAIL_RE.test(t)) {
      return NextResponse.json({ error: "email must be a valid email" }, { status: 400 });
    }
    if (t !== target.email) {
      const clash = await prisma.user.findUnique({ where: { email: t } });
      if (clash) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
      data.email = t;
      // Re-verification on email change.
      data.emailVerified = false;
      data.onboardingComplete = false;
    }
  }

  if (typeof body.roleCode === "string" && body.roleCode.trim() !== "") {
    const code = body.roleCode.trim().toLowerCase();
    if (code !== target.role.code) {
      const role = await prisma.userRoleType.findUnique({ where: { code } });
      if (!role) return NextResponse.json({ error: "Unknown roleCode" }, { status: 400 });
      data.roleId = role.id;

      // Refuse demoting the actor's own admin role; require a second admin
      // present (avoid lock-out).
      if (target.id === actor.id && target.role.code === "admin" && code !== "admin") {
        const others = await prisma.user.count({
          where: { id: { not: actor.id }, role: { code: "admin" } }
        });
        if (others === 0) {
          return NextResponse.json(
            { error: "Refusing to demote the only admin." },
            { status: 409 }
          );
        }
      }
    }
  }

  if (typeof body.statusCode === "string" && body.statusCode.trim() !== "") {
    const code = body.statusCode.trim().toLowerCase();
    if (code !== target.status.code) {
      const st = await prisma.userStatusType.findUnique({ where: { code } });
      if (!st) return NextResponse.json({ error: "Unknown statusCode" }, { status: 400 });
      if (target.id === actor.id && (code === "suspended" || code === "deactivated")) {
        return NextResponse.json(
          { error: "You cannot suspend your own account." },
          { status: 409 }
        );
      }
      data.statusId = st.id;
    }
  }

  if (body.providerSlug === null) {
    data.providerId = null;
  } else if (typeof body.providerSlug === "string" && body.providerSlug.trim() !== "") {
    const slug = body.providerSlug.trim().toLowerCase();
    if (slug !== target.provider?.slug) {
      const p = await prisma.provider.findUnique({ where: { slug } });
      if (!p) return NextResponse.json({ error: "Unknown providerSlug" }, { status: 400 });
      data.providerId = p.id;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.user.update({ where: { id }, data });

  await writeAudit({
    actorUserId: actor.id,
    entityType: "user",
    entityId: id,
    action: "user.updated",
    previousValue: before,
    newValue: data
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (id === actor.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 409 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    include: { role: { select: { code: true } } }
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.role.code === "admin") {
    const others = await prisma.user.count({
      where: { id: { not: id }, role: { code: "admin" } }
    });
    if (others === 0) {
      return NextResponse.json(
        { error: "Refusing to delete the only admin." },
        { status: 409 }
      );
    }
  }

  // Detach audit references rather than block deletion - preserves history.
  await prisma.auditLog.updateMany({
    where: { actorUserId: id },
    data: { actorUserId: null }
  });

  try {
    await prisma.user.delete({ where: { id } });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "Delete failed - referencing rows still exist. Suspend the account instead.",
        detail: e instanceof Error ? e.message : String(e)
      },
      { status: 409 }
    );
  }

  await writeAudit({
    actorUserId: actor.id,
    entityType: "user",
    entityId: id,
    action: "user.deleted",
    previousValue: {
      email: target.email,
      role: target.role.code
    }
  });

  return NextResponse.json({ ok: true });
}
