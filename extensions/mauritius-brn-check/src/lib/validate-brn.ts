/**
 * Mauritius Business Registration Number (BRN) format check.
 *
 * BRN shape (Registrar of Companies): one letter + 8 digits, e.g.
 *   C12345678 - Company
 *   F12345678 - Foreign
 *   P12345678 - Partnership
 *   S12345678 - Sole trader
 *   A12345678 - Association
 *   T12345678 - Trust
 *
 * Verification of "does this BRN actually correspond to a real entity"
 * is **manual** today - an admin reviews the uploaded company
 * registration document and toggles the provider's brnVerifiedAt flag.
 * This module just validates the format.
 */

export type EntityType =
  | "company"
  | "foreign"
  | "partnership"
  | "sole_trader"
  | "association"
  | "trust"
  | "other";

export type BrnFormatResult = {
  brn: string;
  formatOk: boolean;
  entityType: EntityType | null;
  reason?: string;
};

const TYPE_BY_PREFIX: Record<string, EntityType> = {
  C: "company",
  F: "foreign",
  P: "partnership",
  S: "sole_trader",
  A: "association",
  T: "trust"
};

const BRN_REGEX = /^[A-Z][0-9]{8}$/;

export function normaliseBrn(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidBrnFormat(brn: string): boolean {
  return BRN_REGEX.test(brn);
}

export function entityTypeFor(brn: string): EntityType | null {
  if (!isValidBrnFormat(brn)) return null;
  return TYPE_BY_PREFIX[brn[0]] ?? "other";
}

export function checkBrnFormat(rawBrn: string): BrnFormatResult {
  const brn = normaliseBrn(rawBrn);
  if (brn.length === 0) {
    return {
      brn,
      formatOk: false,
      entityType: null,
      reason: "BRN is required."
    };
  }
  if (!isValidBrnFormat(brn)) {
    return {
      brn,
      formatOk: false,
      entityType: null,
      reason: "BRN must be one letter followed by 8 digits (e.g. C12345678)."
    };
  }
  return { brn, formatOk: true, entityType: entityTypeFor(brn) };
}
