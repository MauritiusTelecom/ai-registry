/**
 * Thin alias for the canonical service.
 *
 * The provider-workspace-creation logic lives in
 * `@airegistry/core/auth/services` and is exposed via
 * `@airegistry/sdk/server`. This file kept its export name as
 * `ensureUserProviderLinked` so existing call sites compile unchanged;
 * the canonical service name is `ensureProviderWorkspace`.
 */
export { ensureProviderWorkspace as ensureUserProviderLinked } from "@airegistry/sdk/server";
