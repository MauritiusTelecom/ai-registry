import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write-audit";
import { generateRawToken, hashToken, verificationExpiry } from "@/lib/auth/tokens";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getConfig } from "@/lib/config";
import type { Prisma } from "@/generated/prisma";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * GET /api/admin/users - list users with q + role + status + verified filters.
 * POST /api/admin/users - create user (admins manually invite people who
 *   cannot self-register, e.g. reviewers / sovereign operators).
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.3.
 */

type ListResponse = {
  rows: Array<{
    id: string;
    name: string;
    email: string;
    roleCode: string;
    roleName: string;
    statusCode: string;
    statusName: string;
    emailVerified: boolean;
    providerSlug: string | null;
    providerName: string | null;
    createdAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function adminOnly(user: { roles: string[] } | null) {
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles.includes("admin")) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request) {
  const actor = await getCurrentUser();
  const guard = adminOnly(actor);
  if (guard) return guard;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const role = url.searchParams.get("role")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "";
  const verified = url.searchParams.get("verified") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20)
  );

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } }
    ];
  }
  if (role) where.role = { code: role };
  if (status) where.status = { code: status };
  if (verified === "true") where.emailVerified = true;
  else if (verified === "false") where.emailVerified = false;

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        role: { select: { code: true, name: true } },
        status: { select: { code: true, name: true } },
        provider: { select: { slug: true, displayName: true } }
      },
      orderBy: [{ status: { sortOrder: "asc" } }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.user.count({ where })
  ]);

  const body: ListResponse = {
    rows: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roleCode: u.role.code,
      roleName: u.role.name,
      statusCode: u.status.code,
      statusName: u.status.name,
      emailVerified: u.emailVerified,
      providerSlug: u.provider?.slug ?? null,
      providerName: u.provider?.displayName ?? null,
      createdAt: u.createdAt.toISOString()
    })),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total
  };
  return NextResponse.json(body);
}

type CreateBody = {
  name?: unknown;
  email?: unknown;
  roleCode?: unknown;
  statusCode?: unknown;
  providerSlug?: unknown;
  sendInvite?: unknown;
};

export async function POST(req: Request) {
  const actor = await getCurrentUser();
  const guard = adminOnly(actor);
  if (guard) return guard;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const roleCode =
    typeof body.roleCode === "string" ? body.roleCode.trim().toLowerCase() : "";
  const statusCode =
    typeof body.statusCode === "string" && body.statusCode.trim() !== ""
      ? body.statusCode.trim().toLowerCase()
      : "invited";
  const providerSlug =
    typeof body.providerSlug === "string" && body.providerSlug.trim() !== ""
      ? body.providerSlug.trim().toLowerCase()
      : null;
  const sendInvite = body.sendInvite === undefined ? true : Boolean(body.sendInvite);

  if (name.length < 2) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "email must be a valid email" }, { status: 400 });
  }
  if (!roleCode) {
    return NextResponse.json({ error: "roleCode is required" }, { status: 400 });
  }

  const [role, status, existing, provider] = await Promise.all([
    prisma.userRoleType.findUnique({ where: { code: roleCode } }),
    prisma.userStatusType.findUnique({ where: { code: statusCode } }),
    prisma.user.findUnique({ where: { email } }),
    providerSlug
      ? prisma.provider.findUnique({ where: { slug: providerSlug } })
      : Promise.resolve(null)
  ]);

  if (!role) return NextResponse.json({ error: "Unknown roleCode" }, { status: 400 });
  if (!status) return NextResponse.json({ error: "Unknown statusCode" }, { status: 400 });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }
  if (providerSlug && !provider) {
    return NextResponse.json({ error: "Unknown providerSlug" }, { status: 400 });
  }

  const verificationToken = sendInvite ? generateRawToken() : null;
  const created = await prisma.user.create({
    data: {
      name,
      email,
      roleId: role.id,
      statusId: status.id,
      providerId: provider?.id ?? null,
      emailVerified: false,
      onboardingComplete: false,
      verificationToken: verificationToken ? hashToken(verificationToken) : null,
      verificationTokenExpiry: verificationToken ? verificationExpiry() : null
    }
  });

  await writeAudit({
    actorUserId: actor!.id,
    entityType: "user",
    entityId: created.id,
    action: "user.created",
    newValue: {
      email,
      role: roleCode,
      status: statusCode,
      providerSlug
    }
  });

  if (sendInvite && verificationToken) {
    const origin = new URL(req.url).origin;
    const link = `${origin}/auth/verify?token=${encodeURIComponent(verificationToken)}`;
    const tmpl = emailTemplates.verification({
      name,
      verifyUrl: link,
      registryName: getConfig().registryName
    });
    await sendEmail({ to: email, subject: tmpl.subject, text: tmpl.text }).catch(() => {
      /* email helper logs internally; never block the create. */
    });
  }

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
