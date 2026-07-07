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
/** Gris de las categorías atenuadas al aislar una en la leyenda. */
const GRAY = '#4B4B46';

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
  // Categoría aislada al clickear su chip (el resto de la multitud va a gris)
  const [focus, setFocus] = useState<string | null>(null);

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

  const { label, hLabels, vLabels, rows, canvasW, rowH } = useMemo(() => {
    // La dimensión con más categorías va en horizontal
    const filasH = data.filas.length >= data.columnas.length;
    const hLabels = filasH ? data.filas : data.columnas;
    const vLabels = filasH ? data.columnas : data.filas;
    const valueAt = (v: number, h: number) =>
      filasH ? data.valores[h]![v]! : data.valores[v]![h]!;

    const sum = data.valores.flat().reduce((a, n) => a + n, 0);
    let per = matrixScale(sum, data.unidad).per;
    const rowH = MARGIN * 2 + (CELL_ROWS - 1) * PITCH_Y + C_H * SCALE;
    // Alto disponible por fila (reservando la leyenda y separación entre filas)
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

    // La multitud LLENA el ancho disponible (canvasW = ancho real de la multitud,
    // se muestra a w-full). Si tuviera pocas figuras, se limita el agrandado para
    // que la fila no supere el alto disponible (rowBudget).
    const canvasW = Math.max(m.crowdW + MARGIN * 2, Math.ceil((fit.cw * rowH) / rowBudget));

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
        const dim = focus !== null && hLabels[h] !== focus;
        const color = dim ? GRAY : shadeFor(palette[h % palette.length]!, v);
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

    return {
      label: perLabel(per, data.unidad),
      hLabels,
      vLabels,
      rows,
      canvasW,
      rowH,
    };
  }, [data, palette, fit, focus]);

  const ariaLabel = `${data.caracteristica}: matriz de ${vLabels.join(', ')} según ${hLabels.join(
    ', ',
  )}. Escala: ${label}. Valores completos en la tabla.`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} compact center />
      </div>

      {/* Leyenda arriba (mismo sistema que la distribución): un chip por
          categoría con su etiqueta completa + color; la escala a la derecha.
          Así el texto nunca se corta ni depende del ancho de cada columna. */}
      <div className="mb-3 flex w-full flex-wrap items-center gap-2">
        {hLabels.map((l, h) => {
          const c = palette[h % palette.length]!;
          const isFocused = focus === l;
          const dimmed = focus !== null && !isFocused;
          return (
            <button
              key={l}
              type="button"
              aria-pressed={isFocused}
              aria-label={`Aislar ${l}`}
              onClick={() => setFocus((f) => (f === l ? null : l))}
              className="whitespace-nowrap px-2 py-1 font-sans text-pica-subtitle transition-opacity max-md:py-2"
              style={{
                backgroundColor: c,
                color: textOnColor(c),
                opacity: dimmed ? 0.35 : 1,
                boxShadow: isFocused ? '0 0 0 2px #EBEBEB' : 'none',
              }}
            >
              {l}
            </button>
          );
        })}
        <span className="ml-auto font-sans text-pica-subtitle text-text-secondary">{label}</span>
      </div>

      {/* Matriz de multitudes */}
      <div
        ref={gridRef}
        role="img"
        aria-label={ariaLabel}
        className="grid w-full gap-y-1"
        style={{ gridTemplateColumns: 'minmax(4rem, 7rem) 1fr' }}
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
