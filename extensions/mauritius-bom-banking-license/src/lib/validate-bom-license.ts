/**
 * Mauritius Bank of Mauritius licence number format check.
 *
 * Real BoM licence identifiers follow various formats depending on the
 * licence class (banking licence, payment institution licence, etc.).
 * This module accepts the documented pattern `BOM-<category>-<digits>`
 * (e.g. "BOM-BNK-12345"). Operators can tighten the regex over time.
 *
 * Like the BRN check, "format ok" is informational only - real
 * verification is the admin checking the uploaded BoM licence document.
 */

export type BomFormatResult = {
  licence: string;
  formatOk: boolean;
  category: string | null;
  reason?: string;
};

const BOM_REGEX = /^BOM-([A-Z]{2,4})-(\d{4,8})$/;

export function checkBomLicenceFormat(raw: string): BomFormatResult {
  const licence = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (licence.length === 0) {
    return { licence, formatOk: false, category: null, reason: "BoM licence is required." };
  }
  const m = BOM_REGEX.exec(licence);
  if (!m) {
    return {
      licence,
      formatOk: false,
      category: null,
      reason:
        "Expected format: BOM-<category>-<digits>, e.g. BOM-BNK-12345 (BNK = banking)."
    };
  }
  return { licence, formatOk: true, category: m[1] };
}
