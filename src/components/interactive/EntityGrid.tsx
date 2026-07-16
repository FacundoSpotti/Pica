'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — EntityGrid (reemplaza al scroll de entidades, TAREA 4)
// Una pantalla con TODAS las entidades de la temática como tarjetas. En vez de
// scrollear para elegir, ves todas y clickeás la deseada. Entrada animada
// (stagger) + hover llamativo (elevación + destello del color de la temática).
// ─────────────────────────────────────────────────────────────────────────────

import { motion, useReducedMotion } from 'framer-motion';
import EntityIcon from '@/components/interactive/EntityIcon';
import { TEMA_COLOR, TEMA_LABEL } from '@/lib/colors';
import { getCaracteristicas } from '@/lib/datasets';
import type { Tematica } from '@/types/sprites';

interface EntityGridProps {
  tema: Tematica;
  entidades: string[];
  onSelect: (entidad: string) => void;
}

export default function EntityGrid({ tema, entidades, onSelect }: EntityGridProps) {
  const color = TEMA_COLOR[tema];
  const shouldReduce = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: shouldReduce ? 0 : 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: shouldReduce ? 0 : 0.3 } },
  };

  return (
    // En mobile las tarjetas van a 1 columna (más alto que el viewport) →
    // scroll vertical; en desktop entra todo y queda centrado.
    <div className="flex h-full flex-col px-6 pb-10 pt-4 max-md:overflow-y-auto short:pb-4 short:pt-1 md:px-12">
      <header className="mb-8 text-center short:mb-3">
        <p
          className="font-display text-pica-subtitle font-bold uppercase"
          style={{ color, letterSpacing: '0.12em' }}
        >
          {TEMA_LABEL[tema]}
        </p>
        <h2 className="mt-1 font-display text-pica-heading-2 font-bold text-text-primary">
          ¿Qué querés explorar?
        </h2>
      </header>

      <motion.ul
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto grid w-full max-w-6xl flex-1 content-center grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 max-md:grid-cols-2 max-md:content-start max-md:gap-3 short:gap-3"
      >
        {entidades.map((entidad) => {
          const count = getCaracteristicas(tema, entidad).length;
          return (
            <motion.li key={entidad} variants={item}>
              <motion.button
                type="button"
                onClick={() => onSelect(entidad)}
                whileHover={shouldReduce ? undefined : { y: -6 }}
                aria-label={`Explorar ${entidad}`}
                className="group flex h-full w-full flex-col items-center gap-4 rounded-lg border-2 bg-gradient-to-b from-white/[0.06] to-white/[0.015] px-6 py-8 text-center transition-shadow max-md:gap-2 max-md:px-2 max-md:py-4 short:gap-2 short:py-4"
                style={{ borderColor: `${color}55` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${color}, 0 8px 30px -8px ${color}80`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${color}55`;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <EntityIcon entidad={entidad} color={color} size={72} />
                <span className="break-words font-display text-pica-title font-bold leading-none text-text-primary max-md:text-[22px] max-md:leading-6">
                  {entidad}
                </span>
                <span
                  className="font-sans text-pica-subtitle"
                  style={{ color }}
                >
                  {count} {count === 1 ? 'característica' : 'características'}
                </span>
              </motion.button>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
