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
import { TEMA_COLOR } from '@/lib/colors';
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
  entidad,
  datasets,
  activeId,
  onChangeCaracteristica,
  onUnlockEntidad,
}: CharacteristicExplorerProps) {
  const color = TEMA_COLOR[tema];
  const shouldReduce = useReducedMotion();
  const activeIndex = Math.max(0, datasets.findIndex((d) => d.id === activeId));
  const active = datasets[activeIndex];

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
      {/* Entidad bloqueada + volver */}
      <div className="mb-4 flex items-center gap-4">
        <button
          type="button"
          onClick={onUnlockEntidad}
          aria-label="Volver a la lista de entidades"
          className="font-sans text-pica-paragraph text-text-secondary underline-offset-4 hover:underline"
        >
          ← {entidad}
        </button>
        <span aria-hidden="true" className="text-text-muted">·</span>
        <p className="font-sans text-pica-subtitle text-text-muted">
          ←/→ para recorrer características · Esc para cambiar de entidad
        </p>
      </div>

      {/* Fila horizontal de características */}
      <div
        role="tablist"
        aria-label="Características disponibles"
        className="flex snap-x gap-2 overflow-x-auto pb-2"
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
              className="shrink-0 snap-start whitespace-nowrap border-b-2 px-4 py-2 font-display text-pica-button font-bold transition-colors"
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

      {/* Visualización activa */}
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduce ? 0 : -20 }}
              transition={{ duration: shouldReduce ? 0 : 0.3 }}
            >
              <VizRouter dataset={active} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
