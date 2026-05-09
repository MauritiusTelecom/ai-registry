"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode
} from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  id?: string;
};

/**
 * Fade + translate a child into view when it scrolls past the threshold.
 * Mirrors the IntersectionObserver-based `Reveal` from the prototype.
 */
export function Reveal({
  children,
  delay = 0,
  as = "div",
  className,
  style,
  id
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => setVisible(true), delay);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  const composed = `reveal ${visible ? "in" : ""}${className ? ` ${className}` : ""}`.trim();

  // createElement keeps the ref-typing tractable across polymorphic tag names.
  return createElement(
    as,
    { ref, id, className: composed, style },
    children
  );
}
