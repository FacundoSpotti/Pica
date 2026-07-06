'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — IconGridViz (device N5 del catálogo)
// Grilla de categorías, cada una con su ícono pixel + valor. Pensada para
// distribuciones con MUCHAS categorías (gasto por área, delitos por tipo,
// prestadores...). Las celdas cuya categoría trae `tema` se tintan con el
// color de esa temática de Pica — enlaza visualmente el dato con las secciones
// del sitio (ver PICA-CATALOGO-VISUALIZACIONES.md · N5).
// Se activa con un dataset Tipo B (no-personas) y `presentacion: 'grilla'`.
// ─────────────────────────────────────────────────────────────────────────────

import { motion, useReducedMotion } from 'framer-motion';
import PixelIcon, { resolvePixelIcon } from '@/components/shared/PixelIcon';
import { TEMA_COLOR } from '@/lib/colors';
import type { Tematica } from '@/types/sprites';
import type { DatasetDistribucion } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

export default function IconGridViz({ data }: { data: DatasetDistribucion }) {
  const shouldReduce = useReducedMotion();
  const base = TEMA_COLOR[data.tematica];

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} center />
      </div>

      <ul className="grid w-full max-w-3xl grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
        {data.categorias.map((cat, i) => {
          const tint = cat.tema ? TEMA_COLOR[cat.tema as Tematica] : cat.color ?? base;
          const highlighted = Boolean(cat.tema);
          const icon = resolvePixelIcon(cat.icono ?? cat.tema, 'building');
          return (
            <motion.li
              key={cat.label}
              initial={shouldReduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduce ? 0 : 0.3, delay: shouldReduce ? 0 : i * 0.03 }}
              className="flex flex-col gap-2 rounded-sm p-3"
              style={{
                background: highlighted ? `${tint}1A` : '#FFFFFF08',
                borderLeft: `3px solid ${tint}`,
              }}
            >
              <PixelIcon name={icon} size={28} color={tint} />
              <span className="font-sans text-pica-subtitle leading-tight text-text-secondary">
                {cat.label}
              </span>
              <span className="font-display text-pica-title font-bold" style={{ color: tint }}>
                {cat.valor.toLocaleString('es-UY')}
                {data.unidad === '%' ? '%' : ''}
              </span>
            </motion.li>
          );
        })}
      </ul>

      <div className="w-full">
        <DataTable
          caption={data.caracteristica}
          head={['Categoría', `Valor${data.unidad ? ` (${data.unidad})` : ''}`]}
          rows={data.categorias.map((c) => [c.label, c.valor])}
        />
        <VizFooter dataset={data} />
      </div>
    </div>
  );
}
