'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipo E: mapa de Uruguay por departamento (v3)
// · Mapa a la izquierda; a la derecha el panel del departamento SELECCIONADO
//   (click) con su multitud proporcional.
// · COMPARADOR: con uno seleccionado, hacer HOVER sobre otro abre un segundo
//   panel al lado (número + multitud + diferencia) — comparar es instantáneo.
// · Click aísla en el mapa (los demás en gris); el hovereado también se
//   enciende para leer la comparación.
// · Todo dimensionado al alto disponible medido → sin scroll vertical.
// · Leyenda de gradiente en BLOQUES pixel.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { interpolateRgb, max, min, scaleLinear } from 'd3';
import { TEMA_SCALE } from '@/lib/colors';
import { figureCount, perLabel, seriesScale } from '@/lib/isotype';
import { useSpriteWalkers, type WalkerTarget } from '@/hooks/useSpriteWalkers';
import type { DatasetEspacial } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const GEO_URL = '/geo/uruguay-departamentos.json';

const SCALE = 2;
// Contenido real de la figura dentro del frame 17×43 (ver IsotypeDistributionViz)
const C_MIN_X = 4;
const C_MIN_Y = 13;
const C_W = 9;
const C_H = 17;
const GAP = 1;
const PITCH_X = (C_W + GAP) * SCALE;
const PITCH_Y = (C_H + GAP) * SCALE;
const MARGIN = 2 * SCALE;
/** Multitud por panel: 20 columnas × 10 filas = 200 figuras (2 figuras = 1%). */
const CROWD_COLS = 20;
const CROWD_ROWS = 10;
const CROWD_W = MARGIN * 2 + (CROWD_COLS - 1) * PITCH_X + C_W * SCALE;
const CROWD_H = MARGIN * 2 + (CROWD_ROWS - 1) * PITCH_Y + C_H * SCALE;
const CONTEXT_GRAY = '#4E4E48';
/** Gris de los departamentos no seleccionados. */
const MAP_GRAY = '#3B3B36';
const LEGEND_BLOCKS = 7;

interface GeoProps {
  NAME_1?: string;
  HASC_1?: string;
}

interface Dept {
  id: string;
  nombre: string;
  valor: number;
}

