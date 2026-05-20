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
 *
 * Robustness:
 * - On mount, immediately reveals if the element is already in viewport (avoids
 *   stuck-invisible state when navigating back to a page that was scrolled mid-way).
 * - Re-evaluates on the `pageshow` event so bfcache restoration (browser back/forward
 *   on Safari/Chrome) doesn't leave sections hidden when the IntersectionObserver
 *   callback never fires.
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

    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      window.setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, delay);
    };

    // 1) If already in viewport at mount time, reveal immediately.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const inView =
      rect.top < vh * 0.95 && rect.bottom > 0 && rect.left < vw && rect.right > 0;
    if (inView) {
      reveal();
    }

    // 2) IntersectionObserver for scroll-into-view (works for elements still below the fold).
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);

    // 3) bfcache restoration: when the user navigates back from another page, browsers
    //    may restore the page without re-running effects. `pageshow` with `persisted=true`
    //    indicates a bfcache restore — re-check visibility then.
    const onPageShow = (ev: PageTransitionEvent) => {
      if (!ev.persisted) return;
      const r = el.getBoundingClientRect();
      const innerH = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < innerH * 0.95 && r.bottom > 0) {
        setVisible(true);
      }
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      cancelled = true;
      io.disconnect();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [delay]);

  const composed = `reveal ${visible ? "in" : ""}${className ? ` ${className}` : ""}`.trim();

  // createElement keeps the ref-typing tractable across polymorphic tag names.
  return createElement(
    as,
    { ref, id, className: composed, style },
    children
  );
}
