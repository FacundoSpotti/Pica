'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — PerCapitaViz
// Tasa POR PERSONA: cada fila es "1 persona (afiliado) → N glifos" (ej. consultas
// médicas por afiliado). La persona en color ancla el "por cada uno" y los glifos
// muestran cuántas unidades le corresponden, para comparar prestadores de un
// vistazo. Se activa con B no-personas + `presentacion: 'per-capita'` (+ `glifo`).
// ─────────────────────────────────────────────────────────────────────────────

import { motion, useReducedMotion } from 'framer-motion';
import PixelIcon, { resolvePixelIcon } from '@/components/shared/PixelIcon';
import SpriteBadge from '@/components/shared/SpriteBadge';
import { TEMA_COLOR } from '@/lib/colors';
import type { DatasetDistribucion } from '@/types/data';
import { VizHeader, VizMeta } from './VizShared';

const GLYPH = 20;
const MAX_GLYPHS = 40;

export default function PerCapitaViz({ data }: { data: DatasetDistribucion }) {
  const shouldReduce = useReducedMotion();
  const color = TEMA_COLOR[data.tematica];
  const glyph = resolvePixelIcon(data.glifo, 'heart');
  const unidadSingular = (data.unidad ?? 'unidad').replace(/\/.*$/, '').replace(/s$/, '');

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} center />
      </div>

      <p className="mb-4 flex items-center justify-center gap-2 font-sans text-pica-subtitle text-text-muted">
        cada persona = 1 afiliado · cada
        <PixelIcon name={glyph} size={16} color={color} />
        = 1 {unidadSingular}
      </p>

      <ul className="flex w-full max-w-xl flex-col gap-4">
        {data.categorias.map((cat, ci) => {
          const c = cat.color ?? color;
          const n = Math.min(MAX_GLYPHS, Math.max(0, Math.round(cat.valor)));
          return (
            <li key={cat.label} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-3">
                <span className="font-sans text-pica-subtitle uppercase tracking-wide text-text-secondary">
                  {cat.label}
                </span>
                <span className="font-display text-pica-button font-bold" style={{ color: c }}>
                  {cat.valor.toLocaleString('es-UY')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-[3px]">
                <span className="mr-1 shrink-0">
                  <SpriteBadge models={['w-01']} color={c} height={34} />
                </span>
                {Array.from({ length: n }).map((_, gi) => (
                  <motion.span
                    key={gi}
                    initial={shouldReduce ? false : { opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: shouldReduce ? 0 : 0.22,
                      delay: shouldReduce ? 0 : ci * 0.06 + gi * 0.02,
                    }}
                    style={{ lineHeight: 0 }}
                  >
                    <PixelIcon name={glyph} size={GLYPH} color={c} />
                  </motion.span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <VizMeta
        dataset={data}
        table={{
          caption: data.caracteristica,
          head: ['Categoría', `Valor${data.unidad ? ` (${data.unidad})` : ''}`],
          rows: data.categorias.map((c) => [c.label, c.valor]),
        }}
      />
    </div>
  );
}
