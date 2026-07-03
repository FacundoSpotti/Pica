'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipo A: Resultado Escalar (v2)
// Número CENTRADO en pantalla con animación de incremento al entrar (0 → valor,
// easing suave, respeta prefers-reduced-motion) e iconografía pixel que ancla
// la lectura: moneda para dinero, casa para hogares, etc.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import PixelIcon, { type PixelIconName } from '@/components/shared/PixelIcon';
import EntityIcon from '@/components/interactive/EntityIcon';
import { TEMA_COLOR } from '@/lib/colors';
import type { DatasetEscalar } from '@/types/data';
import { VizFooter } from './VizShared';

const COUNT_MS = 1400;

/** Contador animado 0 → value con easing de desaceleración. */
function useCountUp(value: number, reduced: boolean): number {
  const [current, setCurrent] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setCurrent(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setCurrent(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return current;
}

/** Icono según la unidad del dato. */
function unitIcon(unidad?: string): PixelIconName | null {
  if (unidad === '$UYU') return 'coins';
  return null;
}

export default function ScalarViz({ data }: { data: DatasetEscalar }) {
  const color = TEMA_COLOR[data.tematica];
  const reduced = useReducedMotion() ?? false;
  const current = useCountUp(data.valor, reduced);
  const up = (data.variacion?.valor ?? 0) >= 0;
  const icon = unitIcon(data.unidad);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      {/* Entidad con su icono (casa para hogares, sprites para personas…) */}
      <div className="mb-2 flex items-center gap-3">
        <EntityIcon entidad={data.entidad} color={color} size={36} />
        <p className="font-sans text-pica-paragraph uppercase tracking-widest text-text-muted">
          {data.entidad} · {data.anio}
        </p>
      </div>

      <h2 className="font-display text-pica-title font-bold text-text-primary">
        {data.caracteristica}
      </h2>

      {/* El número, centrado y contando hacia arriba */}
      <div className="my-6 flex items-center justify-center gap-5">
        {icon && <PixelIcon name={icon} size={72} color={color} />}
        <p
          className="font-display font-black leading-none"
          style={{
            color,
            fontSize: 'clamp(72px, 11vw, 140px)',
            fontVariationSettings: '"ELGR" 1, "ELSH" 2',
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-label={`${data.valor.toLocaleString('es-UY')}${data.unidad === '%' ? ' por ciento' : data.unidad ? ` ${data.unidad}` : ''}`}
        >
          {data.unidad === '$UYU' && <span aria-hidden="true">$ </span>}
          <span aria-hidden="true">{Math.round(current).toLocaleString('es-UY')}</span>
          {data.unidad === '%' && <span aria-hidden="true">%</span>}
        </p>
      </div>
      {data.unidad && data.unidad !== '%' && data.unidad !== '$UYU' && (
        <p className="font-sans text-pica-paragraph text-text-secondary">{data.unidad}</p>
      )}

      {data.variacion && (
        <p className="font-sans text-pica-paragraph text-text-secondary">
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
        <p className="mt-1 max-w-md font-sans text-pica-subtitle text-text-muted">
          {data.contexto}
        </p>
      )}
      <p className="mt-3 max-w-xl font-sans text-pica-subtitle text-text-secondary">
        {data.descripcion}
      </p>

      <VizFooter dataset={data} />
    </div>
  );
}
