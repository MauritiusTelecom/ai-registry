/**
 * Notification glue for review-thread events. Pulls recipients out of the
 * review + thread, builds the URL, and dispatches transactional emails.
 *
 * Each notify* function is fire-and-forget — failures are logged but never
 * thrown so a flaky SMTP server cannot break the thread mutation that
 * produced the event.
 */

import { prisma } from "@airegistry/core";
import { getConfig } from "@airegistry/sdk";
import {
  emailTemplates,
  sendTransactionalEmailAll,
  uniqueValidEmails
} from "@airegistry/sdk/server";
import { getPublicOrigin } from "@/lib/public-origin";

const EXCERPT_MAX = 200;

function excerpt(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= EXCERPT_MAX) return trimmed;
  return trimmed.slice(0, EXCERPT_MAX - 1) + "…";
}

async function loadReviewContacts(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      reviewerId: true,
      reviewer: { select: { email: true } },
      resource: {
        select: {
          title: true,
          provider: {
            select: {
              displayName: true,
              contactEmail: true,
              legalContactEmail: true,
              users: { select: { email: true } }
            }
          }
        }
      }
    }
  });
  if (!review) return null;

  const providerEmails = uniqueValidEmails([
    review.resource?.provider?.contactEmail,
    review.resource?.provider?.legalContactEmail,
    ...(review.resource?.provider?.users.map((u) => u.email) ?? [])
  ]);

  const verifierEmails = uniqueValidEmails([review.reviewer?.email]);

  return {
    review,
    providerEmails,
    verifierEmails,
    title: review.resource?.title ?? "(untitled resource)"
  };
}

function threadUrlForVerifier(req: Request, reviewId: string): string {
  return `${getPublicOrigin(req)}/verifier/queue/${reviewId}`;
}

function threadUrlForProvider(req: Request, reviewId: string): string {
  return `${getPublicOrigin(req)}/provider/reviews/${reviewId}`;
}

export async function notifyThreadOpened(opts: {
  req: Request;
  reviewId: string;
  authorName: string;
  body: string;
}) {
  try {
    const cfg = getConfig();
    const ctx = await loadReviewContacts(opts.reviewId);
    if (!ctx || ctx.providerEmails.length === 0) return;

    const tpl = emailTemplates.reviewThreadOpened({
      registryName: cfg.registryName,
      reviewTitle: ctx.title,
      authorName: opts.authorName,
      excerpt: excerpt(opts.body),
      threadUrl: threadUrlForProvider(opts.req, opts.reviewId)
    });

    sendTransactionalEmailAll("reviewThreadOpened", ctx.providerEmails, (to) => ({
      to,
      subject: tpl.subject,
      text: tpl.text
    }));
  } catch (err) {
    console.warn("[notify-thread] reviewThreadOpened failed:", err);
  }
}

export async function notifyThreadReply(opts: {
  req: Request;
  reviewId: string;
  authorName: string;
  authorRole: "verifier" | "admin" | "provider";
  body: string;
  attachmentCount: number;
}) {
  try {
    const cfg = getConfig();
    const ctx = await loadReviewContacts(opts.reviewId);
    if (!ctx) return;

    if (opts.authorRole === "provider") {
      if (ctx.verifierEmails.length === 0) return;
      const tpl = emailTemplates.reviewThreadProviderReply({
        registryName: cfg.registryName,
        reviewTitle: ctx.title,
        authorName: opts.authorName,
        excerpt: excerpt(opts.body),
        threadUrl: threadUrlForVerifier(opts.req, opts.reviewId),
        attachmentCount: opts.attachmentCount
      });
      sendTransactionalEmailAll("reviewThreadProviderReply", ctx.verifierEmails, (to) => ({
        to,
        subject: tpl.subject,
        text: tpl.text
      }));
    } else {
      if (ctx.providerEmails.length === 0) return;
      const tpl = emailTemplates.reviewThreadVerifierReply({
        registryName: cfg.registryName,
        reviewTitle: ctx.title,
        authorName: opts.authorName,
        excerpt: excerpt(opts.body),
        threadUrl: threadUrlForProvider(opts.req, opts.reviewId),
        attachmentCount: opts.attachmentCount
      });
      sendTransactionalEmailAll("reviewThreadVerifierReply", ctx.providerEmails, (to) => ({
        to,
        subject: tpl.subject,
        text: tpl.text
      }));
    }
  } catch (err) {
    console.warn("[notify-thread] reviewThreadReply failed:", err);
  }
}

export async function notifyThreadResolved(opts: { req: Request; reviewId: string }) {
  try {
    const cfg = getConfig();
    const ctx = await loadReviewContacts(opts.reviewId);
    if (!ctx) return;

    const recipients = uniqueValidEmails([...ctx.providerEmails, ...ctx.verifierEmails]);
    if (recipients.length === 0) return;

    const tpl = emailTemplates.reviewThreadResolved({
      registryName: cfg.registryName,
      reviewTitle: ctx.title,
      threadUrl: threadUrlForProvider(opts.req, opts.reviewId)
    });

    sendTransactionalEmailAll("reviewThreadResolved", recipients, (to) => ({
      to,
      subject: tpl.subject,
      text: tpl.text
    }));
  } catch (err) {
    console.warn("[notify-thread] reviewThreadResolved failed:", err);
  }
}
