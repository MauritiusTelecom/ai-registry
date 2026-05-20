"use client";

import { useState } from "react";
import { Icon } from "@airegistry/ui-kit";
import { Reveal } from "../shell/Reveal";

export type FaqClientItem = {
  question: string;
  answer: string;
};

/**
 * Client-side accordion renderer for the FAQ section. The list of items is
 * passed in from the server-rendering `Faq` wrapper, which fetches from the
 * `cms_faq_entry` table. Splitting server/client keeps the data load on the
 * server while preserving the open/close interaction in the browser.
 */
export function FaqClient({ items }: { items: FaqClientItem[] }) {
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
        {items.map((item, idx) => (
          <Reveal key={item.question} delay={idx * 40}>
            <div className={`faq-item feature-card ${open === idx ? "open" : ""}`}>
              <button
                type="button"
                className="faq-q"
                onClick={() => setOpen(open === idx ? -1 : idx)}
              >
                {item.question}
                <span className="faq-icon">
                  <Icon name="plus" size={12} />
                </span>
              </button>
              <div className="faq-a">
                <div className="faq-a-inner">
                  <div className="faq-a-text">{item.answer}</div>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
