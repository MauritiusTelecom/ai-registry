import { ImageResponse } from "next/og";
import { getBranding } from "@airegistry/core/branding";

/**
 * Dynamic social-share card (Open Graph + Twitter). Rendered as a PNG so it
 * works on WhatsApp / LinkedIn / Facebook / X / Slack — none of which render
 * the SVG favicon we previously pointed og:image at. Branded with the myt
 * palette (Telecom #140078 -> myt #143CDC, Aqua accent). Pulls the live
 * registry name / jurisdiction from branding so each jurisdiction's instance
 * gets its own card.
 */

export const runtime = "nodejs";
export const alt = "Mauritius AI Registry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const branding = await getBranding();
  const title = branding.registryName;
  const tagline = `The trusted registry for sovereign AI in ${branding.jurisdictionDisplayName}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0B0440 0%, #140078 45%, #143CDC 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif"
        }}
      >
        {/* top: domain eyebrow */}
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, color: "#9FE4EE" }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 16,
              background: "#00B4C8",
              marginRight: 16
            }}
          />
          {branding.portalDomain}
        </div>

        {/* middle: title + tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            {title}
          </div>
          <div style={{ fontSize: 40, color: "#C9D4FF", marginTop: 28, maxWidth: 940, lineHeight: 1.3 }}>
            {tagline}
          </div>
        </div>

        {/* bottom: powered-by + accent bar */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              width: 200,
              height: 8,
              borderRadius: 8,
              background: "linear-gradient(90deg, #00B4C8, #143CDC)",
              marginBottom: 22
            }}
          />
          <div style={{ fontSize: 28, color: "#AEB8E6" }}>Powered by Mauritius Telecom</div>
        </div>
      </div>
    ),
    size
  );
}
