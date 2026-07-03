'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipo B isotype: distribución categórica con PERSONAS
// Una sola MULTITUD densa (ref. The Pudding): figuras ordenadas por categoría
// formando bandas de color, altura fija (sin scroll), gap mínimo e igual en
// ambos ejes. La leyenda es CLICKEABLE: aísla una demografía (el resto queda
// en gris, recoloreo en caliente — las figuras no vuelven a entrar).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react';
import { TEMA_PALETTE } from '@/lib/colors';
import { figureCount, figureScale } from '@/lib/isotype';
import { useSpriteWalkers, type WalkerTarget } from '@/hooks/useSpriteWalkers';
import type { DatasetDistribucion } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const SCALE = 2; // dibujo lógico a 2×

// Bounding box REAL de la figura dentro del frame 17×43 (medido sobre los
// PNGs, unión de 6 modelos en idle): el frame tiene mucho padding transparente
// (13px arriba/abajo). La grilla se calcula sobre el CONTENIDO, no el frame —
// si no, el aire del frame simula gaps gigantes.
const C_MIN_X = 4;
const C_MIN_Y = 13;
const C_W = 9;
const C_H = 17;
/** Separación real entre figuras (art px), idéntica en ambos ejes. */
const GAP = 1;
const PITCH_X = (C_W + GAP) * SCALE;
const PITCH_Y = (C_H + GAP) * SCALE;
const MARGIN = 2 * SCALE;
/** Altura fija de la banda en filas — todo visible sin scroll. */
const ROWS = 10;
/** Color de las figuras fuera de la demografía aislada. */
const MUTED = '#4B4B46';

/** Texto legible sobre un color de fondo (chips de la leyenda). */
function textOn(color: string): string {
  const n = parseInt(color.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? '#0A0A0A' : '#EBEBEB';
}

interface LegendItem {
  label: string;
  valor: number;
  color: string;
  count: number;
}

export default function IsotypeDistributionViz({ data }: { data: DatasetDistribucion }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const palette = TEMA_PALETTE[data.tematica];
  // Demografía aislada (null = todas visibles)
  const [focus, setFocus] = useState<string | null>(null);

  const { scale, legend } = useMemo(() => {
    const total = data.categorias.reduce((a, c) => a + c.valor, 0);
    const scale = figureScale(total, data.unidad);
    const legend: LegendItem[] = data.categorias.map((cat, i) => ({
      label: cat.label,
      valor: cat.valor,
      color: cat.color ?? palette[i % palette.length]!,
      count: figureCount(cat.valor, scale.per),
    }));
    return { scale, legend };
  }, [data, palette]);

  // Posiciones (column-major → bandas verticales por categoría) + color según foco.
  // El pitch es por CONTENIDO: los targets llevan el origen del FRAME (restando
  // el offset del contenido); el padding transparente del frame puede quedar
  // fuera del canvas sin problema.
  const { targets, W, H } = useMemo(() => {
    const totalFigures = legend.reduce((a, l) => a + l.count, 0);
    const cols = Math.max(1, Math.ceil(totalFigures / ROWS));
    const W = MARGIN * 2 + (cols - 1) * PITCH_X + C_W * SCALE;
    const H = MARGIN * 2 + (ROWS - 1) * PITCH_Y + C_H * SCALE;

    const targets: WalkerTarget[] = [];
    let idx = 0;
    for (const item of legend) {
      const color = focus && item.label !== focus ? MUTED : item.color;
      for (let j = 0; j < item.count; j++) {
        targets.push({
          x: MARGIN + Math.floor(idx / ROWS) * PITCH_X - C_MIN_X * SCALE,
          y: MARGIN + (idx % ROWS) * PITCH_Y - C_MIN_Y * SCALE,
          color,
        });
        idx++;
      }
    }
    return { targets, W, H };
  }, [legend, focus]);

  useSpriteWalkers(canvasRef, targets, { scale: SCALE, layoutKey: data.id });

  const ariaLabel = `${data.caracteristica}: ${data.categorias
    .map((c) => `${c.label} ${c.valor}${data.unidad ?? ''}`)
    .join(', ')}. Escala: ${scale.label}.`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} />
      </div>

      {/* Leyenda clickeable: aísla una demografía */}
      <div className="mb-3 flex w-full flex-wrap items-center gap-2">
        {legend.map((item) => {
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
                color: textOn(item.color),
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
          {scale.label}
        </span>
      </div>

      {/* La multitud — canvas decorativo; la info está en aria + tabla */}
      <div role="img" aria-label={ariaLabel} className="flex w-full justify-center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          aria-hidden="true"
          className="w-full"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <div className="w-full">
        <DataTable
          caption={data.caracteristica}
          head={['Categoría', `Valor${data.unidad ? ` (${data.unidad})` : ''}`, 'Figuras']}
          rows={legend.map((l) => [l.label, l.valor, l.count])}
        />
        <VizFooter dataset={data} />
      </div>
    </div>
  );
}
