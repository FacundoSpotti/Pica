'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipo B isotype: categorías con PERSONAS. Dos modos:
//
// · DISTRIBUCIÓN (las categorías suman ~100%): una multitud densa con una banda
//   de color por categoría (ref. The Pudding).
// · TASA (no suman 100%, ej. "desempleo por sexo"): small-multiples — cada
//   categoría es un grupo de 100 figuras con la tasa en color y el RESTO en
//   gris, para leer la proporción de cada grupo.
//
// Sprites por demografía: categorías de mujeres usan modelos femeninos, de
// varones masculinos, de niños infantiles; si no hay distinción, mezclados.
// La leyenda es clickeable: aísla una categoría (el resto en gris).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react';
import { TEMA_PALETTE, textOnColor } from '@/lib/colors';
import { figureCount, figureScale } from '@/lib/isotype';
import { useSpriteWalkers, type SpritePool, type WalkerTarget } from '@/hooks/useSpriteWalkers';
import type { DatasetDistribucion } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const SCALE = 2;
// Bounding box real de la figura dentro del frame 17×43 (contenido, no frame)
const C_MIN_X = 4;
const C_MIN_Y = 13;
const C_W = 9;
const C_H = 17;
const GAP = 1;
const PITCH_X = (C_W + GAP) * SCALE;
const PITCH_Y = (C_H + GAP) * SCALE;
const MARGIN = 2 * SCALE;
const ROWS = 10;
/** Modo tasa: filas por grupo y separación entre grupos. */
const RATE_ROWS = 10;
const GROUP_GAP = 10 * SCALE;
/** Gris del "resto" (remanente hasta 100%) y de las categorías atenuadas. */
const GRAY = '#4B4B46';

/** Pool de sprites de una categoría según su demografía. */
function poolFor(entidad: string, caracteristica: string, label: string): SpritePool {
  if (/niñ|infant|menor/i.test(`${entidad} ${caracteristica}`)) return 'child';
  if (/mujer|femenin/i.test(label)) return 'w';
  if (/var[oó]n|hombre|masculin/i.test(label)) return 'm';
  return 'any';
}

interface Cat {
  label: string;
  valor: number;
  color: string;
  pool: SpritePool;
}

