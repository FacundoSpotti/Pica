'use client';

// Tipo D — Matriz Comparativa (no-personas): heatmap con la escala de color de
// la temática. El color NUNCA es el único indicador: cada celda muestra su valor
// (pica-accessibility).
//
// Se dibuja como GRILLA HTML (no SVG): las etiquetas de fila pueden ser largas
// (ej. "Vivienda, agua, electricidad, gas y otros combustibles") y en el SVG de
// viewBox fijo se dibujaban en x negativa y quedaban CORTADAS por la izquierda,
// además de crecer sin tope y disparar scroll interno. En HTML la etiqueta
// reflowea (varias líneas), la grilla se adapta al ancho y el alto fluye.

import { interpolateRgb, max, min, scaleLinear } from 'd3';
import { TEMA_SCALE } from '@/lib/colors';
import type { DatasetMatriz } from '@/types/data';
import { VizHeader, VizMeta } from './VizShared';

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
  const suffix = data.unidad === '%' ? '%' : '';

  // Ancho de la columna de etiquetas: más angosta con pocas columnas de datos,
  // para que la matriz de 2 columnas (IPC) no se estire de más.
  const nCols = data.columnas.length;
  const gridCols = `minmax(7rem, 15rem) repeat(${nCols}, minmax(0, 1fr))`;
  // Muchas columnas (ej. denuncias 8) necesitan más ancho total.
  const maxW = nCols >= 6 ? 'max-w-3xl' : nCols >= 4 ? 'max-w-2xl' : 'max-w-xl';

  const ariaLabel = `${data.caracteristica}: matriz de ${data.filas.join(', ')} según ${data.columnas.join(
    ', ',
  )}; valores de ${minV} a ${maxV} ${data.unidad ?? ''}. Detalle completo en la tabla de datos.`;

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} compact center />
      </div>

      <div
        role="img"
        aria-label={ariaLabel}
        className={`grid w-full ${maxW} gap-1`}
        style={{ gridTemplateColumns: gridCols }}
      >
        {/* Cabecera: esquina vacía + nombres de columna */}
        <span aria-hidden="true" />
        {data.columnas.map((col) => (
          <span
            key={col}
            aria-hidden="true"
            className="self-end pb-1 text-center font-sans text-pica-subtitle leading-tight text-text-secondary"
          >
            {col}
          </span>
        ))}

        {/* Filas: etiqueta (reflowea, nunca se corta) + celdas coloreadas */}
        {data.filas.map((fila, i) => (
          <div key={fila} className="contents">
            <span className="self-center pr-3 text-right font-sans text-pica-subtitle leading-tight text-text-secondary">
              {fila}
            </span>
            {data.columnas.map((col, j) => {
              const v = data.valores[i]![j]!;
              const bg = colorOf(v);
              return (
                <span
                  key={col}
                  aria-hidden="true"
                  className="flex min-h-[36px] items-center justify-center font-display text-[17px] font-bold short:min-h-[30px]"
                  style={{ background: bg, color: textOn(bg) }}
                >
                  {v.toLocaleString('es-UY')}
                  {suffix}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <VizMeta
        dataset={data}
        table={{
          caption: data.caracteristica,
          head: ['', ...data.columnas],
          rows: data.filas.map((f, i) => [f, ...data.valores[i]!]),
        }}
      />
    </div>
  );
}
