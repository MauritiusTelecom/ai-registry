import { Icon, type IconName } from "../Icon";
import { Reveal } from "../Reveal";

// Bundle B (the composition the prototype's home page uses): six numbered stages
// from Submit -> Maintain.

const STAGES: { num: string; title: string; desc: string; icon: IconName }[] = [
  {
    num: "01",
    icon: "doc",
    title: "Submit",
    desc: "Provider supplies metadata, sovereignty evidence, contact, and terms of access."
  },
  {
    num: "02",
    icon: "shield",
    title: "Verify Provider",
    desc: "DNS/email proofs bind the listing to the rightful operator."
  },
  {
    num: "03",
    icon: "flag",
    title: "Review Sovereignty",
    desc: "Reviewers apply the published rubric. Notes are recorded and signed."
  },
  {
    num: "04",
    icon: "check",
    title: "Assign AIR-ID",
    desc: "A stable identifier under air:// is issued. Status published."
  },
  {
    num: "05",
    icon: "flow",
    title: "Discover & Resolve",
    desc: "Consumers and AI systems read metadata; access happens directly with the provider."
  },
  {
    num: "06",
    icon: "eye",
    title: "Maintain",
    desc: "Provider keeps the entry current. Audit trail is public and append-only."
  }
];

export function Orchestration() {
  return (
    <section className="section">
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>From Submission to Use</span>
        </div>
        <h2>
          The journey is short, deliberate, and{" "}
          <span className="gradient-text">exposes the boundaries</span>.
        </h2>
        <p>
          Step 5 — actually using the resource — happens directly between consumer and provider.
          The registry is never on the runtime path.
        </p>
      </Reveal>
      <Reveal>
        <div className="orch-stages">
          {STAGES.map((stage) => (
            <div className="orch-stage" key={stage.num}>
              <div className="orch-num">{stage.num}</div>
              <div className="orch-title">{stage.title}</div>
              <div className="orch-desc">{stage.desc}</div>
              <div className="orch-icon">
                <Icon name={stage.icon} size={14} />
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
