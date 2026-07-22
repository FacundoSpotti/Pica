'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — IsotypeGlyphViz (device N1 del catálogo)
// Isotype de DOMINIO: para datos que NO son de personas pero sí contables en
// unidades (energía, agua, producción...). Cada categoría se dibuja como una
// hilera de un mismo glifo pixel repetido; "1 glifo = X unidad". Es el análogo
// no-humano del isotype de sprites (ver PICA-CATALOGO-VISUALIZACIONES.md · N1).
// Se activa cuando un dataset Tipo B (no-personas) trae `glifo`.
// ─────────────────────────────────────────────────────────────────────────────

import { motion, useReducedMotion } from 'framer-motion';
import PixelIcon, { resolvePixelIcon } from '@/components/shared/PixelIcon';
import { TEMA_COLOR } from '@/lib/colors';
import { niceClosest } from '@/lib/isotype';
import type { DatasetDistribucion } from '@/types/data';
import { VizHeader, VizMeta } from './VizShared';

const GLYPH = 22; // px por glifo
const TARGET = 90; // glifos totales apuntados (multitud legible, no miles)
const MAX_PER_CAT = 120; // techo por categoría para no reventar el DOM
const GRAY = '#4B4B46'; // resto en gris (remanente hasta 100% / contexto)

export default function IsotypeGlyphViz({ data }: { data: DatasetDistribucion }) {
  const shouldReduce = useReducedMotion();
  const color = TEMA_COLOR[data.tematica];
  const glyph = resolvePixelIcon(data.glifo, 'coins');

  // % → cada categoría es un bloque de 100 glifos: el valor en color y el
  // RESTO en gris (facilita comparar la proporción). Magnitud → 1 glifo = X.
  const esPorcentaje = data.unidad === '%';
  const sum = data.categorias.reduce((a, c) => a + Math.max(0, c.valor), 0) || 1;
  const per = niceClosest(sum / TARGET);
  const unidad = data.unidad && data.unidad !== '%' ? ` ${data.unidad}` : data.unidad === '%' ? '%' : '';
  const escala = esPorcentaje
    ? 'cada bloque = 100 glifos · el resto en gris'
    : per >= 1
      ? `1 glifo = ${per.toLocaleString('es-UY')}${unidad}`
      : `${Math.round(1 / per)} glifos = 1${unidad}`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} compact center />
      </div>

      <p className="mb-3 text-center font-sans text-pica-subtitle text-text-muted short:mb-1">
        {escala}
      </p>

      <ul className="flex w-full max-w-2xl flex-col gap-4 short:gap-2">
        {data.categorias.map((cat, ci) => {
          const c = cat.color ?? color;
          // % → 100 glifos (coloreados = valor, resto gris). Magnitud → valor/per.
          const colored = esPorcentaje
            ? Math.max(0, Math.min(100, Math.round(cat.valor)))
            : Math.min(MAX_PER_CAT, cat.valor === 0 ? 0 : Math.max(1, Math.round(cat.valor / per)));
          const totalGlyphs = esPorcentaje ? 100 : colored;
          return (
            <li key={cat.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span
                  className="font-sans text-pica-subtitle uppercase tracking-wide text-text-secondary"
                >
                  {cat.label}
                </span>
                <span className="font-display text-pica-button font-bold" style={{ color: c }}>
                  {cat.valor.toLocaleString('es-UY')}
                  {esPorcentaje ? '%' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-[3px]" aria-hidden="true">
                {Array.from({ length: totalGlyphs }).map((_, gi) => (
                  <motion.span
                    key={gi}
                    initial={shouldReduce ? false : { opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: shouldReduce ? 0 : 0.25,
                      delay: shouldReduce ? 0 : Math.min(1.2, ci * 0.08 + gi * 0.006),
                    }}
                    style={{ lineHeight: 0 }}
                  >
                    <PixelIcon name={glyph} size={GLYPH} color={gi < colored ? c : GRAY} />
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
