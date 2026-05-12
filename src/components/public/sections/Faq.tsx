"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { Reveal } from "../Reveal";

const FAQS = [
  {
    q: "Does the registry host any AI?",
    a: "No. The registry only points. Providers operate their own resources, and hosting environments run the workloads. The registry is never on the runtime path."
  },
  {
    q: "How is sovereignty defined?",
    a: "A submission must cite at least one of: local law, local data, local systems, or local language and culture - with concrete evidence such as a referenced statute, dataset, or institutional integration."
  },
  {
    q: "What does “verified” mean?",
    a: "Provider verification confirms that the listing is bound to the rightful operator via DNS and email proofs. It does not imply endorsement of the resource itself."
  },
  {
    q: "Who can submit a resource?",
    a: "Any organisation or accredited individual that operates a sovereign AI resource can submit. Government endorsement is a separate, stronger signal granted only by the responsible authority."
  },
  {
    q: "Is the platform open source?",
    a: "Yes. The reference implementation at airegistry.mu and the AIR-SPEC are openly licensed. Each jurisdiction operates its own instance with local governance."
  },
  {
    q: "How are listings resolved at runtime?",
    a: "AIR-IDs (under air://) resolve to provider endpoints described in the listing metadata. Optionally, hosting environments issue SPIFFE/SPIRE SVIDs for runtime identity."
  }
];

export function Faq() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section className="section">
      <Reveal
        className="section-header"
        style={{ alignItems: "center", textAlign: "center", margin: "0 auto 56px" }}
      >
        <div className="eyebrow" style={{ margin: "0 auto" }}>
          <span className="dot" />
          <span>Common questions</span>
        </div>
        <h2 style={{ textAlign: "center" }}>
          <span className="gradient-text">Frequently Asked Questions</span>
        </h2>
      </Reveal>
      <div className="faq">
        {FAQS.map((item, idx) => (
          <Reveal key={item.q} delay={idx * 40}>
            <div className={`faq-item feature-card ${open === idx ? "open" : ""}`}>
              <button
                type="button"
                className="faq-q"
                onClick={() => setOpen(open === idx ? -1 : idx)}
              >
                {item.q}
                <span className="faq-icon">
                  <Icon name="plus" size={12} />
                </span>
              </button>
              <div className="faq-a">
                <div className="faq-a-inner">
                  <div className="faq-a-text">{item.a}</div>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
