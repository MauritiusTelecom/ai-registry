import { listActiveListingCriteria } from "@airegistry/core/services/public-cms";
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@airegistry/ui-kit";
import { Reveal } from "../shell/Reveal";

// "Listing criteria" — the sovereignty test. Left panel explains how it works
// and the quality-over-quantity stance; right panel is a 2x2 grid of the four
// sovereignty bases. The bases come from cms_listing_criterion; the tone
// (primary / tertiary / secondary / emerald) is derived from sortOrder mod 4
// so the colour rotation stays stable across reorders without storing it.

type Tone = "primary" | "tertiary" | "secondary" | "emerald";

type Basis = {
  icon: IconName;
  title: string;
  desc: string;
  tone: Tone;
};

const TONE_CYCLE: Tone[] = ["primary", "tertiary", "secondary", "emerald"];

const TONE: Record<Tone, { rgb: string; color: string }> = {
  primary: { rgb: "var(--primary-rgb)", color: "var(--primary)" },
  tertiary: { rgb: "var(--tertiary-rgb)", color: "var(--tertiary)" },
  secondary: { rgb: "var(--secondary-rgb)", color: "var(--secondary)" },
  emerald: { rgb: "16, 185, 129", color: "#10b981" }
};

function getFallbackBases(t: (key: string) => string): Basis[] {
  return [
    { icon: "flag", title: t("base1Name"), desc: t("base1Desc"), tone: "primary" },
    { icon: "database", title: t("base2Name"), desc: t("base2Desc"), tone: "tertiary" },
    { icon: "lock", title: t("base3Name"), desc: t("base3Desc"), tone: "secondary" },
    { icon: "globe", title: t("base4Name"), desc: t("base4Desc"), tone: "emerald" }
  ];
}

/**
 * Normalise the DB's `iconName` (string) to ui-kit's `IconName` enum. Falls
 * back to the neutral "check" icon if the operator typed something unknown,
 * so the renderer never breaks on bad CMS data.
 */
function toIconName(name: string | null | undefined): IconName {
  const allowed: IconName[] = [
    "flag", "database", "lock", "globe", "shield", "eye", "check", "doc",
    "cpu", "agent", "users", "settings", "activity", "audit", "layers",
    "zap", "search", "home-alt"
  ];
  if (name && (allowed as string[]).includes(name)) return name as IconName;
  return "check";
}

export async function ListingCriteria() {
  const t = await getTranslations("listingCriteria");
  const fallbackBases = getFallbackBases(t);
  let bases: Basis[];
  try {
    const rows = await listActiveListingCriteria();
    bases = rows.length
      ? rows.map((r, i) => ({
          icon: toIconName(r.iconName),
          title: r.title,
          desc: r.description,
          tone: TONE_CYCLE[i % TONE_CYCLE.length]
        }))
      : fallbackBases;
  } catch {
    bases = fallbackBases;
  }

  return (
    <section className="section">
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>{t("eyebrow")}</span>
        </div>
        <h2>
          {t("headingPrefix")} <span className="gradient-text">{t("headingAccent")}</span>
        </h2>
        <p>{t("description")}</p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
            gap: 22
          }}
          className="listing-criteria-grid"
        >
          <div
            style={{
              padding: 28,
              borderRadius: 18,
              border: "1px solid var(--border-strong)",
              background:
                "radial-gradient(300px 200px at 0% 0%, rgba(var(--primary-rgb),0.12), transparent 60%), var(--panel)"
            }}
          >
            <h3
              style={{
                fontSize: 22,
                fontWeight: 500,
                margin: "0 0 8px",
                letterSpacing: "-0.015em"
              }}
            >
              {t("howItWorks")}
            </h3>
            <p
              style={{
                color: "var(--text-2)",
                margin: "0 0 16px",
                fontSize: 14.5,
                lineHeight: 1.6
              }}
            >
              {t.rich("howItWorksDesc", {
                highlight: (chunks) => (
                  <span
                    style={{
                      background:
                        "linear-gradient(13deg, rgba(var(--primary-rgb),0.22), rgba(var(--tertiary-rgb),0.22))",
                      color: "var(--text)",
                      padding: "1px 7px",
                      borderRadius: 5,
                      fontWeight: 500
                    }}
                  >
                    {chunks}
                  </span>
                )
              })}
            </p>
            <div
              style={{
                marginTop: 18,
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.30)",
                color: "var(--text-2)",
                fontSize: 13,
                lineHeight: 1.55
              }}
            >
              <strong style={{ color: "#f59e0b", fontWeight: 500 }}>
                {t("qualityTitle")}
              </strong>{" "}
              {t("qualityBody")}
            </div>
          </div>

          {/* Right: 2x2 grid of sovereignty bases */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14
            }}
            className="listing-criteria-bases"
          >
            {bases.map((b) => {
              const tone = TONE[b.tone];
              return (
                <div
                  key={b.title}
                  style={{
                    padding: 18,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--panel)",
                    transition: "border-color 200ms"
                  }}
                  className="feature-card"
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      marginBottom: 12,
                      background: `rgba(${tone.rgb}, 0.15)`,
                      color: tone.color,
                      border: `1px solid rgba(${tone.rgb}, 0.30)`
                    }}
                  >
                    <Icon name={b.icon} size={18} stroke={1.8} />
                  </div>
                  <h4
                    style={{
                      margin: "0 0 6px",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--text)"
                    }}
                  >
                    {b.title}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-2)",
                      fontSize: 13.5,
                      lineHeight: 1.55
                    }}
                  >
                    {b.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
