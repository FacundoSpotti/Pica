'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — useIsMobile
// true bajo el breakpoint md (768px). Para decisiones de RENDER que no se
// resuelven con clases max-md: (ej. dónde montar un overlay). Arranca en false
// (SSR) y se corrige al montar.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}
