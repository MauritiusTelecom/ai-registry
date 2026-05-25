/**
 * Sovereignty document services - provider-level docs + resource-evidence
 * file attachments. See docs/specs/sovereignty-documents.md.
 *
 * Storage paths:
 *   <root>/providers/<providerId>/<documentId>.<ext>
 *   <root>/resources/<resourceId>/<evidenceId>.<ext>
 */

import type { SessionUser } from "../auth/current-user";
import { prisma } from "../prisma";

// ─── Shared limits + types ─────────────────────────────────

export const MAX_DOC_BYTES = 10 * 1024 * 1024;
export const DOC_EDIT_WINDOW_MS = 10 * 60 * 1000;

export const ALLOWED_DOC_TYPES = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/zip"
]);

export function extensionForDoc(contentType: string): string {
  switch (contentType) {
    case "application/pdf":
      return "pdf";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "text/plain":
      return "txt";
    case "application/zip":
      return "zip";
    default:
      return "bin";
  }
}

export function sanitiseDocFilename(raw: string): string {
  const noPath = raw.replace(/^.*[\\/]/, "");
  const ascii = noPath.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const cleaned = ascii.replace(/[^A-Za-z0-9._-]/g, "_");
  return cleaned.slice(0, 200) || "document";
}

export class DocumentError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "DocumentError";
  }
}

// ─── Permission helpers ────────────────────────────────────

export function isAdminUser(user: SessionUser): boolean {
  return user.roles.includes("admin") || user.role.code === "admin";
}

export function isVerifierUser(user: SessionUser): boolean {
  return user.roles.includes("verifier") || user.role.code === "verifier";
}

export async function userOwnsProvider(user: SessionUser, providerId: string): Promise<boolean> {
  if (!user.provider) return false;
  return user.provider.id === providerId;
}

export async function userOwnsResource(user: SessionUser, resourceId: string): Promise<boolean> {
  if (!user.provider) return false;
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { providerId: true }
  });
  return resource?.providerId === user.provider.id;
}

// ─── Provider documents ────────────────────────────────────

export async function loadProviderDocuments(opts: {
  providerId: string;
  includePrivate: boolean;
}) {
  return prisma.providerDocument.findMany({
    where: {
      providerId: opts.providerId,
      ...(opts.includePrivate ? {} : { publicVisibility: true })
    },
    include: {
      documentType: true,
      uploadedBy: { select: { id: true, name: true, email: true } }
    },
    orderBy: { uploadedAt: "desc" }
  });
}

export async function getProviderDocumentTypeIdByCode(code: string): Promise<string | null> {
  const row = await prisma.providerDocumentType.findUnique({
    where: { code },
    select: { id: true, active: true }
  });
  if (!row || !row.active) return null;
  return row.id;
}

export async function createProviderDocument(opts: {
  providerId: string;
  documentTypeId: string;
  uploadedById: string;
  title: string;
  description: string | null;
  publicVisibility: boolean;
  expiresAt: Date | null;
  fileStorageKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
}) {
  return prisma.providerDocument.create({
    data: {
      providerId: opts.providerId,
      documentTypeId: opts.documentTypeId,
      uploadedById: opts.uploadedById,
      title: opts.title.slice(0, 255),
      description: opts.description?.slice(0, 2000) ?? null,
      publicVisibility: opts.publicVisibility,
      expiresAt: opts.expiresAt,
      fileStorageKey: opts.fileStorageKey,
      filename: opts.filename,
      contentType: opts.contentType,
      sizeBytes: opts.sizeBytes,
      checksumSha256: opts.checksumSha256
    }
  });
}

export async function loadProviderDocumentForServing(opts: {
  documentId: string;
  user: SessionUser | null;
}) {
  const doc = await prisma.providerDocument.findUnique({
    where: { id: opts.documentId }
  });
  if (!doc) throw new DocumentError("not_found", "Document not found");

  if (doc.publicVisibility) return doc; // anyone may read

  // Private: require an authenticated user with permission
  if (!opts.user) throw new DocumentError("forbidden", "Login required");
  const u = opts.user;
  if (isAdminUser(u) || isVerifierUser(u)) return doc;
  if (await userOwnsProvider(u, doc.providerId)) return doc;
  throw new DocumentError("forbidden", "You cannot access this document");
}

export async function deleteProviderDocumentRow(opts: {
  documentId: string;
  user: SessionUser;
}) {
  const doc = await prisma.providerDocument.findUnique({
    where: { id: opts.documentId }
  });
  if (!doc) throw new DocumentError("not_found", "Document not found");

  const isOwnerUpload = doc.uploadedById === opts.user.id;
  const ageMs = Date.now() - doc.uploadedAt.getTime();
  const withinWindow = ageMs <= DOC_EDIT_WINDOW_MS;
  const adminOk = isAdminUser(opts.user);

  if (!adminOk && !(isOwnerUpload && withinWindow)) {
    throw new DocumentError("forbidden", "Only the uploader (within 10 min) or admin can delete");
  }
  if (!adminOk && !(await userOwnsProvider(opts.user, doc.providerId))) {
    throw new DocumentError("forbidden", "Not your provider");
  }

  await prisma.providerDocument.delete({ where: { id: doc.id } });
  return { storageKey: doc.fileStorageKey };
}

// ─── Resource evidence file attachments ───────────────────

export async function loadEvidenceForFileOps(opts: {
  resourceId: string;
  evidenceId: string;
}) {
  const evidence = await prisma.sovereigntyEvidence.findUnique({
    where: { id: opts.evidenceId },
    include: { resource: { select: { id: true, providerId: true } } }
  });
  if (!evidence || evidence.resourceId !== opts.resourceId) {
    throw new DocumentError("not_found", "Evidence not found");
  }
  return evidence;
}

export async function attachFileToEvidence(opts: {
  evidenceId: string;
  fileStorageKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
}) {
  return prisma.sovereigntyEvidence.update({
    where: { id: opts.evidenceId },
    data: {
      fileStorageKey: opts.fileStorageKey,
      fileFilename: opts.filename,
      fileContentType: opts.contentType,
      fileSizeBytes: opts.sizeBytes,
      fileChecksumSha256: opts.checksumSha256,
      fileUploadedAt: new Date()
    }
  });
}

export async function detachFileFromEvidence(opts: { evidenceId: string }) {
  const evidence = await prisma.sovereigntyEvidence.findUnique({
    where: { id: opts.evidenceId },
    select: { fileStorageKey: true }
  });
  if (!evidence?.fileStorageKey) {
    throw new DocumentError("not_found", "No file attached");
  }
  await prisma.sovereigntyEvidence.update({
    where: { id: opts.evidenceId },
    data: {
      fileStorageKey: null,
      fileFilename: null,
      fileContentType: null,
      fileSizeBytes: null,
      fileChecksumSha256: null,
      fileUploadedAt: null
    }
  });
  return { storageKey: evidence.fileStorageKey };
}

export async function canViewEvidenceFile(opts: {
  resourceId: string;
  evidenceId: string;
  user: SessionUser | null;
}): Promise<boolean> {
  const evidence = await loadEvidenceForFileOps(opts);
  if (!evidence.fileStorageKey) return false;

  if (evidence.publicVisibility) return true;
  if (!opts.user) return false;
  if (isAdminUser(opts.user) || isVerifierUser(opts.user)) return true;
  return userOwnsResource(opts.user, opts.resourceId);
}
