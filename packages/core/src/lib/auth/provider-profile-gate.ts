/**
 * Provider authoring gate (T030–T032).
 *
 * `canAuthorResources` is true only when the account is email-verified,
 * onboarding is marked complete, and a linked Provider row satisfies
 * required profile fields.
 */

export type ProviderGateFields = {
  slug: string;
  displayName: string;
  contactEmail: string;
  homeJurisdictionId: string;
  typeId: string;
};

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function isProviderProfileComplete(p: ProviderGateFields | null | undefined): boolean {
  if (!p) return false;
  const slug = p.slug?.trim() ?? "";
  const displayName = p.displayName?.trim() ?? "";
  const contactEmail = p.contactEmail?.trim() ?? "";
  if (slug.length < 2 || displayName.length < 2) return false;
  if (!EMAIL_RE.test(contactEmail)) return false;
  if (!p.homeJurisdictionId || !p.typeId) return false;
  return true;
}

export function computeCanAuthorResources(
  user: {
    emailVerified: boolean;
    onboardingComplete: boolean;
    roleCode: string;
  },
  provider: ProviderGateFields | null | undefined
): boolean {
  if (user.roleCode !== "provider") return false;
  if (!user.emailVerified || !user.onboardingComplete) return false;
  return isProviderProfileComplete(provider);
}
