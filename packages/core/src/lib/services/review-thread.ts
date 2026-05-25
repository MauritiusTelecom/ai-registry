/**
 * Review thread services. See docs/specs/provider-review-thread.md.
 *
 * Permissions: thread is visible to the verifier assigned to the review,
 * any admin, or a user on the provider account that owns the resource.
 * Providers cannot OPEN a thread; they can only reply after a verifier opens one.
 */

import type { SessionUser } from "../auth/current-user";
import { prisma } from "../prisma";

// ─── Permission helpers ────────────────────────────────────

export type ReviewForAccess = {
  reviewerId: string | null;
  resource: { provider: { id: string } | null } | null;
};

export function isAdmin(user: SessionUser): boolean {
  return user.roles.includes("admin") || user.role.code === "admin";
}

export function isVerifier(user: SessionUser): boolean {
  return user.roles.includes("verifier") || user.role.code === "verifier";
}

export function canAccessThread(user: SessionUser, review: ReviewForAccess): boolean {
  if (isAdmin(user)) return true;
  if (review.reviewerId && review.reviewerId === user.id) return true;
  if (isVerifier(user)) return true; // any verifier can see (queue access)
  if (
    user.provider &&
    review.resource?.provider?.id &&
    user.provider.id === review.resource.provider.id
  ) {
    return true;
  }
  return false;
}

export function canOpenThread(user: SessionUser, review: ReviewForAccess): boolean {
  if (isAdmin(user)) return true;
  if (review.reviewerId && review.reviewerId === user.id) return true;
  if (isVerifier(user)) return true;
  return false;
}

export function canSetThreadStatus(user: SessionUser, review: ReviewForAccess): boolean {
  return canOpenThread(user, review);
}

export function authorRoleFor(user: SessionUser): "admin" | "verifier" | "provider" {
  if (isAdmin(user)) return "admin";
  if (isVerifier(user)) return "verifier";
  return "provider";
}

// ─── Status code helpers ───────────────────────────────────

const STATUS_CODES = [
  "open",
  "awaiting_provider",
  "awaiting_verifier",
  "resolved",
  "closed"
] as const;

export type ReviewThreadStatusCode = (typeof STATUS_CODES)[number];

export function isReviewThreadStatusCode(value: unknown): value is ReviewThreadStatusCode {
  return typeof value === "string" && (STATUS_CODES as readonly string[]).includes(value);
}

async function getStatusIdByCode(code: ReviewThreadStatusCode): Promise<string> {
  const row = await prisma.reviewThreadStatusType.findUnique({ where: { code } });
  if (!row) {
    throw new Error(`ReviewThreadStatusType not seeded: ${code}`);
  }
  return row.id;
}

// ─── Loaders ───────────────────────────────────────────────

export async function loadReviewForAccess(reviewId: string) {
  return prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      reviewerId: true,
      resource: {
        select: {
          id: true,
          title: true,
          provider: { select: { id: true, displayName: true } }
        }
      }
    }
  });
}

export type ThreadPayload = Awaited<ReturnType<typeof loadThreadForReview>>;

export async function loadThreadForReview(reviewId: string) {
  return prisma.reviewThread.findUnique({
    where: { reviewId },
    include: {
      status: true,
      openedBy: { select: { id: true, name: true, email: true, role: { select: { code: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: { select: { code: true } } }
          },
          attachments: {
            orderBy: { createdAt: "asc" }
          }
        }
      }
    }
  });
}

// ─── Mutations ─────────────────────────────────────────────

const MAX_BODY_CHARS = 10_000;

function validateBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length === 0) throw new ServiceError("empty_body", "Message body is required.");
  if (trimmed.length > MAX_BODY_CHARS) {
    throw new ServiceError("body_too_long", `Message exceeds ${MAX_BODY_CHARS} chars.`);
  }
  return trimmed;
}

export class ServiceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ServiceError";
  }
}

