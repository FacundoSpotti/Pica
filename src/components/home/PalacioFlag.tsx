'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — PalacioFlag
// Al clickear el Palacio, en su punta aparece un mástil y la bandera de
// Uruguay SE IZA: el mástil crece primero y la bandera sube desde la base
// hasta la punta (movimiento de abajo hacia arriba), flameando.
// El tamaño escala con el ancho del stage (se ve proporcional en cualquier
// resolución). La posición viene de PALACIO_FLAG_ANCHOR (calibrable con B).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import UruguayFlag from '@/components/shared/UruguayFlag';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface PalacioFlagProps {
  anchor: { x: number; y: number };
}

export default function PalacioFlag({ anchor }: PalacioFlagProps) {
  const shouldReduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  // Escala con el stage: bandera ~24px en un stage de 900px de ancho
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = rootRef.current?.parentElement;
    if (!el) return;
    const update = () =>
      setScale(Math.min(1.6, Math.max(0.7, el.clientWidth / 900)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const flagH = Math.round(24 * scale);
  const poleH = Math.round(58 * scale);
  const poleW = Math.max(2, Math.round(2.5 * scale));

  return (
    // Sin z-index propio: el orden del DOM la deja DETRÁS de las capas del
    // Palacio (el mástil sale de atrás del edificio, no tapa el diseño).
    <div
      ref={rootRef}
      className="pointer-events-none absolute"
      style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }}
    >
      <motion.div
        className="relative"
        style={{ transform: 'translate(-50%, -100%)', width: poleW }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
      >
        {/* Mástil: crece de abajo hacia arriba */}
        <motion.div
          className="origin-bottom"
          style={{ width: poleW, background: '#D8D8D2' }}
          initial={{ height: shouldReduce ? poleH : 0 }}
          animate={{ height: poleH }}
          transition={shouldReduce ? { duration: 0 } : { duration: 0.4, ease: EASE }}
        />
        {/* Remate del mástil */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: -poleW * 2,
            width: poleW * 2,
            height: poleW * 2,
            background: '#FCD116',
          }}
          initial={{ opacity: shouldReduce ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduce ? { duration: 0 } : { delay: 0.35, duration: 0.2 }}
        />
        {/* La bandera SUBE por el mástil: de la base a la punta */}
        <motion.div
          className="absolute"
          style={{ left: poleW }}
          initial={{ top: shouldReduce ? 0 : poleH - flagH, opacity: shouldReduce ? 1 : 0 }}
          animate={{ top: 0, opacity: 1 }}
          transition={
            shouldReduce
              ? { duration: 0 }
              : { delay: 0.4, duration: 1.1, ease: EASE, opacity: { delay: 0.4, duration: 0.25 } }
          }
        >
          <UruguayFlag height={flagH} />
        </motion.div>
      </motion.div>
    </div>
  );
}
