import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getReferenceRow,
  loadAdminUserForEdit,
  findUserByEmailBasic,
  findProviderBySlugForAssign,
  countOtherActiveAdmins,
  applyAdminUserUpdate,
  deleteAdminUser,
  emailTemplates,
  sendTransactionalEmail
} from "@airegistry/sdk/server";
import { getConfig } from "@airegistry/sdk";
import { getPublicOrigin } from "@/lib/public-origin";

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
  notifyByEmail?: unknown;
  statusChangeReason?: unknown;
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

  const target = await loadAdminUserForEdit(id);
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
      const clash = await findUserByEmailBasic(t);
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
      const role = await getReferenceRow("userRoleType", code);
      if (!role) return NextResponse.json({ error: "Unknown roleCode" }, { status: 400 });
      data.roleId = role.id;

      // Refuse demoting the actor's own admin role; require a second admin
      // present (avoid lock-out).
      if (target.id === actor.id && target.role.code === "admin" && code !== "admin") {
        const others = await countOtherActiveAdmins(actor.id);
        if (others === 0) {
          return NextResponse.json(
            { error: "Refusing to demote the only admin." },
            { status: 409 }
          );
        }
      }
    }
  }

  // Track whether the status actually changed (and to what) so we can
  // send a notification email after the update commits.
  let statusChange: { newCode: string; newName: string } | null = null;
  if (typeof body.statusCode === "string" && body.statusCode.trim() !== "") {
    const code = body.statusCode.trim().toLowerCase();
    if (code !== target.status.code) {
      const st = await getReferenceRow("userStatusType", code);
      if (!st) return NextResponse.json({ error: "Unknown statusCode" }, { status: 400 });
      if (target.id === actor.id && (code === "suspended" || code === "deactivated")) {
        return NextResponse.json(
          { error: "You cannot suspend your own account." },
          { status: 409 }
        );
      }
      data.statusId = st.id;
      statusChange = { newCode: st.code, newName: st.name };
    }
  }

  if (body.providerSlug === null) {
    data.providerId = null;
  } else if (typeof body.providerSlug === "string" && body.providerSlug.trim() !== "") {
    const slug = body.providerSlug.trim().toLowerCase();
    if (slug !== target.provider?.slug) {
      const p = await findProviderBySlugForAssign(slug);
      if (!p) return NextResponse.json({ error: "Unknown providerSlug" }, { status: 400 });
      data.providerId = p.id;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await applyAdminUserUpdate(actor.id, id, data, before);

  // Notify the user on a status change (suspend / reactivate / etc.).
  // Default ON; only an explicit `notifyByEmail: false` suppresses it.
  const notifyByEmail = body.notifyByEmail !== false;
  let emailNotified = false;
  if (statusChange && notifyByEmail) {
    const cfg = getConfig();
    const origin = getPublicOrigin(req);
    const reason =
      typeof body.statusChangeReason === "string" && body.statusChangeReason.trim() !== ""
        ? body.statusChangeReason.trim()
        : null;
    const recipientEmail = typeof data.email === "string" ? data.email : target.email;
    const recipientName = typeof data.name === "string" ? data.name : target.name;
    const tmpl = emailTemplates.userStatusChanged({
      name: recipientName,
      registryName: cfg.registryName,
      operatorName: cfg.operatorName,
      statusLabel: statusChange.newName,
      loginUrl: `${origin}/login`,
      reason
    });
    sendTransactionalEmail("user_status_changed", {
      to: recipientEmail,
      subject: tmpl.subject,
      text: tmpl.text
    });
    emailNotified = true;
  }

  return NextResponse.json({ ok: true, emailNotified });
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

  const target = await loadAdminUserForEdit(id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.role.code === "admin") {
    const others = await countOtherActiveAdmins(id);
    if (others === 0) {
      return NextResponse.json(
        { error: "Refusing to delete the only admin." },
        { status: 409 }
      );
    }
  }

  try {
    await deleteAdminUser(actor.id, id, {
      email: target.email,
      roleCode: target.role.code
    });
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

  return NextResponse.json({ ok: true });
}
