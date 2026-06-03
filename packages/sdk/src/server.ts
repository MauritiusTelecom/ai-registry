/**
 * @airegistry/sdk/server — server-only public surface.
 */

export { getCurrentUser } from "@airegistry/core/auth/current-user";
export { exposeDevAuthLinks } from "@airegistry/core/auth/dev-links";

export {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitJsonResponse,
  type RateLimitBucket,
  type RateLimitResult
} from "@airegistry/core/rate-limit";

export {
  signSessionCookie,
  clearSessionCookie,
  signCsrfCookie,
  clearCsrfCookieDirective,
  hashUserPassword,
  verifyUserPassword,
  NO_USER_PASSWORD_SENTINEL,
  prepareEmailVerificationToken,
  preparePasswordResetToken,
  hashTokenForLookup,
  consumeEmailVerificationToken,
  ensureProviderWorkspace,
  findUserForLogin,
  findUserByEmail,
  findUserByResetTokenHash,
  createSelfRegisteredUser,
  setUserVerificationToken,
  setUserResetToken,
  applyPasswordReset
} from "@airegistry/core/auth/services";
export type { CsrfCookieDirective } from "@airegistry/core/auth/csrf";

export type {
  SessionCookieDirective,
  SignSessionCookieOptions,
  OneShotTokenBundle,
  ConsumeEmailVerificationResult,
  UserForLogin,
  CreateSelfRegisteredUserInput
} from "@airegistry/core/auth/services";

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

export {
  modelFor,
  PrismaErrorCode,
  isPrismaKnownError
} from "@airegistry/core/admin/ref-prisma";

export { linkContactsToUser } from "@airegistry/core/contacts/link-to-user";

export {
  listReferenceTable,
  getReferenceRow,
  countReferenceTable,
  findReferenceRowsByCodes,
  REFERENCE_TABLE_NAMES
} from "@airegistry/core/services/reference";
export type {
  ReferenceTableName,
  ReferenceRow,
  ListReferenceOptions
} from "@airegistry/core/services/reference";

export {
  loadProviderDashboardStats,
  loadVerifierDashboardStats,
  loadSovereignDashboardStats,
  loadMyResources,
  loadMySubmissions,
  loadMyReviews,
  loadMyComplaints,
  loadMyIncidents,
  loadMyContactRequests,
  loadVerifierQueue,
  loadVerifierDecided,
  loadVerifierEvalRuns,
  loadVerifierRedteamFindings,
  loadVerifierBenchmarkCorpus,
  loadSovereignCatalog,
  loadSovereignIncidents,
  loadSovereignPartners,
  loadSovereignResourcesForRisk,
  loadSovereignSectorMemberships,
  loadSovereignTopology,
  loadPortalHome,
  loadPortalResourceList,
  loadPortalResourceForOwner,
  loadProviderForSettings,
  loadProviderResourceForEdit,
  loadVerifierSettingsStats,
  loadSovereignSettingsView,
  loadSovereignPoliciesView,
  loadProviderAnalytics,
  loadSovereignReportsSnapshot,
  loadVerifierReportsSnapshot,
  loadAdminDashboardStats,
  loadAdminAuditLog,
  loadAdminComplaintsView,
  loadAdminContactsView,
  loadActiveProvidersForFilter,
  loadAdminBrandingForm,
  loadAdminReviewQueue,
  loadAdminReviewForDecide,
  loadAdminContactDetail,
  loadAdminProviderDetail,
  loadAdminResourceForEdit,
  loadAdminComplaintDetail,
  loadAdminSettingsProviderCount,
  loadBrandingSingleton,
  loadPublicJurisdictionsList,
  userExistsById,
  submitContactRecord,
  verifyContactSubmissionToken,
  findResourceForPublicReport,
  createPublicComplaint,
  findResourceByAirId,
  findProviderBySlugForComplaint,
  findComplaintSeverityByCode,
  createPublicComplaintRich,
  loadResourceTitleById,
  loadProviderSummaryById,
  updateMyProfile,
  updateProviderNotificationsConfig,
  updateProviderOrganisation,
  loadMyResourcesList,
  createMyResourceDraft,
  loadMyResourceForEdit,
  loadMyResourceLifecycle,
  applyMyResourceUpdate,
  submitMyResourceForReview
} from "@airegistry/core/services/portal";

export {
  searchResourcesRows,
  searchProvidersRows,
  searchComplaintsRows,
  searchReviewsRows,
  searchIncidentsRows,
  searchUsersRows
} from "@airegistry/core/services/portal-search";

