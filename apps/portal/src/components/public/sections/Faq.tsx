"use client";

import { Accordion, Gradient, Reveal, type AccordionItem } from "@/components/library";

const ITEMS: AccordionItem[] = [
  {
    id: "host",
    question: "Does the registry host any AI?",
    answer:
      "No. The registry only points. Providers operate their own resources, and hosting environments run the workloads. The registry is never on the runtime path."
  },
  {
    id: "sovereignty",
    question: "How is sovereignty defined?",
    answer:
      "A submission must cite at least one of: local law, local data, local systems, or local language and culture - with concrete evidence such as a referenced statute, dataset, or institutional integration."
  },
  {
    id: "verified",
    question: 'What does "verified" mean?',
    answer:
      "Provider verification confirms that the listing is bound to the rightful operator via DNS and email proofs. It does not imply endorsement of the resource itself."
  },
  {
    id: "submit",
    question: "Who can submit a resource?",
    answer:
      "Any organisation or accredited individual that operates a sovereign AI resource can submit. Government endorsement is a separate, stronger signal granted only by the responsible authority."
  },
  {
    id: "open-source",
    question: "Is the platform open source?",
    answer:
      "Yes. The reference implementation at airegistry.mu and the AIR-SPEC are openly licensed. Each jurisdiction operates its own instance with local governance."
  },
  {
    id: "runtime",
    question: "How are listings resolved at runtime?",
    answer:
      "AIR-IDs (under air://) resolve to provider endpoints described in the listing metadata. Optionally, hosting environments issue SPIFFE/SPIRE SVIDs for runtime identity."
  }
];

export function Faq() {
  return (
    <section className="section">
      <Reveal
        className="section-header"
        style={{ alignItems: "center", textAlign: "center", margin: "0 auto 56px" }}
      >
        <p className="eyebrow" style={{ margin: "0 auto" }}>
          <span className="dot" />
          <span>Common questions</span>
        </p>
        <h2 style={{ textAlign: "center" }}>
          <Gradient>Frequently Asked Questions</Gradient>
        </h2>
      </Reveal>
      <Reveal delay={70}>
        <Accordion items={ITEMS} singleOpen defaultOpen="host" />
      </Reveal>
    </section>
  );
}
