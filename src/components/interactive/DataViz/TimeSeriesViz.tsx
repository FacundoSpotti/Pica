'use client';

// Tipo C — Serie Temporal: línea con puntos, último valor destacado.
// D3 calcula las escalas, React renderiza el SVG.

import { extent, scaleLinear, scalePoint } from 'd3';
import { TEMA_COLOR } from '@/lib/colors';
import type { DatasetSerie } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const W = 520;
const H = 280;
const M = { top: 20, right: 56, bottom: 30, left: 44 };

export default function TimeSeriesViz({ data }: { data: DatasetSerie }) {
  const color = TEMA_COLOR[data.tematica];
  const periods = data.puntos.map((p) => p.periodo);
  const [minV = 0, maxV = 1] = extent(data.puntos, (p) => p.valor);
  const pad = (maxV - minV) * 0.15 || 1;

  const x = scalePoint<string>().domain(periods).range([M.left, W - M.right]);
  const y = scaleLinear()
    .domain([minV - pad, maxV + pad])
    .range([H - M.bottom, M.top]);

  const path = data.puntos
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.periodo)},${y(p.valor)}`)
    .join(' ');

  const last = data.puntos[data.puntos.length - 1]!;
  const first = data.puntos[0]!;
  const titleId = `${data.id}-title`;
  const descId = `${data.id}-desc`;

  return (
    <div>
      <VizHeader dataset={data} />

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-xl"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        focusable="false"
      >
        <title id={titleId}>{data.caracteristica}</title>
        <desc id={descId}>
          Serie de {first.periodo} ({first.valor}
          {data.unidad}) a {last.periodo} ({last.valor}
          {data.unidad}).
        </desc>

        {/* Grilla horizontal sutil + labels del eje Y */}
        {[minV, (minV + maxV) / 2, maxV].map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke="#26262A" />
            <text
              x={M.left - 8}
              y={y(v) + 4}
              textAnchor="end"
              fill="#606058"
              style={{ fontFamily: 'var(--font-vt323)', fontSize: 13 }}
            >
              {v.toLocaleString('es-UY', { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}

        {/* Línea + puntos */}
        <path d={path} fill="none" stroke={color} strokeWidth={2.5} />
        {data.puntos.map((p) => (
          <rect
            key={p.periodo}
            x={(x(p.periodo) ?? 0) - 2.5}
            y={y(p.valor) - 2.5}
            width={5}
            height={5}
            fill={color}
          />
        ))}

        {/* Último punto destacado con el valor */}
        <text
          x={(x(last.periodo) ?? 0) + 10}
          y={y(last.valor) + 5}
          fill="#EBEBEB"
          style={{ fontFamily: 'var(--font-handjet)', fontWeight: 800, fontSize: 20 }}
        >
          {last.valor.toLocaleString('es-UY')}
          {data.unidad === '%' ? '%' : ''}
        </text>

        {/* Extremos del eje X */}
        <text
          x={M.left}
          y={H - 8}
          fill="#606058"
          style={{ fontFamily: 'var(--font-vt323)', fontSize: 13 }}
        >
          {first.periodo}
        </text>
        <text
          x={W - M.right}
          y={H - 8}
          textAnchor="end"
          fill="#606058"
          style={{ fontFamily: 'var(--font-vt323)', fontSize: 13 }}
        >
          {last.periodo}
        </text>
      </svg>

      <DataTable
        caption={data.caracteristica}
        head={['Período', `Valor${data.unidad ? ` (${data.unidad})` : ''}`]}
        rows={data.puntos.map((p) => [p.label ? `${p.periodo} (${p.label})` : p.periodo, p.valor])}
      />
      <VizFooter dataset={data} />
    </div>
  );
}
