'use client';

// Tipo B — Distribución Categórica (no-personas).
// 'barras' (default): barras horizontales en SVG (D3 calcula la escala).
// 'lista' (device B2): lista rankeada — ordenada desc, rango + barra + valor.
// D3 calcula las escalas, React renderiza (regla de oro de pica-interactive).

import { max, scaleLinear } from 'd3';
import { TEMA_COLOR } from '@/lib/colors';
import type { DatasetDistribucion } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const W = 480;
const BAR_AREA = 330; // ancho máximo de barra (deja lugar al valor)
const ROW_H = 56;

export default function DistributionViz({ data }: { data: DatasetDistribucion }) {
  if (data.presentacion === 'lista') return <RankedList data={data} />;
  return <BarChart data={data} />;
}

// ── B2 · lista rankeada ──────────────────────────────────────────────────────
function RankedList({ data }: { data: DatasetDistribucion }) {
  const color = TEMA_COLOR[data.tematica];
  const ranked = [...data.categorias].sort((a, b) => b.valor - a.valor);
  const maxVal = max(ranked, (c) => c.valor) ?? 1;

  return (
    <div>
      <VizHeader dataset={data} />
      <ol className="flex max-w-2xl flex-col gap-2">
        {ranked.map((cat, i) => {
          const pct = Math.max(1, (100 * cat.valor) / maxVal);
          const c = cat.color ?? color;
          return (
            <li key={cat.label} className="flex items-center gap-3">
              <span className="w-6 shrink-0 text-right font-display text-pica-subtitle font-bold text-text-muted">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate font-sans text-pica-subtitle text-text-secondary">
                    {cat.label}
                  </span>
                  <span className="shrink-0 font-display text-pica-button font-bold" style={{ color: c }}>
                    {cat.valor.toLocaleString('es-UY')}
                    {data.unidad === '%' ? '%' : ''}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-sm bg-white/5">
                  <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: c }} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <DataTable
        caption={data.caracteristica}
        head={['Categoría', `Valor${data.unidad ? ` (${data.unidad})` : ''}`]}
        rows={ranked.map((c) => [c.label, c.valor])}
      />
      <VizFooter dataset={data} />
    </div>
  );
}

// ── barras horizontales (default) ────────────────────────────────────────────
function BarChart({ data }: { data: DatasetDistribucion }) {
  const color = TEMA_COLOR[data.tematica];
  const maxVal = max(data.categorias, (c) => c.valor) ?? 1;
  const x = scaleLinear().domain([0, maxVal]).range([0, BAR_AREA]);
  const height = data.categorias.length * ROW_H;
  const titleId = `${data.id}-title`;
  const descId = `${data.id}-desc`;

  return (
    <div>
      <VizHeader dataset={data} />

      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full max-w-xl"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        focusable="false"
      >
        <title id={titleId}>{data.caracteristica}</title>
        <desc id={descId}>
          {data.categorias.map((c) => `${c.label}: ${c.valor}${data.unidad ?? ''}`).join('. ')}
        </desc>
        {data.categorias.map((cat, i) => {
          const y = i * ROW_H;
          const w = Math.max(2, x(cat.valor));
          return (
            <g key={cat.label}>
              <text
                x={0}
                y={y + 14}
                fill="#A0A09A"
                style={{ fontFamily: 'var(--font-vt323)', fontSize: 15, letterSpacing: '0.04em' }}
              >
                {cat.label}
              </text>
              <rect x={0} y={y + 22} width={w} height={20} fill={cat.color ?? color} />
              <text
                x={w + 10}
                y={y + 38}
                fill="#EBEBEB"
                style={{ fontFamily: 'var(--font-handjet)', fontWeight: 700, fontSize: 18 }}
              >
                {cat.valor.toLocaleString('es-UY')}
                {data.unidad === '%' ? '%' : ''}
              </text>
            </g>
          );
        })}
      </svg>

      <DataTable
        caption={data.caracteristica}
        head={['Categoría', `Valor${data.unidad ? ` (${data.unidad})` : ''}`]}
        rows={data.categorias.map((c) => [c.label, c.valor])}
      />
      <VizFooter dataset={data} />
    </div>
  );
}
