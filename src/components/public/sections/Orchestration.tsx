import {
  PageSection,
  Reveal,
  Icon,
  Gradient,
  type IconName
} from "@/components/library";

// Six numbered stages from Submit → Maintain. Each renders as a card in a
// horizontal strip; cards stack on narrower viewports. Layout mirrors the
// "ORCHESTRATION FLOW" reference design (eyebrow + title + desc + footer
// icon chip).
//
// The `.orch-stage` card is a bespoke CSS genre defined in globals.css and
// styled differently from the library's `<FeatureCard>` (it has a numbered
// header pill, a footer-positioned icon chip, and a specific hover ripple).
// Kept inline so the visual is preserved verbatim.

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
    <PageSection
      eyebrow="From Submission to Use"
      title={
        <>
          The journey is short, deliberate, and{" "}
          <Gradient>exposes the boundaries</Gradient>.
        </>
      }
      subtitle="Every resource walks the same six steps. The registry points; the provider operates; the hosting environment secures."
    >
      <Reveal>
        <div className="orch-stages">
          {STAGES.map((stage) => (
            <div className="orch-stage" key={stage.num}>
              <div className="orch-num">STAGE / {stage.num}</div>
              <div className="orch-title">{stage.title}</div>
              <div className="orch-desc">{stage.desc}</div>
              <div className="orch-icon">
                <Icon name={stage.icon} size={16} />
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </PageSection>
  );
}
