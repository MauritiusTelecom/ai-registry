/**
 * Mauritius BRN verification services.
 *
 * The Provider table carries three columns:
 *   brnVerifiedAt        - timestamp of admin verification (null = pending)
 *   brnVerifiedById      - the admin user who verified
 *   brnVerificationNote  - free-text note from the verifier
 *
 * Verification is **manual**. Admin reviews the BRN value plus any
 * uploaded company-registration document and toggles these columns.
 *
 * Visibility gate (applied in packages/core/src/lib/discovery):
 *   - MU providers without brnVerifiedAt are hidden from public catalog
 *   - Their resources are also hidden
 *   - Non-MU providers are unaffected
 */

import type { SessionUser } from "../auth/current-user";
import { prisma } from "../prisma";

export class BrnVerificationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "BrnVerificationError";
  }
}

function isAdmin(user: SessionUser): boolean {
  return user.roles.includes("admin") || user.role.code === "admin";
}

export async function listPendingBrnVerifications() {
  return prisma.provider.findMany({
    where: {
      brnVerifiedAt: null,
      homeJurisdiction: { code: "MU" }
    },
    include: {
      homeJurisdiction: true,
      status: true,
      documents: {
        include: { documentType: true, uploadedBy: { select: { id: true, name: true, email: true } } }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function listVerifiedBrnProviders() {
  return prisma.provider.findMany({
    where: { brnVerifiedAt: { not: null } },
    include: {
      brnVerifiedBy: { select: { id: true, name: true, email: true } }
    },
    orderBy: { brnVerifiedAt: "desc" },
    take: 100
  });
}

export async function setBrnVerified(opts: {
  providerId: string;
  user: SessionUser;
  note?: string;
}) {
  if (!isAdmin(opts.user)) {
    throw new BrnVerificationError("forbidden", "Only admins can verify a BRN");
  }
  return prisma.provider.update({
    where: { id: opts.providerId },
    data: {
      brnVerifiedAt: new Date(),
      brnVerifiedById: opts.user.id,
      brnVerificationNote: opts.note ?? null
    }
  });
}

export async function setBrnRejected(opts: {
  providerId: string;
  user: SessionUser;
  note: string;
}) {
  if (!isAdmin(opts.user)) {
    throw new BrnVerificationError("forbidden", "Only admins can reject a BRN");
  }
  if (!opts.note || opts.note.trim().length === 0) {
    throw new BrnVerificationError("note_required", "A reason is required when rejecting");
  }
  return prisma.provider.update({
    where: { id: opts.providerId },
    data: {
      brnVerifiedAt: null,
      brnVerifiedById: null,
      brnVerificationNote: opts.note.trim()
    }
  });
}

export async function loadProviderBrnStatus(providerId: string) {
  return prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      registrationNumber: true,
      brnVerifiedAt: true,
      brnVerificationNote: true,
      homeJurisdiction: { select: { code: true } },
      brnVerifiedBy: { select: { id: true, name: true } }
    }
  });
}
