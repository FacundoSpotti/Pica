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
import { paletteFor, textOnColor } from '@/lib/colors';
import { figureCount, figureScale, niceClosest, perLabel } from '@/lib/isotype';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSpriteWalkers, type SpritePool, type WalkerTarget } from '@/hooks/useSpriteWalkers';
import type { DatasetDistribucion } from '@/types/data';
import { VizHeader, VizMeta } from './VizShared';

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
  // Paleta sin repeticiones: tantos colores distintos como categorías
  const palette = paletteFor(data.tematica, data.categorias.length);
  const [focus, setFocus] = useState<string | null>(null);
  // Mobile: MENOS figuras (se ven más grandes y pesa menos en el teléfono).
  const isMobile = useIsMobile();

  const { cats, isRate, scaleLabel, distPer } = useMemo(() => {
    const sum = data.categorias.reduce((a, c) => a + c.valor, 0);
    // Suman ~100 → distribución (partes de un todo); si no → tasas
    const isRate = data.unidad === '%' && Math.abs(sum - 100) > 3;
    // Escala basada en la SUMA real: sirve tanto para % (sum≈100) como para
    // conteos absolutos (ej. profesionales de la salud). Desktop apunta a ~800
    // figuras; MOBILE a ~220 (más grandes, más livianas).
    const distScale = isMobile
      ? (() => {
          const per = niceClosest(sum / 220);
          return { per, label: perLabel(per, data.unidad) };
        })()
      : figureScale(sum, data.unidad);
    const cats: Cat[] = data.categorias.map((c, i) => ({
      label: c.label,
      valor: c.valor,
      color: c.color ?? palette[i % palette.length]!,
      pool: poolFor(data.entidad, data.caracteristica, c.label),
    }));
    const scaleLabel = isRate
      ? `1 figura = ${isMobile ? 2 : 1}% (resto en gris)`
      : distScale.label;
    return { cats, isRate, scaleLabel, distPer: distScale.per };
  }, [data, palette, isMobile]);

  // Posiciones + colores según modo y foco
  const { targets, W, H } = useMemo(() => {
    const targets: WalkerTarget[] = [];

    if (isRate) {
      // Small-multiples: cada categoría un grupo de 100 figuras (tasa + gris).
      // MOBILE: grupos de 50 (1 figura = 2%) APILADOS en vertical — figuras más
      // grandes y menos sprites para el teléfono.
      const total = isMobile ? 50 : 100;
      const rows = isMobile ? 5 : RATE_ROWS;
      const groupCols = Math.ceil(total / rows);
      const groupW = (groupCols - 1) * PITCH_X + C_W * SCALE;
      const groupH = (rows - 1) * PITCH_Y + C_H * SCALE;
      const W = isMobile
        ? MARGIN * 2 + groupW
        : MARGIN * 2 + cats.length * groupW + (cats.length - 1) * GROUP_GAP;
      const H = isMobile
        ? MARGIN * 2 + cats.length * groupH + (cats.length - 1) * GROUP_GAP
        : MARGIN * 2 + groupH;
      cats.forEach((cat, g) => {
        // mínimo 1 figura si el valor no es cero — ninguna categoría queda sin representación
        const colored = Math.min(
          total,
          Math.max(cat.valor > 0 ? 1 : 0, Math.round((cat.valor * total) / 100)),
        );
        const gx = isMobile ? MARGIN : MARGIN + g * (groupW + GROUP_GAP);
        const gy = isMobile ? MARGIN + g * (groupH + GROUP_GAP) : MARGIN;
        const dim = focus !== null && cat.label !== focus;
        for (let j = 0; j < total; j++) {
          const isColored = j < colored;
          targets.push({
            x: gx + Math.floor(j / rows) * PITCH_X - C_MIN_X * SCALE,
            y: gy + (j % rows) * PITCH_Y - C_MIN_Y * SCALE,
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
  }, [cats, isRate, focus, distPer, isMobile]);

  // layoutKey SIN focus (aislar solo recolorea en caliente) pero CON las
  // dimensiones: si cambia la densidad (mobile/desktop) el enjambre se
  // reconstruye — con key estable quedaban walkers viejos fuera del canvas.
  useSpriteWalkers(canvasRef, targets, { scale: SCALE, layoutKey: `${data.id}:${W}x${H}` });

  const ariaLabel = `${data.caracteristica}: ${data.categorias
    .map((c) => `${c.label} ${c.valor}${data.unidad ?? ''}`)
    .join(', ')}. ${isRate ? `Cada grupo son ${isMobile ? 50 : 100} personas; en color la proporción, en gris el resto. ` : ''}`;

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
              className="flex items-center gap-2 px-2 py-1 font-sans text-pica-subtitle transition-opacity max-md:gap-1 max-md:px-1.5 max-md:py-0.5 max-md:text-[14px] max-md:leading-4"
              style={{
                backgroundColor: item.color,
                color: textOnColor(item.color),
                opacity: dimmed ? 0.35 : 1,
                boxShadow: isFocused ? `0 0 0 2px #EBEBEB` : 'none',
              }}
            >
              <strong className="font-display text-pica-button font-bold leading-none max-md:text-[15px]">
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
          // Tope de altura SOLO desktop (pantallas bajas): en mobile el visor
          // scrollea y el tope solo achicaba la multitud sin necesidad.
          className="mx-auto md:[max-height:max(220px,calc(100vh-500px))]"
          style={{
            imageRendering: 'pixelated',
            width: 'auto',
            height: 'auto',
            maxWidth: '100%',
          }}
        />
      </div>

      <VizMeta
        dataset={data}
        table={{
          caption: data.caracteristica,
          head: ['Categoría', `Valor${data.unidad ? ` (${data.unidad})` : ''}`],
          rows: cats.map((c) => [c.label, c.valor]),
        }}
      />
    </div>
  );
}