export async function openThreadForReview(
  reviewId: string,
  user: SessionUser,
  rawBody: string,
  statusCode: ReviewThreadStatusCode = "awaiting_provider"
) {
  const body = validateBody(rawBody);
  if (!isReviewThreadStatusCode(statusCode)) {
    throw new ServiceError("invalid_status", `Unknown status code: ${statusCode}`);
  }

  const review = await loadReviewForAccess(reviewId);
  if (!review) throw new ServiceError("review_not_found", "Review not found.");
  if (!canOpenThread(user, review)) {
    throw new ServiceError("forbidden", "You cannot open a thread on this review.");
  }

  const existing = await prisma.reviewThread.findUnique({ where: { reviewId } });
  if (existing) {
    throw new ServiceError("thread_exists", "A thread already exists for this review.");
  }

  const statusId = await getStatusIdByCode(statusCode);
  const role = authorRoleFor(user);

  const thread = await prisma.reviewThread.create({
    data: {
      reviewId,
      statusId,
      openedById: user.id,
      messages: {
        create: {
          authorId: user.id,
          authorRole: role,
          body
        }
      }
    },
    include: {
      status: true,
      messages: {
        include: {
          author: {
            select: { id: true, name: true, email: true, role: { select: { code: true } } }
          },
          attachments: true
        }
      }
    }
  });

  return thread;
}

export async function appendThreadMessage(
  reviewId: string,
  user: SessionUser,
  rawBody: string
) {
  const body = validateBody(rawBody);

  const review = await loadReviewForAccess(reviewId);
  if (!review) throw new ServiceError("review_not_found", "Review not found.");
  if (!canAccessThread(user, review)) {
    throw new ServiceError("forbidden", "You cannot reply on this review.");
  }

  const thread = await prisma.reviewThread.findUnique({
    where: { reviewId },
    include: { status: true }
  });
  if (!thread) throw new ServiceError("thread_not_found", "No thread exists yet on this review.");
  if (thread.status.code === "resolved" || thread.status.code === "closed") {
    throw new ServiceError("thread_closed", "Thread is closed; ask the verifier to reopen it.");
  }

  const role = authorRoleFor(user);
  const nextStatusCode: ReviewThreadStatusCode =
    role === "provider" ? "awaiting_verifier" : "awaiting_provider";
  const nextStatusId = await getStatusIdByCode(nextStatusCode);

  const [message] = await prisma.$transaction([
    prisma.reviewThreadMessage.create({
      data: {
        threadId: thread.id,
        authorId: user.id,
        authorRole: role,
        body
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: { select: { code: true } } }
        },
        attachments: true
      }
    }),
    prisma.reviewThread.update({
      where: { id: thread.id },
      data: { statusId: nextStatusId }
    })
  ]);

  return { thread: { id: thread.id, nextStatusCode }, message };
}

export async function setThreadStatusByCode(
  reviewId: string,
  user: SessionUser,
  statusCode: ReviewThreadStatusCode
) {
  if (!isReviewThreadStatusCode(statusCode)) {
    throw new ServiceError("invalid_status", `Unknown status code: ${statusCode}`);
  }

  const review = await loadReviewForAccess(reviewId);
  if (!review) throw new ServiceError("review_not_found", "Review not found.");
  if (!canSetThreadStatus(user, review)) {
    throw new ServiceError("forbidden", "Only verifiers or admins can change the thread status.");
  }

  const thread = await prisma.reviewThread.findUnique({ where: { reviewId } });
  if (!thread) throw new ServiceError("thread_not_found", "No thread exists on this review.");

  const statusId = await getStatusIdByCode(statusCode);
  const updates: { statusId: string; resolvedById?: string; resolvedAt?: Date } = { statusId };
  if (statusCode === "resolved") {
    updates.resolvedById = user.id;
    updates.resolvedAt = new Date();
  }

  return prisma.reviewThread.update({
    where: { id: thread.id },
    data: updates
  });
}

// ─── Attachments ───────────────────────────────────────────

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const MAX_THREAD_BYTES = 100 * 1024 * 1024; // 100 MB per thread
const MESSAGE_ATTACHMENT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export const ALLOWED_ATTACHMENT_TYPES = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/zip"
]);

export class AttachmentError extends ServiceError {}

export async function ensureCanUploadToMessage(
  reviewId: string,
  messageId: string,
  user: SessionUser
) {
  const review = await loadReviewForAccess(reviewId);
  if (!review) throw new AttachmentError("review_not_found", "Review not found.");
  if (!canAccessThread(user, review)) {
    throw new AttachmentError("forbidden", "You cannot upload to this thread.");
  }

  const message = await prisma.reviewThreadMessage.findUnique({
    where: { id: messageId },
    include: {
      thread: { select: { id: true, reviewId: true } },
      attachments: { select: { sizeBytes: true } }
    }
  });
  if (!message) throw new AttachmentError("message_not_found", "Message not found.");
  if (message.thread.reviewId !== reviewId) {
    throw new AttachmentError("message_not_found", "Message does not belong to this review.");
  }
  if (message.authorId !== user.id) {
    throw new AttachmentError("forbidden", "Only the message author can attach files.");
  }
  const ageMs = Date.now() - message.createdAt.getTime();
  if (ageMs > MESSAGE_ATTACHMENT_WINDOW_MS) {
    throw new AttachmentError(
      "window_expired",
      "Attachments must be added within 10 minutes of posting the message."
    );
  }
  if (message.attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new AttachmentError(
      "too_many_attachments",
      `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message.`
    );
  }

  return { message, thread: message.thread };
}

