"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "../chrome/Icon";

/**
 * Expand / collapse list. Each item has a click-to-toggle header with a
 * caret affordance and a body that slides open. By default at most one
 * item is open at a time (`singleOpen=true`); pass `singleOpen={false}` to
 * allow multiple panels open simultaneously.
 *
 * Replaces the hand-rolled accordion in the public-site Faq section.
 *
 *   <Accordion items={[
 *     { id: 'q1', question: 'Does the registry host AI?', answer: <>…</> },
 *     { id: 'q2', question: 'How is sovereignty defined?', answer: <>…</> }
 *   ]} />
 *
 * Uncontrolled by default. Pass `value` + `onChange` to control externally
 * (e.g. for URL-synced anchor expansion).
 */

export type AccordionItem = {
  id: string;
  question: ReactNode;
  answer: ReactNode;
};

export type AccordionProps = {
  items: AccordionItem[];
  /** When true, only one panel may be open at a time. Default true. */
  singleOpen?: boolean;
  /** Initial open item id (uncontrolled mode). */
  defaultOpen?: string;
  /** Controlled open id (or set of ids when `singleOpen=false`). */
  value?: string | string[] | null;
  /** Controlled change handler. */
  onChange?: (next: string | string[] | null) => void;
};

export function Accordion({
  items,
  singleOpen = true,
  defaultOpen,
  value,
  onChange
}: AccordionProps) {
  const [uncontrolled, setUncontrolled] = useState<string | string[] | null>(
    defaultOpen ??
      (singleOpen ? (items[0]?.id ?? null) : ([] as string[]))
  );
  const current = value !== undefined ? value : uncontrolled;
  const setCurrent = (next: string | string[] | null) => {
    if (onChange) onChange(next);
    else setUncontrolled(next);
  };

  const isOpen = (id: string): boolean => {
    if (Array.isArray(current)) return current.includes(id);
    return current === id;
  };

  const toggle = (id: string) => {
    if (singleOpen) {
      setCurrent(current === id ? null : id);
      return;
    }
    const arr = Array.isArray(current) ? current : current ? [current] : [];
    setCurrent(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  return (
    <div className="faq" style={{ display: "grid", gap: 10 }}>
      {items.map((item) => {
        const open = isOpen(item.id);
        return (
          <div
            key={item.id}
            className={`faq-item feature-card ${open ? "open" : ""}`}
          >
            <button
              type="button"
              className="faq-q"
              onClick={() => toggle(item.id)}
              aria-expanded={open}
              aria-controls={`acc-${item.id}`}
            >
              {item.question}
              <span className="faq-icon" aria-hidden>
                <Icon name={open ? "x" : "plus"} size={12} />
              </span>
            </button>
            <div
              id={`acc-${item.id}`}
              className="faq-a"
              role="region"
              aria-hidden={!open}
            >
              <div className="faq-a-inner">
                <div className="faq-a-text">{item.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
