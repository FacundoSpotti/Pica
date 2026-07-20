'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — PixelBarsViz (Tipo C, datos que NO son personas)
// Reemplaza a la línea D3 (TimeSeriesViz): "desentonaba con la estética"
// (feedback de Facundo). Cada período es una TORRE DE BLOQUES PIXEL:
// 1 bloque = X unidades (escala declarada), las torres crecen desde el piso
// al entrar. El valor se muestra siempre en el máximo y el último período,
// y en cualquier columna al pasar el cursor. Tabla de datos debajo (a11y).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TEMA_COLOR } from '@/lib/colors';
import { niceClosest } from '@/lib/isotype';
import type { DatasetSerie } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const BLOCK_H = 9; // alto de cada bloque (px)
const BLOCK_GAP = 2;
const TARGET_BLOCKS = 16; // altura objetivo de la torre más alta
const COL_MAX_W = 26;

const fmt = (n: number) => n.toLocaleString('es-UY', { maximumFractionDigits: 2 });

export default function PixelBarsViz({ data }: { data: DatasetSerie }) {
  const shouldReduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const color = TEMA_COLOR[data.tematica];

  const maxV = Math.max(...data.puntos.map((p) => p.valor), 0);
  const per = niceClosest(maxV / TARGET_BLOCKS);
  const blocksOf = (v: number) => (v <= 0 ? 0 : Math.max(1, Math.round(v / per)));
  const maxBlocks = Math.max(...data.puntos.map((p) => blocksOf(p.valor)));

  const n = data.puntos.length;
  const lastIdx = n - 1;
  const maxIdx = data.puntos.findIndex((p) => p.valor === maxV);
  // Etiquetas del eje X: cada k períodos + el último (sin chocarse)
  const k = Math.ceil(n / 7);
  const showPeriod = (i: number) => i === lastIdx || (i % k === 0 && lastIdx - i >= k / 2);

  const unidadSufijo = data.unidad === '%' ? '%' : '';
  const unidadLabel = data.unidad === '%' ? '%' : data.unidad ? ` ${data.unidad}` : '';
  const towersH = maxBlocks * (BLOCK_H + BLOCK_GAP) + 34; // + espacio del valor

  const first = data.puntos[0]!;
  const last = data.puntos[lastIdx]!;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} center />
      </div>

      <p className="mb-3 text-center font-sans text-pica-subtitle text-text-muted">
        1 bloque = {per.toLocaleString('es-UY')}
        {unidadLabel}
      </p>

      {/* Torres */}
      <div
        role="img"
        aria-label={`${data.caracteristica}: de ${first.valor}${unidadSufijo} en ${first.periodo} a ${last.valor}${unidadSufijo} en ${last.periodo}. Detalle completo en la tabla de datos.`}
        className="flex w-full max-w-xl items-end justify-center gap-1"
        style={{ height: towersH }}
      >
        {data.puntos.map((p, i) => {
          const blocks = blocksOf(p.valor);
          const towerH = blocks * (BLOCK_H + BLOCK_GAP);
          const showValue = hover === i || (hover === null && (i === maxIdx || i === lastIdx));
          return (
            <div
              key={p.periodo + i}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-end"
              style={{ maxWidth: COL_MAX_W }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {showValue && (
                <span
                  className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap font-display text-pica-subtitle font-bold"
                  style={{ bottom: towerH + 6, color: hover === i ? '#EBEBEB' : color }}
                >
                  {fmt(p.valor)}
                  {unidadSufijo}
                </span>
              )}
              <motion.div
                className="flex w-full flex-col"
                style={{ gap: BLOCK_GAP, originY: 1 }}
                initial={shouldReduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={
                  shouldReduce
                    ? { duration: 0 }
                    : { duration: 0.45, delay: Math.min(1, i * 0.04), ease: [0.22, 1, 0.36, 1] }
                }
              >
                {Array.from({ length: blocks }).map((_, b) => (
                  <span
                    key={b}
                    className="block w-full"
                    style={{
                      height: BLOCK_H,
                      background: color,
                      // el bloque superior más claro: remate pixel de la torre
                      filter: b === 0 ? 'brightness(1.35)' : hover === i ? 'brightness(1.15)' : undefined,
                    }}
                  />
                ))}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Eje X: períodos (cada k, siempre el último) */}
      <div aria-hidden="true" className="mt-1 flex w-full max-w-xl justify-center gap-1">
        {data.puntos.map((p, i) => (
          <div key={p.periodo + i} className="min-w-0 flex-1 text-center" style={{ maxWidth: COL_MAX_W }}>
            {showPeriod(i) && (
              <span
                className="block whitespace-nowrap font-sans text-[13px] leading-tight"
                style={{ color: i === lastIdx ? '#A0A09A' : '#606058' }}
              >
                {p.periodo}
              </span>
            )}
          </div>
        ))}
      </div>

      <DataTable
        caption={data.caracteristica}
        head={['Período', `Valor${data.unidad ? ` (${data.unidad})` : ''}`]}
        rows={data.puntos.map((p) => [p.label ? `${p.periodo} (${p.label})` : p.periodo, p.valor])}
      />
      <VizFooter dataset={data} />
    </div>
  );
}
