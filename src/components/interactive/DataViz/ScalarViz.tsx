'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipo A: Resultado Escalar (v3)
// Número grande con conteo animado al entrar. Si el dato es un CONTEO DE PERSONAS
// (`personas: true`), se acompaña de una multitud de sprites a la derecha —
// norma: toda estadística sobre personas se representa con personas.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import PixelIcon, { type PixelIconName } from '@/components/shared/PixelIcon';
import EntityIcon from '@/components/interactive/EntityIcon';
import { TEMA_COLOR } from '@/lib/colors';
import { niceClosest, perLabel } from '@/lib/isotype';
import { useSpriteWalkers, type SpritePool, type WalkerTarget } from '@/hooks/useSpriteWalkers';
import type { DatasetEscalar } from '@/types/data';
import { VizMeta } from './VizShared';

const COUNT_MS = 1400;

// Geometría de la multitud (igual que IsotypeDistributionViz)
const SCALE = 2;
const C_MIN_X = 4;
const C_MIN_Y = 13;
const C_W = 9;
const C_H = 17;
const GAP = 1;
const PITCH_X = (C_W + GAP) * SCALE;
const PITCH_Y = (C_H + GAP) * SCALE;
const MARGIN = 2 * SCALE;

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

/** Pool de sprites según de quién habla el dato. */
function scalarPool(entidad: string, caracteristica: string): SpritePool {
  const s = `${entidad} ${caracteristica}`.toLowerCase();
  if (/niñ|infant|menor/.test(s)) return 'child';
  if (/mujer|femicid|femenin|g[eé]nero/.test(s)) return 'w';
  if (/var[oó]n|hombre|masculin/.test(s)) return 'm';
  return 'any';
}

/** Multitud de `count` personas (1 figura = 1, o escalada si son muchas). */
function ScalarCrowd({ count, color, pool, id }: { count: number; color: string; pool: SpritePool; id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { targets, W, H, per } = useMemo(() => {
    const per = count > 180 ? niceClosest(count / 150) : 1;
    const figs = Math.max(1, Math.round(count / per));
    const rows = figs > 40 ? 10 : figs > 12 ? 5 : Math.max(1, Math.ceil(figs / 4));
    const cols = Math.ceil(figs / rows);
    const targets: WalkerTarget[] = [];
    for (let j = 0; j < figs; j++) {
      targets.push({
        x: MARGIN + Math.floor(j / rows) * PITCH_X - C_MIN_X * SCALE,
        y: MARGIN + (j % rows) * PITCH_Y - C_MIN_Y * SCALE,
        color,
        pool,
      });
    }
    const W = MARGIN * 2 + (cols - 1) * PITCH_X + C_W * SCALE;
    const H = MARGIN * 2 + (rows - 1) * PITCH_Y + C_H * SCALE;
    return { targets, W, H, per };
  }, [count, color, pool]);

  useSpriteWalkers(canvasRef, targets, { scale: SCALE, layoutKey: `scalar:${id}` });

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        aria-hidden="true"
        style={{ imageRendering: 'pixelated', width: W, maxWidth: '100%' }}
      />
      {per > 1 && (
        <span className="font-sans text-pica-subtitle text-text-muted">{perLabel(per)}</span>
      )}
    </div>
  );
}

export default function ScalarViz({ data }: { data: DatasetEscalar }) {
  const color = TEMA_COLOR[data.tematica];
  const reduced = useReducedMotion() ?? false;
  const current = useCountUp(data.valor, reduced);
  const up = (data.variacion?.valor ?? 0) >= 0;
  const icon = unitIcon(data.unidad);
  const conPersonas = data.personas === true && data.valor > 0;

  const numero = (
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
  );

  return (
    <div
      className={
        conPersonas
          ? 'flex min-h-[60vh] flex-col items-center justify-center gap-5 px-2 text-center'
          : 'flex min-h-[60vh] flex-col items-center justify-center text-center'
      }
    >
      {/* Entidad con su icono */}
      <div className={`flex items-center gap-3 ${conPersonas ? '' : 'mb-2'}`}>
        <EntityIcon entidad={data.entidad} color={color} size={36} />
        <p className="font-sans text-pica-paragraph uppercase tracking-widest text-text-muted">
          {data.entidad} · {data.anio}
        </p>
      </div>

      <h2 className="font-display text-pica-title font-bold text-text-primary">
        {data.caracteristica}
      </h2>

      {conPersonas ? (
        // Número a la izquierda, personas a la derecha (centrado en pantalla)
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          <div className="flex items-center gap-4">
            {icon && <PixelIcon name={icon} size={72} color={color} />}
            {numero}
            {data.unidad && data.unidad !== '%' && data.unidad !== '$UYU' && (
              <span className="font-sans text-pica-paragraph text-text-secondary">{data.unidad}</span>
            )}
          </div>
          <ScalarCrowd count={data.valor} color={color} pool={scalarPool(data.entidad, data.caracteristica)} id={data.id} />
        </div>
      ) : (
        <>
          <div className="my-6 flex items-center justify-center gap-5">
            {icon && <PixelIcon name={icon} size={72} color={color} />}
            {numero}
          </div>
          {data.unidad && data.unidad !== '%' && data.unidad !== '$UYU' && (
            <p className="font-sans text-pica-paragraph text-text-secondary">{data.unidad}</p>
          )}
        </>
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
        <p className={`max-w-md font-sans text-pica-subtitle text-text-muted ${conPersonas ? '' : 'mt-1'}`}>
          {data.contexto}
        </p>
      )}
      <p className="max-w-xl font-sans text-pica-subtitle text-text-secondary">
        {data.descripcion}
      </p>

      <VizMeta dataset={data} />
    </div>
  );
}