export async function getThreadTotalBytes(threadId: string): Promise<number> {
  const sum = await prisma.reviewThreadAttachment.aggregate({
    where: { message: { threadId } },
    _sum: { sizeBytes: true }
  });
  return sum._sum.sizeBytes ?? 0;
}

export function validateAttachmentBasics(opts: {
  contentType: string;
  sizeBytes: number;
}): void {
  if (!ALLOWED_ATTACHMENT_TYPES.has(opts.contentType)) {
    throw new AttachmentError(
      "unsupported_type",
      `Content type ${opts.contentType} is not allowed.`
    );
  }
  if (opts.sizeBytes > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentError(
      "too_large",
      `File exceeds ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB limit.`
    );
  }
}

export async function ensureThreadQuota(threadId: string, addingBytes: number): Promise<void> {
  const total = await getThreadTotalBytes(threadId);
  if (total + addingBytes > MAX_THREAD_BYTES) {
    throw new AttachmentError(
      "thread_quota_exceeded",
      `Thread quota of ${MAX_THREAD_BYTES / 1024 / 1024} MB would be exceeded.`
    );
  }
}

export async function recordAttachment(opts: {
  messageId: string;
  uploadedById: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  checksumSha256: string;
}) {
  return prisma.reviewThreadAttachment.create({
    data: {
      messageId: opts.messageId,
      uploadedById: opts.uploadedById,
      filename: opts.filename,
      contentType: opts.contentType,
      sizeBytes: opts.sizeBytes,
      storageKey: opts.storageKey,
      checksumSha256: opts.checksumSha256
    }
  });
}

export async function loadAttachmentForServing(
  reviewId: string,
  attachmentId: string,
  user: SessionUser
) {
  const review = await loadReviewForAccess(reviewId);
  if (!review) throw new AttachmentError("review_not_found", "Review not found.");
  if (!canAccessThread(user, review)) {
    throw new AttachmentError("forbidden", "You cannot access this attachment.");
  }

  const attachment = await prisma.reviewThreadAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      message: { include: { thread: { select: { reviewId: true } } } }
    }
  });
  if (!attachment) throw new AttachmentError("attachment_not_found", "Attachment not found.");
  if (attachment.message.thread.reviewId !== reviewId) {
    throw new AttachmentError("attachment_not_found", "Attachment does not belong to this review.");
  }
  return attachment;
}

export async function deleteAttachment(
  reviewId: string,
  attachmentId: string,
  user: SessionUser
) {
  const attachment = await loadAttachmentForServing(reviewId, attachmentId, user);

  const isUploader = attachment.uploadedById === user.id;
  const isAdminUser = isAdmin(user);
  const ageMs = Date.now() - attachment.createdAt.getTime();
  const withinWindow = ageMs <= MESSAGE_ATTACHMENT_WINDOW_MS;

  if (!isAdminUser && !(isUploader && withinWindow)) {
    throw new AttachmentError(
      "forbidden",
      "Only the uploader (within 10 min) or an admin can delete an attachment."
    );
  }

  await prisma.reviewThreadAttachment.delete({ where: { id: attachmentId } });
  return { storageKey: attachment.storageKey };
}

// ─── Filename + MIME sniffing helpers ─────────────────────

export function sanitiseFilename(raw: string): string {
  const noPath = raw.replace(/^.*[\\/]/, "");
  const ascii = noPath.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const cleaned = ascii.replace(/[^A-Za-z0-9._-]/g, "_");
  const trimmed = cleaned.slice(0, 200);
  return trimmed || "attachment";
}

export function extensionFor(contentType: string): string {
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

export const reviewThreadLimits = {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_THREAD_BYTES,
  MAX_BODY_CHARS,
  MESSAGE_ATTACHMENT_WINDOW_MS
};