export {
  loadAdminBrandingFull,
  updateAdminBrandingFields,
  setAdminBrandingAsset,
  clearAdminBrandingAsset,
  deleteAdminComplaintIfExists,
  loadComplaintForReply,
  loadComplaintForUpdate,
  findComplaintStatusById,
  findComplaintStatusByCode,
  findUserBasicById,
  applyAdminComplaintUpdate,
  deleteAdminContactIfExists,
  loadContactForReply,
  listAdminProvidersWithCount,
  findProviderBySlugBasic,
  findProviderBySlugWithJurisdiction,
  createAdminProvider,
  loadAdminProviderForEdit,
  applyAdminProviderUpdate,
  loadAdminProviderForDelete,
  deleteAdminProvider,
  loadAdminProviderForVerify,
  applyAdminProviderVerification,
  listAdminResourcesWithCount,
  findProviderBasicById,
  findResourceBySlugInProvider,
  createAdminResource,
  loadAdminResourceForView,
  loadAdminResourceForEditPrecheck,
  loadAdminResourceForDeleteWithCount,
  applyAdminResourceUpdate,
  loadAdminResourceForDelete,
  deleteAdminResource,
  loadAdminResourceForElevate,
  findOfficialAuthorityFull,
  applyAdminResourceElevate,
  loadAdminResourceForTransition,
  applyAdminResourceTransition,
  listAdminReviewsQueue,
  findReviewForDecide,
  applyAdminReviewDecision,
  listAdminUsersWithCount,
  findUserByEmailBasic,
  findProviderBySlugForAssign,
  createAdminUser,
  loadAdminUserForEdit,
  countOtherActiveAdmins,
  applyAdminUserUpdate,
  deleteAdminUser
} from "@airegistry/core/services/admin";
export type {
  AdminBrandingFullView,
  AdminBrandingAssetSlot,
  ComplaintReplyTarget,
  ComplaintForUpdate,
  ApplyComplaintUpdateInput,
  ContactReplyTarget,
  AdminProviderListRow,
  CreateAdminProviderInput,
  AdminProviderForEdit,
  AdminProviderForDelete,
  AdminProviderForVerify,
  ApplyProviderVerificationInput,
  AdminResourceListRow,
  CreateAdminResourceInput,
  ApplyAdminResourceUpdateInput,
  AdminResourceForDelete,
  ApplyAdminResourceElevateInput,
  ApplyAdminResourceTransitionInput,
  ApplyAdminReviewDecisionInput,
  AdminUserListRow,
  CreateAdminUserInput
} from "@airegistry/core/services/admin";

export {
  resolveResourceEdit,
  resolveAndApplyResourceEdit,
  type RawEditPayload
} from "@airegistry/core/services/resource-edit-apply";

export {
  getDraftState,
  listPendingResourceEdits,
  openOrGetDraft,
  updateDraft,
  saveDraftFull,
  submitDraft,
  approveDraft,
  rejectDraft,
  discardDraft,
  listVersions,
  diffVersionsScalar,
  VersioningError,
  VERSIONED_FIELDS
} from "@airegistry/core/services/resource-versioning";
export type {
  VersionedFieldPatch,
  VersionedFieldName,
  FieldDelta
} from "@airegistry/core/services/resource-versioning";

export {
  loadPortalNotifications,
  listPortalNotificationKeys,
  markNotificationsRead
} from "@airegistry/core/services/portal-notifications";
export type {
  PortalNotification,
  PortalRole,
  LoadNotificationsOptions
} from "@airegistry/core/services/portal-notifications";
export type {
  ProviderDashboardStats,
  VerifierDashboardStats,
  SovereignDashboardStats,
  ProviderResourceRow,
  ProviderSubmissionRow,
  ProviderReviewRow,
  ProviderComplaintRow,
  ProviderIncidentRow,
  ProviderContactRequestRow,
  VerifierReviewRow,
  VerifierDecidedRow,
  VerifierEvalRunRow,
  VerifierRedteamFindingRow,
  VerifierBenchmarkRow,
  SovereignCatalogRow,
  SovereignIncidentRow,
  SovereignPartnerRow,
  SovereignRiskResourceRow,
  SovereignSectorMembershipRow,
  SovereignTopologyProviderRow,
  PortalHomeView,
  PortalResourceListView,
  PortalResourceOwnerView,
  VerifierSettingsStats,
  SovereignSettingsView,
  SovereignPoliciesView,
  ProviderAnalyticsView,
  SovereignReportsSnapshot,
  VerifierReportsSnapshot,
  AdminDashboardStats,
  AdminAuditLogRow,
  AdminComplaintRow,
  AdminComplaintsView,
  AdminComplaintsFilter,
  AdminContactRow,
  AdminContactsView,
  ActiveProviderForFilter,
  AdminBrandingView,
  AdminProviderDetail,
  BrandingRow,
  PublicJurisdictionRow,
  SubmitContactInput,
  SubmitContactResult,
  VerifyContactTokenResult,
  CreatePublicComplaintInput,
  CreatePublicComplaintRichInput,
  ProfileUpdatePatch,
  ProfileUpdateResult,
  ProviderNotificationsPatch,
  UpdateProviderOrganisationInput,
  UpdateProviderOrganisationResult,
  MyResourceListRow,
  MyResourcesList,
  CreateMyResourceDraftInput,
  CreateMyResourceDraftResult,
  MyResourceEditView,
  MyResourceLifecycleSnapshot,
  ApplyMyResourceUpdateInput,
  MyResourceSubmitResult
} from "@airegistry/core/services/portal";

export { Prisma } from "@airegistry/core/generated/prisma";
