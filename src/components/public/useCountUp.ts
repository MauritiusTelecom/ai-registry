"use client";

import { useEffect, useState } from "react";

/**
 * Cubic ease-out tween that animates from `start` to `target` over `duration` ms.
 * Mirrors `useCountUp` in airegistry-prototype/claudedesign/components/primitives.jsx.
 */
export function useCountUp(target: number, duration = 1400, start = 0): number {
  const [value, setValue] = useState(start);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // intentionally re-run when target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}
