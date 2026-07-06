'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipo C isotype: serie temporal con PERSONAS (v3)
// · CONTRASTE POBLACIONAL: si la unidad es proporcional (% o por mil), se
//   dibuja la población COMPLETA (~1.000 figuras): la demografía del valor en
//   el color del tema y el resto en gris — la proporción se VE (8,2% de
//   desempleo = 82 figuras de color entre 1.000).
// · FULL-BLEED: el canvas cubre toda el área visible; las figuras entran
//   caminando desde los bordes de la pantalla, no desde una caja interna.
// · Vista TODOS: barras por período, cada una con su color (paleta del tema),
//   ensanchadas hasta llenar el ancho disponible.
// · Rail vertical + rueda del mouse para navegar. Sin scroll: el canvas se
//   dimensiona al espacio medido.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { TEMA_COLOR, TEMA_PALETTE, textOnColor } from '@/lib/colors';
import { figureCount, perLabel, seriesScale } from '@/lib/isotype';
import { useSpriteWalkers, type WalkerTarget } from '@/hooks/useSpriteWalkers';
import type { DatasetSerie } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const SCALE = 2;
// Bounding box real del contenido dentro del frame 17×43 (ver IsotypeDistributionViz)
const C_MIN_X = 4;
const C_MIN_Y = 13;
const C_W = 9;
const C_H = 17;
const GAP = 1;
const PITCH_X = (C_W + GAP) * SCALE;
const PITCH_Y = (C_H + GAP) * SCALE;
const MARGIN = 2 * SCALE;
/** Alto (en figuras) de las barras de la vista TODOS. */
const BAR_ROWS = 10;
const BAR_GAP = 10 * SCALE;
/** Gris del "resto de la población" en el contraste poblacional. */
const CONTEXT_GRAY = '#4E4E48';

type ViewSel = number | 'all';

