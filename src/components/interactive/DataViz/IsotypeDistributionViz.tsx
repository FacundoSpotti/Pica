'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipo B isotype: distribución categórica con PERSONAS
// Cada figura es una persona (sprite del Home, tintado con una tonalidad del
// tema). Las figuras CAMINAN hasta su cluster al cargar (useSpriteWalkers).
// 1 figura = 0,5% → ~200 figuras, densas y a 2× de tamaño (ref. The Pudding).
//
// Layout por presupuesto de ancho: el total de columnas es fijo y se reparte
// proporcional al valor de cada categoría — los clusters crecen hacia abajo,
// así el tamaño visual de las figuras no depende de cuántas haya.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef } from 'react';
import { SPRITE_SHEET } from '@/lib/assets';
import { TEMA_PALETTE } from '@/lib/colors';
import { figureCount, figureScale } from '@/lib/isotype';
import { useSpriteWalkers, type WalkerTarget } from '@/hooks/useSpriteWalkers';
import type { DatasetDistribucion } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const SCALE = 2; // sprites a 2× (34×86 px lógicos)
const SW = SPRITE_SHEET.frameWidth * SCALE;
const SH = SPRITE_SHEET.frameHeight * SCALE;
const GAP_X = 4;
const GAP_Y = 6;
const CLUSTER_GAP = 36;
/** Columnas totales a repartir entre todas las categorías (presupuesto de ancho). */
const TOTAL_COLS = 20;

interface Cluster {
  label: string;
  valor: number;
  color: string;
  count: number;
  width: number;
}

export default function IsotypeDistributionViz({ data }: { data: DatasetDistribucion }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const palette = TEMA_PALETTE[data.tematica];

  const { scale, clusters, targets, W, H } = useMemo(() => {
    const total = data.categorias.reduce((a, c) => a + c.valor, 0);
    const scale = figureScale(total, data.unidad);
    const counts = data.categorias.map((c) => figureCount(c.valor, scale.per));
    const totalFigures = counts.reduce((a, n) => a + n, 0) || 1;

    // Repartir columnas proporcional al valor (mínimo 1 por categoría)
    const cols = counts.map((n) =>
      Math.max(1, Math.round((n / totalFigures) * TOTAL_COLS)),
    );

    const rows = counts.map((n, i) => Math.max(1, Math.ceil(n / cols[i]!)));
    const maxRows = Math.max(...rows);
    const H = maxRows * (SH + GAP_Y) - GAP_Y;

    const clusters: Cluster[] = [];
    const targets: WalkerTarget[] = [];
    let offsetX = 0;
    data.categorias.forEach((cat, i) => {
      const n = counts[i]!;
      const c = cols[i]!;
      const width = c * (SW + GAP_X) - GAP_X;
      const color = cat.color ?? palette[i % palette.length]!;
      const startY = H - rows[i]! * (SH + GAP_Y) + GAP_Y; // base alineada
      for (let j = 0; j < n; j++) {
        targets.push({
          x: offsetX + (j % c) * (SW + GAP_X),
          y: startY + Math.floor(j / c) * (SH + GAP_Y),
          color,
        });
      }
      clusters.push({ label: cat.label, valor: cat.valor, color, count: n, width });
      offsetX += width + CLUSTER_GAP;
    });
    const W = offsetX - CLUSTER_GAP;
    return { scale, clusters, targets, W, H };
  }, [data, palette]);

  useSpriteWalkers(canvasRef, targets, { scale: SCALE });

  const ariaLabel = `${data.caracteristica}: ${data.categorias
    .map((c) => `${c.label} ${c.valor}${data.unidad ?? ''}`)
    .join(', ')}. Cada figura representa ${scale.label.replace('1 figura = ', '')}.`;

  return (
    <div>
      <VizHeader dataset={data} />

      {/* Escala de figuras */}
      <p className="mb-3 text-right font-sans text-pica-subtitle text-text-secondary">
        {scale.label}
      </p>

      {/* Grilla de personas — el canvas es decorativo, la info está en aria + tabla */}
      <div role="img" aria-label={ariaLabel} className="w-full max-w-3xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          aria-hidden="true"
          className="w-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {/* Labels alineados a cada cluster (mismas fracciones que el canvas) */}
        <div className="mt-2 flex w-full" aria-hidden="true">
          {clusters.map((c, i) => (
            <div
              key={c.label}
              style={{
                width: `${((c.width + (i < clusters.length - 1 ? CLUSTER_GAP : 0)) / W) * 100}%`,
              }}
            >
              <p className="font-display text-pica-button font-bold" style={{ color: c.color }}>
                {c.valor.toLocaleString('es-UY')}
                {data.unidad === '%' ? '%' : ''}
              </p>
              <p className="pr-2 font-sans text-pica-subtitle leading-tight text-text-secondary">
                {c.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <DataTable
        caption={data.caracteristica}
        head={['Categoría', `Valor${data.unidad ? ` (${data.unidad})` : ''}`, 'Figuras']}
        rows={clusters.map((c) => [c.label, c.valor, c.count])}
      />
      <VizFooter dataset={data} />
    </div>
  );
}
