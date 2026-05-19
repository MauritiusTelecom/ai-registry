/**
 * Thin re-export of the canonical notifications service.
 *
 * The implementation lives in `@airegistry/core/services/portal-notifications`
 * and is exposed via `@airegistry/sdk/server`. Apps consume it from there.
 * Names preserved for compatibility with existing call sites.
 */
export {
  loadPortalNotifications,
  listPortalNotificationKeys
} from "@airegistry/sdk/server";
export type {
  PortalNotification,
  PortalRole,
  LoadNotificationsOptions
} from "@airegistry/sdk/server";

// Legacy alias — the old name used in routes / components.
export { listPortalNotificationKeys as listNotificationKeysFor } from "@airegistry/sdk/server";
