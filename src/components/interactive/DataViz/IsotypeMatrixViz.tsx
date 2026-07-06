'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipo D isotype: matriz comparativa con PERSONAS (v2)
// Grilla de mini-multitudes por dos dimensiones, con las calibraciones
// validadas en el Tipo C:
// · El bloque se dimensiona al ESPACIO MEDIDO (ancho y alto disponibles) y la
//   escala de figuras se afina hasta llenar el ancho — sin scroll, sin quedar
//   chico en pantallas grandes.
// · Cada fila es un canvas con sangrado horizontal: las figuras entran
//   caminando desde los bordes del área, no desde una caja recortada.
// · La dimensión con MÁS categorías va en horizontal (color por categoría,
//   chips abajo); la otra genera las filas, con etiqueta a la izquierda.
// · Slots de columna alineados entre filas para comparar de un vistazo.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { interpolateRgb } from 'd3';
import { TEMA_PALETTE, textOnColor } from '@/lib/colors';
import { figureCount, matrixScale, perLabel } from '@/lib/isotype';
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
const CELL_ROWS = 4;
/** Separación horizontal entre slots de columna. */
const SLOT_GAP = 12 * SCALE;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Paso más fino de la secuencia 1/2/5 (para llenar el ancho disponible). */
function finerPer(per: number): number {
  const e = 10 ** Math.floor(Math.log10(per));
  const m = Math.round(per / e);
  if (m >= 5) return 2 * e;
  if (m >= 2) return e;
  return e / 2;
}

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
  const gridRef = useRef<HTMLDivElement>(null);

  // Espacio disponible medido (columna de contenido, sin la de etiquetas)
  const [fit, setFit] = useState({ cw: 1000, ah: 420 });
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setFit({
        cw: Math.max(360, el.clientWidth - 112 /* columna de etiquetas (7rem) */),
        ah: Math.max(240, window.innerHeight - rect.top - 150),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const { label, hLabels, vLabels, rows, canvasW, rowH, chipsW, slots } = useMemo(() => {
    // La dimensión con más categorías va en horizontal
    const filasH = data.filas.length >= data.columnas.length;
    const hLabels = filasH ? data.filas : data.columnas;
    const vLabels = filasH ? data.columnas : data.filas;
    const valueAt = (v: number, h: number) =>
      filasH ? data.valores[h]![v]! : data.valores[v]![h]!;

    const sum = data.valores.flat().reduce((a, n) => a + n, 0);
    let per = matrixScale(sum, data.unidad).per;
    const rowH = MARGIN * 2 + (CELL_ROWS - 1) * PITCH_Y + C_H * SCALE;
    // Alto disponible por fila (reservando chips y separación entre filas)
    const rowBudget = Math.max(90, (fit.ah - 48) / vLabels.length - 4);

    const compute = (p: number) => {
      const counts = vLabels.map((_, v) => hLabels.map((_, h) => figureCount(valueAt(v, h), p)));
      const slotCols = hLabels.map((_, h) =>
        Math.max(1, ...counts.map((row) => Math.ceil(row[h]! / CELL_ROWS))),
      );
      const slotW = slotCols.map((c) => (c - 1) * PITCH_X + C_W * SCALE);
      const crowdW = slotW.reduce((a, w) => a + w, 0) + SLOT_GAP * (hLabels.length - 1);
      const total = counts.flat().reduce((a, n) => a + n, 0);
      return { counts, slotW, crowdW, total };
    };

    // Afinar la escala hasta llenar el ancho disponible (cap ~2.500 figuras)
    let m = compute(per);
    for (let i = 0; i < 8; i++) {
      const heightView = rowBudget / rowH;
      if (m.crowdW * heightView >= fit.cw * 0.88 || m.total > 2500) break;
      const f = finerPer(per);
      if (f === per) break;
      per = f;
      m = compute(per);
    }

    const view = clamp(Math.min(fit.cw / (m.crowdW + MARGIN * 2), rowBudget / rowH), 0.3, 1.8);
    // Canvas con sangrado horizontal: cubre el ancho del área (full-bleed)
    const canvasW = Math.max(m.crowdW + MARGIN * 2, Math.floor(fit.cw / view));

    // Posiciones: multitudes alineadas a la izquierda (junto a las etiquetas)
    const slotX: number[] = [];
    let acc = MARGIN;
    m.slotW.forEach((w) => {
      slotX.push(acc);
      acc += w + SLOT_GAP;
    });

    // Tonalidad por fila: cada año usa una variación del color de su columna
    // (el más reciente a color pleno, los anteriores progresivamente apagados)
    // — marca la diferencia entre grupos de distintos años sin perder la
    // identidad de la categoría. Práctica a repetir en el resto del sitio.
    const shadeFor = (base: string, v: number) =>
      interpolateRgb(base, '#0A0A0A')((0.42 * (vLabels.length - 1 - v)) / Math.max(1, vLabels.length - 1));

    const rows = vLabels.map((vLabel, v) => {
      const targets: WalkerTarget[] = [];
      hLabels.forEach((_, h) => {
        const n = m.counts[v]![h]!;
        const color = shadeFor(palette[h % palette.length]!, v);
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
      frac: (m.slotW[h]! + (h < hLabels.length - 1 ? SLOT_GAP : 0)) / m.crowdW,
    }));

    return {
      label: perLabel(per, data.unidad),
      hLabels,
      vLabels,
      rows,
      canvasW,
      rowH,
      chipsW: Math.round(m.crowdW * view),
      slots,
    };
  }, [data, palette, fit]);

  const ariaLabel = `${data.caracteristica}: matriz de ${vLabels.join(', ')} según ${hLabels.join(
    ', ',
  )}. Escala: ${label}. Valores completos en la tabla.`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} compact center />
      </div>

      <p className="mb-2 w-full text-right font-sans text-pica-subtitle text-text-secondary">{label}</p>

      {/* Matriz de multitudes */}
      <div
        ref={gridRef}
        role="img"
        aria-label={ariaLabel}
        className="grid gap-y-1"
        style={{ gridTemplateColumns: '7rem 1fr' }}
      >
        {rows.map(({ vLabel, targets }) => (
          <div key={vLabel} className="contents">
            <p className="self-center pr-3 text-right font-sans text-pica-paragraph text-text-secondary">
              {vLabel}
            </p>
            <CrowdRow
              targets={targets}
              w={canvasW}
              h={rowH}
              layoutKey={`${data.id}:${vLabel}:${canvasW}`}
            />
          </div>
        ))}

        {/* Chips de la dimensión horizontal, alineados a los slots */}
        <div aria-hidden="true" />
        <div className="mt-1 flex" style={{ width: chipsW, maxWidth: '100%' }} aria-hidden="true">
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