/** Panel de un departamento: nombre + número + multitud proporcional. */
function DeptPanel({
  dept,
  colorOf,
  unidad,
  per,
  mode,
  base,
  maxW,
  hint,
  compareTo,
}: {
  dept: Dept;
  colorOf: (v: number) => string;
  unidad?: string;
  per: number;
  /** 'proporcion' = parte de un todo (`base`) con el resto en gris · 'magnitud' = conteo */
  mode: 'proporcion' | 'magnitud';
  /** total de referencia en modo proporción (100 para %, 1.000 para "por mil"…) */
  base: number;
  maxW: number;
  hint?: string;
  compareTo?: Dept | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CAP = CROWD_COLS * CROWD_ROWS; // techo de figuras por panel (200)

  const targets = useMemo(() => {
    const colored = Math.min(CAP, figureCount(dept.valor, per));
    // Proporción: `base/per` figuras con el resto en gris. Magnitud: solo coloreadas.
    const total = mode === 'proporcion' ? Math.min(CAP, Math.round(base / per)) : colored;
    const out: WalkerTarget[] = [];
    for (let j = 0; j < total; j++) {
      out.push({
        x: MARGIN + Math.floor(j / CROWD_ROWS) * PITCH_X - C_MIN_X * SCALE,
        y: MARGIN + (j % CROWD_ROWS) * PITCH_Y - C_MIN_Y * SCALE,
        color: j < colored ? colorOf(dept.valor) : CONTEXT_GRAY,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept.id, dept.valor, per, mode, base]);

  useSpriteWalkers(canvasRef, targets, { scale: SCALE, layoutKey: `map:${dept.id}` });

  const delta = compareTo ? dept.valor - compareTo.valor : null;
  const deltaSuffix = mode === 'proporcion' ? ' pp' : unidad ? ` ${unidad}` : '';

  return (
    <div className="min-w-0" style={{ maxWidth: maxW }}>
      <p className="truncate font-display text-pica-button font-bold uppercase text-text-primary">
        {dept.nombre}
        {hint && (
          <span className="ml-2 font-sans text-pica-subtitle font-normal normal-case text-text-muted">
            {hint}
          </span>
        )}
      </p>
      <p
        className="font-display font-black leading-none"
        style={{
          color: colorOf(dept.valor),
          fontSize: 44,
          fontVariationSettings: '"ELGR" 1, "ELSH" 2',
        }}
      >
        {dept.valor.toLocaleString('es-UY')}
        {unidad === '%' ? '%' : ''}
      </p>
      {delta !== null && (
        <p className="font-sans text-pica-subtitle text-text-secondary">
          <span aria-hidden="true" style={{ color: colorOf(dept.valor) }}>
            {delta >= 0 ? '▲' : '▼'}
          </span>{' '}
          {delta >= 0 ? '+' : ''}
          {delta.toLocaleString('es-UY', { maximumFractionDigits: 1 })}
          {deltaSuffix} vs {compareTo!.nombre}
        </p>
      )}
      <canvas
        ref={canvasRef}
        width={CROWD_W}
        height={CROWD_H}
        role="img"
        aria-label={`${dept.nombre}: ${dept.valor}${unidad ?? ''} representado con figuras sobre un total de 100.`}
        className="mt-2 w-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

export default function MapViz({ data }: { data: DatasetEspacial }) {
  const [lo, hi] = TEMA_SCALE[data.tematica];

  const vals = data.departamentos.map((d) => d.valor);
  const minV = min(vals) ?? 0;
  const maxV = max(vals) ?? 1;
  const t = scaleLinear().domain([minV, maxV]).range([0, 1]).clamp(true);
  const colorOf = (v: number) => interpolateRgb(lo, hi)(t(v));

  const byId = useMemo(
    () => new Map(data.departamentos.map((d) => [d.id as string, d])),
    [data],
  );
  const topDept = useMemo(
    () => [...data.departamentos].sort((a, b) => b.valor - a.valor)[0]!,
    [data],
  );

  // Click fija la selección; hover sobre OTRO abre el comparador
  const [selected, setSelected] = useState<Dept | null>(topDept);
  const [hovered, setHovered] = useState<Dept | null>(null);
  const active = selected ?? topDept;
  const compare = hovered && hovered.id !== active.id ? hovered : null;

  // Proporción (resto en gris) cuando el dato es parte de un todo: % → base 100;
  // "por mil" con `base` (ej. médicos/1.000 hab) → base 1.000. Si es un conteo de
  // personas suelto (`personas: true`, ej. fallecidos) → multitud por MAGNITUD.
  const CAP = CROWD_COLS * CROWD_ROWS;
  const proporcionBase = data.unidad === '%' ? 100 : (data.base?.valor ?? null);
  const proportional = proporcionBase !== null;
  const showCrowd = proportional || data.personas === true;
  const mode: 'proporcion' | 'magnitud' = proportional ? 'proporcion' : 'magnitud';
  const baseLabel = data.unidad === '%' ? '%' : data.base?.label;
  const { per } = useMemo(
    () =>
      proportional
        ? seriesScale(proporcionBase!, baseLabel, CAP)
        : seriesScale(maxV, data.unidad, 150),
    [proportional, proporcionBase, baseLabel, maxV, data.unidad, CAP],
  );

  // Alto disponible medido → mapa y multitudes entran sin scroll
  const rowRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ mapW: 400, panelW: 300 });
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const avail = Math.max(240, window.innerHeight - rect.top - 190);
      setFit({
        mapW: Math.round(Math.min(430, ((avail - 30) * 480) / 520)),
        // panel: nombre+número+delta ≈ 130px; el resto para la multitud
        panelW: Math.round(Math.min(340, Math.max(180, (avail - 140) * (CROWD_W / CROWD_H)))),
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const legendBlocks = Array.from({ length: LEGEND_BLOCKS }, (_, i) =>
    interpolateRgb(lo, hi)(i / (LEGEND_BLOCKS - 1)),
  );

  const toggleSelect = (dept: Dept) =>
    setSelected((cur) => (cur?.id === dept.id ? null : dept));

  return (
    <div>
      <VizHeader dataset={data} compact center />

      {/* Composición centrada: [seleccionado] [MAPA] [comparado] */}
      <div
        ref={rowRef}
        className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1fr]"
      >
        {/* IZQUIERDA — panel del departamento seleccionado */}
        {showCrowd && (
          <div className="min-w-0 justify-self-center md:justify-self-end">
            <DeptPanel
              dept={active}
              colorOf={colorOf}
              unidad={data.unidad}
              per={per}
              mode={mode}
              base={proporcionBase ?? 100}
              maxW={fit.panelW}
              hint="(click en el mapa para cambiar)"
            />
          </div>
        )}

        {/* CENTRO — mapa (dimensionado al alto disponible) */}
        <div
          role="img"
          aria-label={`Mapa de Uruguay: ${data.caracteristica}. Valores de ${minV} a ${maxV} ${data.unidad ?? ''}. Seleccionado: ${active.nombre}. Pasá el cursor por otro departamento para comparar.`}
          className="w-full shrink-0 justify-self-center"
          style={{ maxWidth: fit.mapW }}
        >
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 4200, center: [-55.8, -32.6] }}
            width={480}
            height={520}
            style={{ width: '100%', height: 'auto' }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const props = geo.properties as GeoProps;
                  const iso = props.HASC_1?.replace('.', '-') ?? '';
                  const dept = byId.get(iso);
                  // Con selección: el elegido y el hovereado en color, el resto gris
                  const lit = dept && (dept.id === active.id || dept.id === hovered?.id);
                  const fill = !dept ? '#26262A' : selected && !lit ? MAP_GRAY : colorOf(dept.valor);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="#0A0A0A"
                      strokeWidth={1}
                      onMouseEnter={() => dept && setHovered(dept)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => dept && toggleSelect(dept)}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none', opacity: 0.9, cursor: 'pointer' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>

          {/* Leyenda pixel: bloques discretos + escala de figuras */}
          <div className="mt-2 flex items-center justify-center gap-2 font-sans text-pica-subtitle text-text-secondary">
            <span>{minV.toLocaleString('es-UY')}</span>
            <div className="flex" aria-hidden="true">
              {legendBlocks.map((c, i) => (
                <span key={i} className="h-3 w-4" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span>
              {maxV.toLocaleString('es-UY')}
              {data.unidad === '%' ? '%' : ''}
            </span>
            <span className="ml-3 text-text-muted">
              {perLabel(per, proportional ? baseLabel : data.unidad)}
            </span>
          </div>
        </div>

        {/* DERECHA — comparador al hover (placeholder mantiene la composición).
            En MOBILE no existe el hover → se quita la comparación: solo se ve
            el departamento seleccionado. */}
        {showCrowd && (
          <div className="min-w-0 justify-self-center max-md:hidden md:justify-self-start">
            {compare ? (
              <DeptPanel
                dept={compare}
                colorOf={colorOf}
                unidad={data.unidad}
                per={per}
                mode={mode}
                base={proporcionBase ?? 100}
                maxW={fit.panelW}
                compareTo={active}
              />
            ) : (
              <div
                className="flex items-center justify-center border-2 border-dashed border-white/15 p-6 text-center font-sans text-pica-subtitle text-text-muted"
                style={{ width: fit.panelW, minHeight: 180 }}
              >
                Pasá el cursor por otro departamento para compararlo con {active.nombre}
              </div>
            )}
          </div>
        )}
      </div>

      <DataTable
        caption={data.caracteristica}
        head={['Departamento', `Valor${data.unidad ? ` (${data.unidad})` : ''}`]}
        rows={[...data.departamentos]
          .sort((a, b) => b.valor - a.valor)
          .map((d) => [d.nombre, d.valor])}
      />
      <VizFooter dataset={data} />
    </div>
  );
}
