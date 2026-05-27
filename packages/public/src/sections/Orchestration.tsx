import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@airegistry/ui-kit";
import { Reveal } from "../shell/Reveal";

const STAGES: { num: string; titleKey: string; descKey: string; icon: IconName }[] = [
  { num: "01", icon: "doc", titleKey: "stage1Title", descKey: "stage1Desc" },
  { num: "02", icon: "shield", titleKey: "stage2Title", descKey: "stage2Desc" },
  { num: "03", icon: "flag", titleKey: "stage3Title", descKey: "stage3Desc" },
  { num: "04", icon: "check", titleKey: "stage4Title", descKey: "stage4Desc" },
  { num: "05", icon: "flow", titleKey: "stage5Title", descKey: "stage5Desc" },
  { num: "06", icon: "eye", titleKey: "stage6Title", descKey: "stage6Desc" }
];

export async function Orchestration() {
  const t = await getTranslations("orchestration");
  return (
    <section className="section">
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>{t("eyebrow")}</span>
        </div>
        <h2>
          {t("heading")}{" "}
          <span className="gradient-text">{t("headingAccent")}</span>.
        </h2>
        <p>{t("description")}</p>
      </Reveal>
      <Reveal>
        <div className="orch-stages">
          {STAGES.map((stage) => (
            <div className="orch-stage" key={stage.num}>
              <div className="orch-num">{t("stageLabel")} / {stage.num}</div>
              <div className="orch-title">{t(stage.titleKey as any)}</div>
              <div className="orch-desc">{t(stage.descKey as any)}</div>
              <div className="orch-icon">
                <Icon name={stage.icon} size={16} />
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
