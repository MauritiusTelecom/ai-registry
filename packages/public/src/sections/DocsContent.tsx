import { getTranslations } from "next-intl/server";
import { getBranding } from "@airegistry/core/branding";
import { Reveal } from "../shell/Reveal";
import { PageHero } from "@airegistry/ui-kit";

const SECTION_IDS = ["overview", "air-id", "metadata", "verification", "review"] as const;

export async function DocsContent() {
  const [{ portalDomain }, t] = await Promise.all([
    getBranding(),
    getTranslations("docs")
  ]);

  const SECTIONS = SECTION_IDS.map((id) => ({
    id,
    label: t(`section_${id}_label` as any),
    body: t(`section_${id}_body` as any)
  }));

  return (
    <div>
      <PageHero
        crumb={t("crumb")}
        title={
          <>
            {t.rich("pageTitle", {
              accent: (chunks) => <span className="gradient-text">{chunks}</span>
            })}
          </>
        }
        subtitle={t("pageSubtitle", { portalDomain })}
      />
      <section className="section" style={{ paddingTop: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 48 }}>
          <Reveal>
            <div
              style={{
                position: "sticky",
                top: 100,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 12
              }}
            >
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  style={{ padding: "6px 10px", borderRadius: 6, color: "var(--text-2)" }}
                >
                  {section.label}
                </a>
              ))}
            </div>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {SECTIONS.map((section, idx) => (
              <Reveal key={section.id} delay={idx * 50}>
                <div id={section.id}>
                  <div className="eyebrow">
                    <span className="dot" />
                    <span>
                      § {String(idx + 1).padStart(2, "0")} {section.label}
                    </span>
                  </div>
                  <h3 style={{ marginTop: 12 }}>{section.label}</h3>
                  <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.65 }}>{section.body}</p>
                  <pre
                    style={{
                      marginTop: 14,
                      padding: 16,
                      background: "var(--code-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 12.5,
                      color: "var(--text-2)",
                      overflow: "auto"
                    }}
                  >{`# example
GET /.well-known/air-spec/${section.id}
→ 200 OK  application/yaml`}</pre>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
