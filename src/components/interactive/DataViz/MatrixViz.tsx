'use client';

// Tipo D — Matriz Comparativa: heatmap con la escala de color de la temática.
// El color NUNCA es el único indicador: cada celda muestra su valor (pica-accessibility).

import { interpolateRgb, max, min, scaleLinear } from 'd3';
import { TEMA_SCALE } from '@/lib/colors';
import type { DatasetMatriz } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const LABEL_W = 130;
const CELL_W = 104;
const CELL_H = 48;
const HEAD_H = 28;
const GAP = 4;

/**
 * Texto negro o blanco según la LUMINANCIA real del color de la celda.
 * (El umbral por posición en la escala `t(v)` quedaba invertido en escalas
 * claro→oscuro: celdas rosadas con texto blanco ilegible — bug de contraste
 * reportado en Delitos e IPC.)
 */
function textOn(cssColor: string): string {
  const m = cssColor.match(/\d+/g);
  if (!m) return '#EBEBEB';
  const [r = 0, g = 0, b = 0] = m.map(Number);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 140 ? '#0A0A0A' : '#FFFFFF';
}

export default function MatrixViz({ data }: { data: DatasetMatriz }) {
  const [lo, hi] = TEMA_SCALE[data.tematica];
  const flat = data.valores.flat();
  const minV = min(flat) ?? 0;
  const maxV = max(flat) ?? 1;
  const t = scaleLinear().domain([minV, maxV]).range([0, 1]).clamp(true);
  const colorOf = (v: number) => interpolateRgb(lo, hi)(t(v));

  const W = LABEL_W + data.columnas.length * (CELL_W + GAP);
  const H = HEAD_H + data.filas.length * (CELL_H + GAP);
  const titleId = `${data.id}-title`;
  const descId = `${data.id}-desc`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} center />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-xl"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        focusable="false"
      >
        <title id={titleId}>{data.caracteristica}</title>
        <desc id={descId}>
          Matriz de {data.filas.join(', ')} según {data.columnas.join(', ')}; valores de {minV} a{' '}
          {maxV} {data.unidad ?? ''}.
        </desc>

        {/* Encabezados de columna */}
        {data.columnas.map((col, j) => (
          <text
            key={col}
            x={LABEL_W + j * (CELL_W + GAP) + CELL_W / 2}
            y={HEAD_H - 10}
            textAnchor="middle"
            fill="#A0A09A"
            style={{ fontFamily: 'var(--font-vt323)', fontSize: 15 }}
          >
            {col}
          </text>
        ))}

        {data.filas.map((fila, i) => (
          <g key={fila}>
            <text
              x={LABEL_W - 12}
              y={HEAD_H + i * (CELL_H + GAP) + CELL_H / 2 + 5}
              textAnchor="end"
              fill="#A0A09A"
              style={{ fontFamily: 'var(--font-vt323)', fontSize: 15 }}
            >
              {fila}
            </text>
            {data.columnas.map((col, j) => {
              const v = data.valores[i]![j]!;
              const bg = colorOf(v);
              return (
                <g key={col}>
                  <rect
                    x={LABEL_W + j * (CELL_W + GAP)}
                    y={HEAD_H + i * (CELL_H + GAP)}
                    width={CELL_W}
                    height={CELL_H}
                    fill={bg}
                  />
                  <text
                    x={LABEL_W + j * (CELL_W + GAP) + CELL_W / 2}
                    y={HEAD_H + i * (CELL_H + GAP) + CELL_H / 2 + 6}
                    textAnchor="middle"
                    fill={textOn(bg)}
                    style={{ fontFamily: 'var(--font-handjet)', fontWeight: 700, fontSize: 17 }}
                  >
                    {v.toLocaleString('es-UY')}
                    {data.unidad === '%' ? '%' : ''}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>

      <DataTable
        caption={data.caracteristica}
        head={['', ...data.columnas]}
        rows={data.filas.map((f, i) => [f, ...data.valores[i]!])}
      />
      <VizFooter dataset={data} />
    </div>
  );
}
