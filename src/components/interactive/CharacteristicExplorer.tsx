'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — CharacteristicExplorer
// Con la entidad bloqueada: fila horizontal de características (scroll/swipe)
// que actualiza la visualización en tiempo real. ←/→ cambian de característica,
// Escape desbloquea la entidad. Transiciones ≤300ms (pica-interactive).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import VizRouter from './DataViz/VizRouter';
import ShareStory from './ShareStory';
import { TEMA_COLOR } from '@/lib/colors';
import { isPersonEntity } from '@/lib/isotype';
import type { Dataset } from '@/types/data';
import type { Tematica } from '@/types/sprites';

interface CharacteristicExplorerProps {
  tema: Tematica;
  entidad: string;
  datasets: Dataset[];
  activeId: string;
  onChangeCaracteristica: (id: string) => void;
  onUnlockEntidad: () => void;
}

export default function CharacteristicExplorer({
  tema,
  datasets,
  activeId,
  onChangeCaracteristica,
  onUnlockEntidad,
}: CharacteristicExplorerProps) {
  const color = TEMA_COLOR[tema];
  const shouldReduce = useReducedMotion();
  const activeIndex = Math.max(0, datasets.findIndex((d) => d.id === activeId));
  const active = datasets[activeIndex];
  // MVP de compartir: solo estadísticas de personas (isotype)
  const shareable = active ? isPersonEntity(active.entidad) || active.personas === true : false;

  // ←/→ cambian de característica; Escape vuelve a la lista de entidades
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && activeIndex < datasets.length - 1) {
        onChangeCaracteristica(datasets[activeIndex + 1]!.id);
      } else if (e.key === 'ArrowLeft' && activeIndex > 0) {
        onChangeCaracteristica(datasets[activeIndex - 1]!.id);
      } else if (e.key === 'Escape') {
        onUnlockEntidad();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, datasets, onChangeCaracteristica, onUnlockEntidad]);

  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-2 md:px-12">
      {/* Fila de características como pestañas, con una línea de margen a margen
          (full-bleed) que deja claro que se puede cambiar entre categorías. */}
      <div
        role="tablist"
        aria-label="Características disponibles"
        className="-mx-6 flex gap-5 overflow-x-auto border-b border-white/15 px-6 md:-mx-12 md:gap-8 md:px-12"
      >
        {datasets.map((d) => {
          const isActive = d.id === activeId;
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChangeCaracteristica(d.id)}
              className="-mb-px shrink-0 whitespace-nowrap border-b-2 px-1 pb-3 pt-1 font-display text-pica-button font-bold transition-colors max-md:py-3"
              style={{
                borderColor: isActive ? color : 'transparent',
                color: isActive ? color : '#A0A09A',
              }}
            >
              {d.caracteristica}
            </button>
          );
        })}
      </div>

      {/* Barra: compartir (solo estadísticas de personas en el MVP) */}
      {active && shareable && (
        <div className="mt-3 flex justify-end">
          <ShareStory dataset={active} />
        </div>
      )}

      {/* Visualización activa — encabezado anclado arriba (nunca se corta el
          título) + viz centrada debajo, sin scroll en desktop. En MOBILE el
          contenido suele ser más alto que el viewport → scroll vertical. */}
      <div className="mt-3 flex min-h-0 flex-1 items-start justify-center overflow-hidden max-md:overflow-y-auto">
        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduce ? 0 : -20 }}
              transition={{ duration: shouldReduce ? 0 : 0.3 }}
              className="mx-auto w-full"
            >
              <VizRouter dataset={active} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
