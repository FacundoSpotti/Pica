'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipo E: mapa de Uruguay por departamento (v2)
// · Mapa a la IZQUIERDA; a la derecha, además del número, la MULTITUD que
//   representa ese porcentaje (contraste poblacional: figuras de color sobre
//   el resto en gris, como en el resto de Pica).
// · Click en un departamento lo AÍSLA: el resto del mapa queda en gris.
//   (Hover previsualiza; click fija. Arranca en el departamento de mayor valor.)
// · Leyenda de gradiente en BLOQUES pixel (sin degradé continuo).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { interpolateRgb, max, min, scaleLinear } from 'd3';
import { TEMA_COLOR, TEMA_SCALE } from '@/lib/colors';
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
/** Multitud del panel: 20 columnas × 10 filas = 200 figuras (2 figuras = 1%). */
const CROWD_COLS = 20;
const CROWD_ROWS = 10;
const CONTEXT_GRAY = '#4E4E48';
/** Gris de los departamentos no seleccionados. */
const MAP_GRAY = '#3B3B36';
/** Bloques de la leyenda pixel. */
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

export default function MapViz({ data }: { data: DatasetEspacial }) {
  const [lo, hi] = TEMA_SCALE[data.tematica];
  const temaColor = TEMA_COLOR[data.tematica];
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Click fija la selección; hover previsualiza
  const [selected, setSelected] = useState<Dept | null>(topDept);
  const [hovered, setHovered] = useState<Dept | null>(null);
  const active = hovered ?? selected ?? topDept;

  // El mapa se dimensiona al alto disponible (tabla+fuente reservados) → sin scroll
  const rowRef = useRef<HTMLDivElement>(null);
  const [mapW, setMapW] = useState(400);
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const avail = Math.max(240, window.innerHeight - rect.top - 170);
      // proyección 480×520 → ancho = alto × (480/520)
      setMapW(Math.round(Math.min(448, (avail * 480) / 520)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Multitud proporcional del departamento activo ──────────────────────────
  const proportional = data.unidad === '%';
  const { per, crowd } = useMemo(() => {
    // 2 figuras = 1% → 200 figuras el total
    const { per } = seriesScale(100, '%', CROWD_COLS * CROWD_ROWS);
    const W = MARGIN * 2 + (CROWD_COLS - 1) * PITCH_X + C_W * SCALE;
    const H = MARGIN * 2 + (CROWD_ROWS - 1) * PITCH_Y + C_H * SCALE;
    return { per, crowd: { W, H } };
  }, []);

  const targets = useMemo(() => {
    if (!proportional) return [];
    const colored = figureCount(active.valor, per);
    const total = Math.round(100 / per);
    const out: WalkerTarget[] = [];
    for (let j = 0; j < total; j++) {
      out.push({
        x: MARGIN + Math.floor(j / CROWD_ROWS) * PITCH_X - C_MIN_X * SCALE,
        y: MARGIN + (j % CROWD_ROWS) * PITCH_Y - C_MIN_Y * SCALE,
        color: j < colored ? colorOf(active.valor) : CONTEXT_GRAY,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id, active.valor, per, proportional]);

  useSpriteWalkers(canvasRef, targets, { scale: SCALE, layoutKey: `${data.id}:${active.id}` });

  // Bloques de la leyenda pixel (gradiente discreto)
  const legendBlocks = Array.from({ length: LEGEND_BLOCKS }, (_, i) =>
    interpolateRgb(lo, hi)(i / (LEGEND_BLOCKS - 1)),
  );

  const toggleSelect = (dept: Dept) =>
    setSelected((cur) => (cur?.id === dept.id ? null : dept));

  return (
    <div>
      <VizHeader dataset={data} compact />

      <div ref={rowRef} className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* IZQUIERDA — mapa (dimensionado al alto disponible) */}
        <div
          role="img"
          aria-label={`Mapa de Uruguay: ${data.caracteristica}. Valores de ${minV} a ${maxV} ${data.unidad ?? ''}. Departamento seleccionado: ${selected?.nombre ?? 'ninguno'}.`}
          className="w-full shrink-0"
          style={{ maxWidth: mapW }}
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
                  // Con selección: solo el elegido conserva color
                  const fill = !dept
                    ? '#26262A'
                    : selected && selected.id !== dept.id
                      ? MAP_GRAY
                      : colorOf(dept.valor);
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
                        hover: { outline: 'none', opacity: 0.85, cursor: 'pointer' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>

          {/* Leyenda pixel: bloques discretos, no degradé continuo */}
          <div className="mt-2 flex items-center gap-2 font-sans text-pica-subtitle text-text-secondary">
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
          </div>
        </div>

        {/* DERECHA — número + multitud proporcional del departamento activo */}
        <div className="min-w-0 flex-1">
          <p className="font-display text-pica-button font-bold uppercase text-text-primary">
            {active.nombre}
            {selected?.id === active.id && !hovered && (
              <span className="ml-2 font-sans text-pica-subtitle font-normal normal-case text-text-muted">
                (click en el mapa para cambiar)
              </span>
            )}
          </p>
          <p
            className="font-display font-black leading-none"
            style={{
              color: colorOf(active.valor),
              fontSize: 56,
              fontVariationSettings: '"ELGR" 1, "ELSH" 2',
            }}
          >
            {active.valor.toLocaleString('es-UY')}
            {data.unidad === '%' ? '%' : ''}
          </p>

          {proportional && (
            <>
              <div className="mt-1 flex items-center gap-2 font-sans text-pica-subtitle text-text-secondary">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3"
                  style={{ backgroundColor: colorOf(active.valor) }}
                />
                {data.caracteristica}
                <span
                  aria-hidden="true"
                  className="ml-1 inline-block h-3 w-3"
                  style={{ backgroundColor: CONTEXT_GRAY }}
                />
                resto de cada 100
                <span className="ml-auto">{perLabel(per, '%')}</span>
              </div>
              <canvas
                ref={canvasRef}
                width={crowd.W}
                height={crowd.H}
                aria-label={`${active.nombre}: ${active.valor}${data.unidad ?? ''} representado con figuras de personas sobre un total de 100.`}
                role="img"
                className="mt-2 w-full max-w-xl"
                style={{ imageRendering: 'pixelated' }}
              />
            </>
          )}
        </div>
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
