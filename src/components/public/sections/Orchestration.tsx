"use client";

import { useState } from "react";
import { Icon, type IconName } from "../Icon";
import { Reveal } from "../Reveal";

// Bundle B (the composition the prototype's home page uses): six numbered
// stages from Submit -> Maintain, now surfaced as a horizontal tab strip
// with a single content panel beneath. Clicking a tab swaps the panel.

type Stage = { num: string; title: string; desc: string; icon: IconName };

const STAGES: Stage[] = [
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
  const [activeIdx, setActiveIdx] = useState(0);
  const active = STAGES[activeIdx];

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
        <div
          className="orch-tabs"
          role="tablist"
          aria-label="Resource journey stages"
        >
          {STAGES.map((stage, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={stage.num}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`orch-tab ${isActive ? "active" : ""}`}
                onClick={() => setActiveIdx(i)}
              >
                <span className="orch-tab-num">{stage.num}</span>
                <span className="orch-tab-title">{stage.title}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal>
        <div className="orch-panel glass" role="tabpanel">
          <div className="orch-panel-head">
            <div className="orch-panel-icon">
              <Icon name={active.icon} size={18} />
            </div>
            <div>
              <div className="orch-panel-num">{active.num}</div>
              <div className="orch-panel-title">{active.title}</div>
            </div>
          </div>
          <p className="orch-panel-desc">{active.desc}</p>
        </div>
      </Reveal>
    </section>
  );
}