export default function IsotypeDistributionViz({ data }: { data: DatasetDistribucion }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const palette = TEMA_PALETTE[data.tematica];
  const [focus, setFocus] = useState<string | null>(null);

  const { cats, isRate, scaleLabel, distPer } = useMemo(() => {
    const sum = data.categorias.reduce((a, c) => a + c.valor, 0);
    // Suman ~100 → distribución (partes de un todo); si no → tasas
    const isRate = data.unidad === '%' && Math.abs(sum - 100) > 3;
    // Escala basada en la SUMA real: sirve tanto para % (sum≈100) como para
    // conteos absolutos (ej. profesionales de la salud), apuntando a ~800 figuras.
    const distScale = figureScale(sum, data.unidad);
    const cats: Cat[] = data.categorias.map((c, i) => ({
      label: c.label,
      valor: c.valor,
      color: c.color ?? palette[i % palette.length]!,
      pool: poolFor(data.entidad, data.caracteristica, c.label),
    }));
    const scaleLabel = isRate ? '1 figura = 1% (resto en gris)' : distScale.label;
    return { cats, isRate, scaleLabel, distPer: distScale.per };
  }, [data, palette]);

  // Posiciones + colores según modo y foco
  const { targets, W, H } = useMemo(() => {
    const targets: WalkerTarget[] = [];

    if (isRate) {
      // Small-multiples: cada categoría un grupo de 100 (tasa + gris)
      const groupCols = Math.ceil(100 / RATE_ROWS);
      const groupW = (groupCols - 1) * PITCH_X + C_W * SCALE;
      const W = MARGIN * 2 + cats.length * groupW + (cats.length - 1) * GROUP_GAP;
      const H = MARGIN * 2 + (RATE_ROWS - 1) * PITCH_Y + C_H * SCALE;
      cats.forEach((cat, g) => {
        const colored = Math.max(0, Math.min(100, Math.round(cat.valor)));
        const gx = MARGIN + g * (groupW + GROUP_GAP);
        const dim = focus !== null && cat.label !== focus;
        for (let j = 0; j < 100; j++) {
          const isColored = j < colored;
          targets.push({
            x: gx + Math.floor(j / RATE_ROWS) * PITCH_X - C_MIN_X * SCALE,
            y: MARGIN + (j % RATE_ROWS) * PITCH_Y - C_MIN_Y * SCALE,
            color: dim ? GRAY : isColored ? cat.color : GRAY,
            pool: cat.pool,
          });
        }
      });
      return { targets, W, H };
    }

    // Distribución: multitud densa, una banda por categoría (column-major)
    const counts = cats.map((c) => figureCount(c.valor, distPer));
    const total = counts.reduce((a, n) => a + n, 0);
    const cols = Math.max(1, Math.ceil(total / ROWS));
    const W = MARGIN * 2 + (cols - 1) * PITCH_X + C_W * SCALE;
    const H = MARGIN * 2 + (ROWS - 1) * PITCH_Y + C_H * SCALE;
    let idx = 0;
    cats.forEach((cat, i) => {
      const dim = focus !== null && cat.label !== focus;
      for (let j = 0; j < counts[i]!; j++) {
        targets.push({
          x: MARGIN + Math.floor(idx / ROWS) * PITCH_X - C_MIN_X * SCALE,
          y: MARGIN + (idx % ROWS) * PITCH_Y - C_MIN_Y * SCALE,
          color: dim ? GRAY : cat.color,
          pool: cat.pool,
        });
        idx++;
      }
    });
    return { targets, W, H };
  }, [cats, isRate, focus, distPer]);

  // layoutKey estable (sin focus): aislar una demografía solo RECOLOREA en
  // caliente (gris/color), sin que las figuras vuelvan a entrar caminando.
  useSpriteWalkers(canvasRef, targets, { scale: SCALE, layoutKey: data.id });

  const ariaLabel = `${data.caracteristica}: ${data.categorias
    .map((c) => `${c.label} ${c.valor}${data.unidad ?? ''}`)
    .join(', ')}. ${isRate ? 'Cada grupo son 100 personas; en color la proporción, en gris el resto. ' : ''}`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} compact center />
      </div>

      {/* Leyenda clickeable */}
      <div className="mb-3 flex w-full flex-wrap items-center gap-2">
        {cats.map((item) => {
          const isFocused = focus === item.label;
          const dimmed = focus !== null && !isFocused;
          return (
            <button
              key={item.label}
              type="button"
              aria-pressed={isFocused}
              aria-label={`Aislar ${item.label}`}
              onClick={() => setFocus((f) => (f === item.label ? null : item.label))}
              className="flex items-center gap-2 px-2 py-1 font-sans text-pica-subtitle transition-opacity"
              style={{
                backgroundColor: item.color,
                color: textOnColor(item.color),
                opacity: dimmed ? 0.35 : 1,
                boxShadow: isFocused ? `0 0 0 2px #EBEBEB` : 'none',
              }}
            >
              <strong className="font-display text-pica-button font-bold leading-none">
                {item.valor.toLocaleString('es-UY')}
                {data.unidad === '%' ? '%' : ''}
              </strong>
              {item.label}
            </button>
          );
        })}
        <span className="ml-auto font-sans text-pica-subtitle text-text-secondary">
          {scaleLabel}
        </span>
      </div>

      {/* La multitud */}
      <div role="img" aria-label={ariaLabel} className="flex w-full justify-center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          aria-hidden="true"
          className="w-full"
          style={{ imageRendering: 'pixelated', maxWidth: W }}
        />
      </div>

      <div className="w-full">
        <DataTable
          caption={data.caracteristica}
          head={['Categoría', `Valor${data.unidad ? ` (${data.unidad})` : ''}`]}
          rows={cats.map((c) => [c.label, c.valor])}
        />
        <VizFooter dataset={data} />
      </div>
    </div>
  );
}