interface Bar {
  periodo: string;
  valor: number;
  color: string;
  frac: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Paso más fino de la secuencia 1/2/5 (para ensanchar TODOS hasta llenar). */
function finerPer(per: number): number {
  const e = 10 ** Math.floor(Math.log10(per));
  const m = Math.round(per / e);
  if (m >= 5) return 2 * e;
  if (m >= 2) return e;
  return e / 2;
}

/** Redondeo amable para números estimados. */
function roundNice(n: number): number {
  if (n >= 10000) return Math.round(n / 1000) * 1000;
  if (n >= 1000) return Math.round(n / 100) * 100;
  return Math.round(n);
}

export default function IsotypeTimeSeriesViz({ data }: { data: DatasetSerie }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const color = TEMA_COLOR[data.tematica];
  const palette = TEMA_PALETTE[data.tematica];
  const [sel, setSel] = useState<ViewSel>(data.puntos.length - 1);

  // Unidades proporcionales → se puede mostrar el total poblacional
  const proportional = data.unidad === '%' || Boolean(data.unidad?.startsWith('por mil'));
  const totalUnits = data.unidad === '%' ? 100 : 1000;

  // ── Espacio disponible medido (el canvas llena esto, nunca lo desborda) ────
  const [fit, setFit] = useState({ cw: 1000, ah: 420 });
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setFit({
        cw: Math.max(360, el.clientWidth),
        ah: Math.max(240, window.innerHeight - rect.top - 150),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // ── Escala de la vista por período ─────────────────────────────────────────
  const single = useMemo(() => {
    if (proportional) {
      // Población completa ~1.000 figuras; el valor es la porción coloreada
      const { per } = seriesScale(totalUnits, data.unidad, 900);
      const totalFigs = Math.round(totalUnits / per);
      const counts = data.puntos.map((p) => figureCount(p.valor, per));
      return { per, label: perLabel(per, data.unidad), totalFigs, counts };
    }
    const maxValor = Math.max(...data.puntos.map((p) => p.valor));
    const { per, label } = seriesScale(maxValor, data.unidad, 500);
    const counts = data.puntos.map((p) => figureCount(p.valor, per));
    return { per, label, totalFigs: Math.max(...counts), counts };
  }, [data, proportional, totalUnits]);

  const budgetSingle = Math.max(180, fit.ah - 64);
  const budgetAll = Math.max(160, fit.ah - 64 - 48);

  // Grilla adaptada a la caja: filas ~proporción del área disponible
  const singleLayout = useMemo(() => {
    const total = single.totalFigs;
    const rows = clamp(
      Math.ceil(Math.sqrt((total * PITCH_X * budgetSingle) / (PITCH_Y * fit.cw))),
      4,
      40,
    );
    const cols = Math.max(1, Math.ceil(total / rows));
    const crowdW = (cols - 1) * PITCH_X + C_W * SCALE;
    const crowdH = (rows - 1) * PITCH_Y + C_H * SCALE;
    const view = clamp(
      Math.min(fit.cw / (crowdW + MARGIN * 2), budgetSingle / (crowdH + MARGIN * 2)),
      0.3,
      2.2,
    );
    // Canvas full-bleed: cubre toda el área visible; la multitud va centrada
    const canvasW = Math.max(crowdW + MARGIN * 2, Math.floor(fit.cw / view));
    const canvasH = Math.max(crowdH + MARGIN * 2, Math.floor(budgetSingle / view));
    const offX = Math.floor((canvasW - crowdW) / 2);
    const offY = Math.floor((canvasH - crowdH) / 2);
    return { rows, canvasW, canvasH, offX, offY };
  }, [single.totalFigs, fit.cw, budgetSingle]);

  // ── Vista TODOS: barras coloreadas, ensanchadas hasta llenar el ancho ─────
  const all = useMemo(() => {
    const maxValor = Math.max(...data.puntos.map((p) => p.valor));
    let per = seriesScale(maxValor, data.unidad, BAR_ROWS * 2).per;

    const compute = (p: number) => {
      const counts = data.puntos.map((pt) => figureCount(pt.valor, p));
      const cols = counts.map((n) => Math.max(1, Math.ceil(n / BAR_ROWS)));
      const barW = cols.map((c) => (c - 1) * PITCH_X + C_W * SCALE);
      const crowdW = barW.reduce((a, w) => a + w, 0) + BAR_GAP * (data.puntos.length - 1);
      const crowdH = (BAR_ROWS - 1) * PITCH_Y + C_H * SCALE;
      const total = counts.reduce((a, n) => a + n, 0);
      return { counts, barW, crowdW, crowdH, total };
    };

    // Afinar la escala hasta que las barras llenen el ancho disponible
    let m = compute(per);
    for (let i = 0; i < 8; i++) {
      const heightView = budgetAll / (m.crowdH + MARGIN * 2);
      if (m.crowdW * heightView >= fit.cw * 0.88 || m.total > 2200) break;
      const f = finerPer(per);
      if (f === per) break;
      per = f;
      m = compute(per);
    }

    const view = clamp(
      Math.min(fit.cw / (m.crowdW + MARGIN * 2), budgetAll / (m.crowdH + MARGIN * 2)),
      0.3,
      2.2,
    );
    const canvasW = Math.max(m.crowdW + MARGIN * 2, Math.floor(fit.cw / view));
    const canvasH = Math.max(m.crowdH + MARGIN * 2, Math.floor(budgetAll / view));
    const offX = Math.floor((canvasW - m.crowdW) / 2);
    const offY = Math.floor((canvasH - m.crowdH) / 2);

    const bars: Bar[] = [];
    const targets: WalkerTarget[] = [];
    let x0 = offX;
    data.puntos.forEach((p, i) => {
      const n = m.counts[i]!;
      const barColor = palette[i % palette.length]!;
      for (let j = 0; j < n; j++) {
        // Llenado por columnas, de abajo hacia arriba (barra apoyada en el eje)
        targets.push({
          x: x0 + Math.floor(j / BAR_ROWS) * PITCH_X - C_MIN_X * SCALE,
          y: offY + (BAR_ROWS - 1 - (j % BAR_ROWS)) * PITCH_Y - C_MIN_Y * SCALE,
          color: barColor,
        });
      }
      bars.push({
        periodo: p.periodo,
        valor: p.valor,
        color: barColor,
        frac: (m.barW[i]! + (i < data.puntos.length - 1 ? BAR_GAP : 0)) / m.crowdW,
      });
      x0 += m.barW[i]! + BAR_GAP;
    });

    return {
      targets,
      bars,
      canvasW,
      canvasH,
      crowdViewW: Math.round(m.crowdW * view),
      label: perLabel(per, data.unidad),
      per,
    };
  }, [data, palette, fit.cw, budgetAll]);

  // ── Targets de la vista por período ────────────────────────────────────────
  const targets = useMemo(() => {
    if (sel === 'all') return all.targets;
    const { rows, offX, offY } = singleLayout;
    const colored = single.counts[sel] ?? 0;
    const total = proportional ? single.totalFigs : colored;
    const out: WalkerTarget[] = [];
    for (let j = 0; j < total; j++) {
      out.push({
        x: offX + Math.floor(j / rows) * PITCH_X - C_MIN_X * SCALE,
        y: offY + (j % rows) * PITCH_Y - C_MIN_Y * SCALE,
        // La demografía primero (banda de color), el resto de la población en gris
        color: j < colored ? color : CONTEXT_GRAY,
      });
    }
    return out;
  }, [sel, all, single, singleLayout, proportional, color]);

  const isAll = sel === 'all';
  const canvasW = isAll ? all.canvasW : singleLayout.canvasW;
  const canvasH = isAll ? all.canvasH : singleLayout.canvasH;

  useSpriteWalkers(canvasRef, targets, {
    scale: SCALE,
    layoutKey: `${data.id}:${sel}:${canvasW}x${canvasH}`,
  });

  // ── Rueda del mouse = navegar períodos (y al final, TODOS) ─────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let acc = 0;
    let cooldown = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // el visor captura el scroll — la página no se mueve
      const now = performance.now();
      if (now < cooldown) return;
      acc += e.deltaY;
      if (Math.abs(acc) > 50) {
        const dir = acc > 0 ? 1 : -1;
        acc = 0;
        cooldown = now + 180;
        setSel((s) => {
          const n = data.puntos.length; // posiciones 0..n-1 = años, n = TODOS
          const cur = s === 'all' ? n : s;
          const next = Math.max(0, Math.min(n, cur + dir));
          return next === n ? 'all' : next;
        });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [data.puntos.length]);

  const punto = !isAll ? data.puntos[sel]! : null;
  const prev = !isAll && sel > 0 ? data.puntos[sel - 1] : null;
  const delta = punto && prev ? punto.valor - prev.valor : null;
  const factor = data.unidad === '%' ? 0.01 : data.unidad?.startsWith('por mil') ? 0.001 : 1;
  const absoluto = punto && data.base ? roundNice(punto.valor * factor * data.base.valor) : null;

  const ariaLabel = `${data.caracteristica}, serie por período: ${data.puntos
    .map((p) => `${p.periodo} ${p.valor}${data.unidad ?? ''}`)
    .join(', ')}. ${
    proportional && !isAll
      ? `Las figuras de color son la demografía sobre el total (${totalUnits === 100 ? 'cada 100' : 'cada 1.000'}); el resto en gris. `
      : ''
  }Escala: ${isAll ? all.label : single.label}.`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <VizHeader dataset={data} compact center />
      </div>

      <div ref={wrapperRef} className="flex w-full items-start gap-4">
        {/* Área principal */}
        <div ref={mainRef} className="min-w-0 flex-1">
          {/* Encabezado del estado actual */}
          <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-0">
            {punto ? (
              <>
                <p
                  className="font-display font-black leading-none"
                  style={{ color, fontSize: 44, fontVariationSettings: '"ELGR" 1, "ELSH" 2' }}
                >
                  {punto.valor.toLocaleString('es-UY')}
                  {data.unidad === '%' ? '%' : ''}
                </p>
                {absoluto !== null && (
                  <p className="font-sans text-pica-paragraph text-text-primary">
                    ≈{' '}
                    <strong className="font-display font-bold" style={{ color }}>
                      {absoluto.toLocaleString('es-UY')}
                    </strong>{' '}
                    {data.base!.label}
                  </p>
                )}
                <p className="font-sans text-pica-paragraph text-text-secondary">
                  en {punto.periodo}
                  {punto.label ? ` (${punto.label})` : ''}
                </p>
                {delta !== null && (
                  <p className="font-sans text-pica-subtitle text-text-muted">
                    <span aria-hidden="true" style={{ color }}>
                      {delta >= 0 ? '▲' : '▼'}
                    </span>{' '}
                    {delta >= 0 ? '+' : ''}
                    {delta.toLocaleString('es-UY', { maximumFractionDigits: 2 })} vs{' '}
                    {prev!.periodo}
                  </p>
                )}
                {proportional && (
                  <span className="flex items-center gap-2 font-sans text-pica-subtitle text-text-secondary">
                    <span
                      aria-hidden="true"
                      className="inline-block h-3 w-3"
                      style={{ backgroundColor: color }}
                    />
                    {data.base?.label ?? 'la demografía'}
                    <span
                      aria-hidden="true"
                      className="ml-1 inline-block h-3 w-3"
                      style={{ backgroundColor: CONTEXT_GRAY }}
                    />
                    resto de {totalUnits === 100 ? 'cada 100' : 'cada 1.000'}
                  </span>
                )}
              </>
            ) : (
              <p className="font-display text-pica-button font-bold uppercase text-text-primary">
                Todos los períodos
              </p>
            )}
            <span className="ml-auto font-sans text-pica-subtitle text-text-secondary">
              {isAll ? all.label : single.label} · scrolleá para navegar
            </span>
          </div>

          {/* Canvas full-bleed: cubre el área — las figuras entran desde los bordes */}
          <div role="img" aria-label={ariaLabel}>
            <canvas
              ref={canvasRef}
              width={canvasW}
              height={canvasH}
              aria-hidden="true"
              className="w-full"
              style={{
                imageRendering: 'pixelated',
                borderBottom: isAll ? '2px solid rgba(235,235,235,0.25)' : 'none',
              }}
            />
            {/* Etiquetas de las barras en la vista TODOS (alineadas al bloque) */}
            {isAll && (
              <div
                className="mx-auto mt-1 flex"
                style={{ width: all.crowdViewW, maxWidth: '100%' }}
                aria-hidden="true"
              >
                {all.bars.map((b) => (
                  <div key={b.periodo} style={{ width: `${b.frac * 100}%` }}>
                    <p className="font-sans text-pica-subtitle leading-tight text-text-muted">
                      {b.periodo}
                    </p>
                    <p
                      className="font-display text-[18px] font-bold leading-tight"
                      style={{ color: b.color }}
                    >
                      {b.valor.toLocaleString('es-UY')}
                      {data.unidad === '%' ? '%' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rail vertical de períodos (compacto) */}
        <div
          role="group"
          aria-label="Elegir período (también con la rueda del mouse)"
          className="flex shrink-0 flex-col border-l-2 border-white/15 pl-2"
        >
          {data.puntos.map((p, i) => {
            const active = sel === i;
            return (
              <button
                key={p.periodo}
                type="button"
                aria-pressed={active}
                onClick={() => setSel(i)}
                className="px-2 py-0 text-left font-sans text-pica-subtitle leading-tight transition-colors"
                style={{
                  color: active ? textOnColor(color) : '#A0A09A',
                  backgroundColor: active ? color : 'transparent',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {p.periodo}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={isAll}
            onClick={() => setSel('all')}
            className="mt-1 border-t border-white/15 px-2 py-0.5 text-left font-display text-pica-subtitle font-bold uppercase leading-tight transition-colors"
            style={{
              color: isAll ? textOnColor(color) : '#EBEBEB',
              backgroundColor: isAll ? color : 'transparent',
              letterSpacing: '0.08em',
            }}
          >
            Todos
          </button>
        </div>
      </div>

      <DataTable
        caption={data.caracteristica}
        head={['Período', `Valor${data.unidad ? ` (${data.unidad})` : ''}`, 'Figuras']}
        rows={data.puntos.map((p, i) => [
          p.label ? `${p.periodo} (${p.label})` : p.periodo,
          p.valor,
          single.counts[i]!,
        ])}
      />
      <VizFooter dataset={data} />
    </div>
  );
}
