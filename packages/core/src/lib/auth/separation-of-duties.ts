/**
 * Application-layer separation-of-duties guard (constitution §7).
 *
 * A reviewer or admin MUST NOT approve a review whose target_provider_id
 * matches the actor's own user.providerId. This module exposes a single
 * `assertCanReview()` helper that throws `SeparationOfDutiesError` when the
 * guard would be violated. Routes catch this and return HTTP 403.
 *
 * Phase 2 adds the helper. Phase 4 wires it into the review-approval routes.
 */

import type { SessionUser } from "./current-user";

export class SeparationOfDutiesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeparationOfDutiesError";
  }
}

export type ReviewTarget = {
  /** Provider that owns the review target (resource or provider record). */
  providerId: string | null;
};

/**
 * Throws if `actor` would be approving a review against their own provider.
 *
 * - `actor.provider.id` is the provider linkage the actor carries (admins
 *   without a provider linkage have `provider === null` and pass).
 * - `target.providerId` is the provider id of the review's target - for
 *   provider-scoped reviews this is the provider itself; for resource-scoped
 *   reviews it's the resource's provider.
 */
export function assertCanReview(actor: SessionUser, target: ReviewTarget): void {
  if (!actor.provider) return; // staff with no provider linkage are fine
  if (target.providerId === null) return; // unbound target, no conflict
  if (actor.provider.id === target.providerId) {
    throw new SeparationOfDutiesError(
      "Reviewers may not approve reviews targeting their own provider record."
    );
  }
}
