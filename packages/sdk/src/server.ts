/**
 * @airegistry/sdk/server — server-only public surface.
 *
 * Re-exports symbols that depend on Node-only APIs (next/headers, the
 * Prisma client, file system, etc.) and therefore MUST NOT be pulled into
 * browser bundles. Importing anything from this entry point in a client
 * component will fail the build with a clear "server-only" error from
 * Next.js — which is what we want.
 *
 * Client-safe symbols continue to live in `@airegistry/sdk`.
 *
 * Stability: every symbol exported from this file is part of the SDK's
 * SemVer contract (same as @airegistry/sdk), but only callable from server
 * components, route handlers, server actions, and other server-only
 * contexts.
 */

// Authenticated session accessor — reads the session cookie from
// next/headers, so it cannot run in a browser. The SessionUser TYPE
// (which is just data) remains in @airegistry/sdk for client components
// that need to type-check a SessionUser passed down from the server.
export { getCurrentUser } from "@airegistry/core/auth/current-user";

// Auth service helpers — task-shaped wrappers over the internal crypto
// primitives in password.ts, tokens.ts, and session.ts. Apps and
// extensions MUST NOT import those primitives directly; use these
// helpers instead. See `packages/core/src/lib/auth/services.ts`.
export {
  signSessionCookie,
  clearSessionCookie,
  hashUserPassword,
  verifyUserPassword,
  NO_USER_PASSWORD_SENTINEL,
  prepareEmailVerificationToken,
  preparePasswordResetToken,
  hashTokenForLookup
} from "@airegistry/core/auth/services";
export type {
  SessionCookieDirective,
  OneShotTokenBundle
} from "@airegistry/core/auth/services";

// Email surface — apps and extensions send transactional email through
// these helpers so SMTP config, branding, and audit posture stay
// centralised. Raw nodemailer is INTERNAL — never import it directly.
// A future PR will collapse the (emailTemplates + sendEmail) two-step
// pattern into a single `sendTemplatedEmail(...)` service.
export {
  sendEmail,
  renderTemplate,
  emailTemplates
} from "@airegistry/core/email";
export type {
  SendEmailInput,
  SendEmailResult
} from "@airegistry/core/email";
export {
  sendTransactionalEmail,
  sendTransactionalEmailAll
} from "@airegistry/core/email/transactional-send";
export { uniqueValidEmails } from "@airegistry/core/email/recipients";

// Admin ref-table Prisma adapter — resolves a RefTableConfig (from the
// client-safe registry in @airegistry/sdk) to its Prisma model proxy.
// Uses the Prisma client directly so it MUST stay on the server surface.
export {
  modelFor,
  PrismaErrorCode,
  isPrismaKnownError
} from "@airegistry/core/admin/ref-prisma";

// Contact linker — pairs a contact-form submission to a User row after
// the user verifies their address. Accepts a Prisma client by parameter
// and is only called from login/register routes, so it lives on the
// server surface.
export { linkContactsToUser } from "@airegistry/core/contacts/link-to-user";

// Prisma namespace — exposed to apps so they can type filter-clauses
// (Prisma.UserWhereInput, etc.) and catch typed errors
// (Prisma.PrismaClientKnownRequestError) without binding to the
// internal "@airegistry/core/generated/prisma" path.
//
// SemVer caveat: the Prisma namespace shape follows whatever Prisma
// version core uses, and Prisma sometimes changes shapes across major
// versions. When core bumps Prisma to a new major, the SDK bumps a
// major too. A future PR will wrap typed-query construction in service
// functions that don't leak Prisma types; once that lands, this
// re-export can be deprecated.
export { Prisma } from "@airegistry/core/generated/prisma";
