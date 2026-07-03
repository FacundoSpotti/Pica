'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipo D isotype: matriz comparativa con PERSONAS
// Grilla de mini-multitudes por dos dimensiones (ref. wireframe 5): la
// dimensión con MÁS categorías va en horizontal (una banda de color por
// categoría, chips abajo); la otra genera una fila de multitudes por valor,
// con su etiqueta a la izquierda. Los slots de columna están alineados entre
// filas para comparar de un vistazo. Escala total ~800 figuras.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef } from 'react';
import { TEMA_PALETTE, textOnColor } from '@/lib/colors';
import { figureCount, matrixScale } from '@/lib/isotype';
import { useSpriteWalkers, type WalkerTarget } from '@/hooks/useSpriteWalkers';
import type { DatasetMatriz } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const SCALE = 2;
// Bounding box real del contenido dentro del frame 17×43 (ver IsotypeDistributionViz)
const C_MIN_X = 4;
const C_MIN_Y = 13;
const C_W = 9;
const C_H = 17;
const GAP = 1;
const PITCH_X = (C_W + GAP) * SCALE;
const PITCH_Y = (C_H + GAP) * SCALE;
const MARGIN = 2 * SCALE;
/** Filas de figuras dentro de cada celda. */
const CELL_ROWS = 3;
/** Separación horizontal entre slots de columna. */
const SLOT_GAP = 12 * SCALE;

/** Una fila de la matriz: su propio canvas con su propio enjambre. */
function CrowdRow({
  targets,
  w,
  h,
  layoutKey,
}: {
  targets: WalkerTarget[];
  w: number;
  h: number;
  layoutKey: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useSpriteWalkers(ref, targets, { scale: SCALE, layoutKey });
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      aria-hidden="true"
      className="w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export default function IsotypeMatrixViz({ data }: { data: DatasetMatriz }) {
  const palette = TEMA_PALETTE[data.tematica];

  const { scale, hLabels, vLabels, rows, W, rowH, slots } = useMemo(() => {
    // La dimensión con más categorías va en horizontal
    const filasH = data.filas.length >= data.columnas.length;
    const hLabels = filasH ? data.filas : data.columnas;
    const vLabels = filasH ? data.columnas : data.filas;
    const valueAt = (v: number, h: number) =>
      filasH ? data.valores[h]![v]! : data.valores[v]![h]!;

    const sum = data.valores.flat().reduce((a, n) => a + n, 0);
    const scale = matrixScale(sum, data.unidad);

    // Slots de columna alineados: el ancho de cada categoría horizontal es el
    // máximo de sus celdas en todas las filas
    const counts = vLabels.map((_, v) => hLabels.map((_, h) => figureCount(valueAt(v, h), scale.per)));
    const slotCols = hLabels.map((_, h) =>
      Math.max(1, ...counts.map((row) => Math.ceil(row[h]! / CELL_ROWS))),
    );
    const slotW = slotCols.map((c) => (c - 1) * PITCH_X + C_W * SCALE);
    const W =
      MARGIN * 2 + slotW.reduce((a, w) => a + w, 0) + SLOT_GAP * (hLabels.length - 1);
    const rowH = MARGIN * 2 + (CELL_ROWS - 1) * PITCH_Y + C_H * SCALE;

    // Targets por fila vertical
    const slotX: number[] = [];
    let acc = MARGIN;
    slotW.forEach((w, h) => {
      slotX.push(acc);
      acc += w + SLOT_GAP;
    });

    const rows = vLabels.map((vLabel, v) => {
      const targets: WalkerTarget[] = [];
      hLabels.forEach((_, h) => {
        const n = counts[v]![h]!;
        const color = palette[h % palette.length]!;
        for (let j = 0; j < n; j++) {
          targets.push({
            x: slotX[h]! + Math.floor(j / CELL_ROWS) * PITCH_X - C_MIN_X * SCALE,
            y: MARGIN + (j % CELL_ROWS) * PITCH_Y - C_MIN_Y * SCALE,
            color,
          });
        }
      });
      return { vLabel, targets };
    });

    const slots = hLabels.map((label, h) => ({
      label,
      color: palette[h % palette.length]!,
      frac: (slotW[h]! + (h < hLabels.length - 1 ? SLOT_GAP : 0)) / (W - MARGIN * 2),
    }));

    return { scale, hLabels, vLabels, rows, W, rowH, slots };
  }, [data, palette]);

  const ariaLabel = `${data.caracteristica}: matriz de ${vLabels.join(', ')} según ${hLabels.join(
    ', ',
  )}. Escala: ${scale.label}. Valores completos en la tabla.`;

  return (
    <div>
      <VizHeader dataset={data} />

      <p className="mb-2 text-right font-sans text-pica-subtitle text-text-secondary">
        {scale.label}
      </p>

      {/* Matriz de multitudes */}
      <div role="img" aria-label={ariaLabel} className="grid gap-y-1" style={{ gridTemplateColumns: '7rem 1fr' }}>
        {rows.map(({ vLabel, targets }) => (
          <div key={vLabel} className="contents">
            <p className="self-center pr-3 text-right font-sans text-pica-paragraph text-text-secondary">
              {vLabel}
            </p>
            <CrowdRow targets={targets} w={W} h={rowH} layoutKey={`${data.id}:${vLabel}`} />
          </div>
        ))}

        {/* Chips de la dimensión horizontal, alineados a los slots */}
        <div aria-hidden="true" />
        <div className="mt-1 flex w-full" aria-hidden="true">
          {slots.map((s) => (
            <div key={s.label} style={{ width: `${s.frac * 100}%` }}>
              <span
                className="inline-block max-w-full truncate px-2 py-1 font-sans text-pica-subtitle"
                style={{ backgroundColor: s.color, color: textOnColor(s.color) }}
                title={s.label}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <DataTable
        caption={data.caracteristica}
        head={['', ...data.columnas]}
        rows={data.filas.map((f, i) => [f, ...data.valores[i]!])}
      />
      <VizFooter dataset={data} />
    </div>
  );
}
