'use client';

// Tipo A — Resultado Escalar: número grande con contexto (CSS + tipografía).

import { TEMA_COLOR } from '@/lib/colors';
import type { DatasetEscalar } from '@/types/data';
import { VizFooter, VizHeader } from './VizShared';

export default function ScalarViz({ data }: { data: DatasetEscalar }) {
  const color = TEMA_COLOR[data.tematica];
  const up = (data.variacion?.valor ?? 0) >= 0;

  return (
    <div>
      <VizHeader dataset={data} />

      <p
        className="font-display font-black leading-none"
        style={{
          color,
          fontSize: 'clamp(64px, 10vw, 128px)',
          fontVariationSettings: '"ELGR" 1, "ELSH" 2',
        }}
      >
        {data.unidad === '$UYU' && <span aria-hidden="true">$ </span>}
        {data.valor.toLocaleString('es-UY')}
        {data.unidad === '%' && <span aria-hidden="true">%</span>}
      </p>
      {data.unidad && data.unidad !== '%' && data.unidad !== '$UYU' && (
        <p className="mt-1 font-sans text-pica-paragraph text-text-secondary">{data.unidad}</p>
      )}

      {data.variacion && (
        <p className="mt-4 font-sans text-pica-paragraph text-text-secondary">
          <span aria-hidden="true" style={{ color }}>
            {up ? '▲' : '▼'}{' '}
          </span>
          {up ? '+' : ''}
          {data.variacion.valor.toLocaleString('es-UY')}
          {data.unidad === '$UYU' ? ' pesos' : data.unidad === '%' ? ' pp' : ''} respecto a{' '}
          {data.variacion.periodo}
        </p>
      )}
      {data.contexto && (
        <p className="mt-1 max-w-md font-sans text-pica-subtitle text-text-muted">{data.contexto}</p>
      )}

      <VizFooter dataset={data} />
    </div>
  );
}
