/**
 * Renders in slot `provider.settings.organisation.below` when
 * PLUGINS_ENABLED is on. Calls a server endpoint to load the current
 * provider's BRN status, then shows a small pill + format-check hint.
 *
 * Verification itself is manual (admin clicks Verify on /admin/brn-pending).
 * This panel just tells the provider where they stand.
 */

import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@airegistry/core";
import {
  checkBrnFormat,
  type BrnFormatResult
} from "@airegistry/extension-mauritius-brn-check/lib/validate-brn";

export default async function ProviderBrnPanel() {
  const user = await getCurrentUser();
  if (!user?.provider?.id) return null;

  const provider = await prisma.provider.findUnique({
    where: { id: user.provider.id },
    select: {
      registrationNumber: true,
      brnVerifiedAt: true,
      brnVerificationNote: true,
      homeJurisdiction: { select: { code: true } }
    }
  });
  if (!provider) return null;

  // The extension is Mauritius-specific. Hide for non-MU providers.
  if (provider.homeJurisdiction.code !== "MU") return null;

  const formatCheck: BrnFormatResult | null = provider.registrationNumber
    ? checkBrnFormat(provider.registrationNumber)
    : null;

  const verified = provider.brnVerifiedAt != null;
  const hasBrn = (provider.registrationNumber ?? "").trim().length > 0;

  let statusLabel: string;
  let statusColour: string;
  let blurb: string;

  if (verified) {
    statusLabel = "Verified";
    statusColour = "#16a34a";
    blurb = `BRN verified on ${provider.brnVerifiedAt!.toISOString().slice(0, 10)}. Your listing is publicly visible.`;
  } else if (!hasBrn) {
    statusLabel = "BRN missing";
    statusColour = "#a16207";
    blurb =
      "Add your Business Registration Number on this page. Until BRN is verified by Mauritius Telecom, your provider profile and resources are hidden from the public catalog.";
  } else if (formatCheck && !formatCheck.formatOk) {
    statusLabel = "Invalid format";
    statusColour = "#dc2626";
    blurb = formatCheck.reason ?? "BRN format is invalid.";
  } else {
    statusLabel = "Awaiting verification";
    statusColour = "#a16207";
    blurb = provider.brnVerificationNote
      ? `Last reviewer note: ${provider.brnVerificationNote}`
      : "Mauritius Telecom will manually verify your BRN against the Registrar of Companies. Upload your company-registration certificate under Verification documents to speed up review.";
  }

  return (
    <div
      data-plugin="mu-brn-check"
      className="glass"
      style={{ padding: 18, maxWidth: 720, marginTop: 16 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background: statusColour,
            color: "#fff",
            letterSpacing: "0.04em",
            textTransform: "uppercase"
          }}
        >
          {statusLabel}
        </span>
        <strong style={{ fontSize: 13 }}>Business Registration Number</strong>
      </div>
      {hasBrn ? (
        <p
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 13,
            margin: "0 0 6px 0",
            color: "var(--text-2)"
          }}
        >
          {provider.registrationNumber}
          {formatCheck?.entityType ? ` · ${formatCheck.entityType}` : ""}
        </p>
      ) : null}
      <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: 0, lineHeight: 1.5 }}>{blurb}</p>
    </div>
  );
}
