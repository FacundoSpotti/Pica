'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — useCountUp
// Contador animado 0 → value con easing de desaceleración (easeOutCubic).
// Con reduced-motion devuelve el valor final directo.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export function useCountUp(value: number, reduced: boolean, durationMs = 1400): number {
  const [current, setCurrent] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setCurrent(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced, durationMs]);
  return current;
}
