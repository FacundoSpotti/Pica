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
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSpriteWalkers, type WalkerTarget } from '@/hooks/useSpriteWalkers';
import type { DatasetEspacial } from '@/types/data';
import { VizHeader, VizMeta } from './VizShared';

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
  crowd = true,
  bleedW,
  side,
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
  /** false = sin multitud (datos que no son personas): solo nombre + número */
  crowd?: boolean;
  /** ancho (px) de la columna: el canvas se estira hasta ahí para que las
   *  figuras entren desde el borde EXTERIOR de la ventana. Sin él → sin sangrado. */
  bleedW?: number;
  /** de qué lado del mapa vive este panel (define borde de entrada y anclaje) */
  side?: 'left' | 'right';
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CAP = CROWD_COLS * CROWD_ROWS; // techo de figuras por panel (200)
  const bleeding = Boolean(bleedW) && crowd;

  const { targets, canvasW, panelH } = useMemo(() => {
    if (!crowd) return { targets: [] as WalkerTarget[], canvasW: 0, panelH: 0 };
    const colored = Math.min(CAP, figureCount(dept.valor, per));
    // Proporción: `base/per` figuras con el resto en gris. Magnitud: solo coloreadas.
    const total = mode === 'proporcion' ? Math.min(CAP, Math.round(base / per)) : colored;
    // El canvas se ajusta a las figuras REALES: en magnitud con pocas figuras
    // (ej. tasa 2-3) las filas también se reducen — sin cajas vacías gigantes.
    // Magnitud: orientación HORIZONTAL — filas = ceil(total/8) (18 casos ⇒ 3×6)
    const rows =
      mode === 'proporcion'
        ? CROWD_ROWS
        : Math.max(1, Math.min(CROWD_ROWS, Math.ceil(total / 8)));
    const cols = Math.max(1, Math.ceil(total / rows));
    const mW = MARGIN * 2 + (cols - 1) * PITCH_X + C_W * SCALE; // ancho de la multitud
    const panelH = MARGIN * 2 + (rows - 1) * PITCH_Y + C_H * SCALE;

    // SANGRADO: el canvas se ensancha hasta la columna manteniendo la escala de
    // dibujo de la multitud (misma que sin sangrado). La multitud se ancla al
    // lado del MAPA (derecha en el panel izquierdo, izquierda en el derecho) y el
    // resto del canvas queda transparente para que las figuras caminen desde el
    // borde exterior.
    const displayW = mode === 'proporcion' ? maxW : Math.min(mW, maxW); // ancho CSS actual de la multitud
    const s = displayW / mW; // escala de dibujo (CSS/lógico)
    const canvasW = bleedW && s > 0 ? Math.max(mW, Math.round(bleedW / s)) : mW;
    const offX = side === 'left' ? canvasW - mW : 0; // izquierda: multitud a la derecha (mapa)

    const out: WalkerTarget[] = [];
    for (let j = 0; j < total; j++) {
      out.push({
        x: offX + MARGIN + Math.floor(j / rows) * PITCH_X - C_MIN_X * SCALE,
        y: MARGIN + (j % rows) * PITCH_Y - C_MIN_Y * SCALE,
        color: j < colored ? colorOf(dept.valor) : CONTEXT_GRAY,
      });
    }
    return { targets: out, canvasW, panelH };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept.id, dept.valor, per, mode, base, crowd, bleedW, side, maxW]);

  // layoutKey con canvasW: si cambia el ancho (sangrado/densidad), se reconstruye.
  // enterFrom: en el sangrado las figuras entran desde el borde EXTERIOR (ventana).
  useSpriteWalkers(canvasRef, targets, {
    scale: SCALE,
    layoutKey: `map:${dept.id}:${canvasW}`,
    enterFrom: bleeding ? (side === 'right' ? 'right' : 'left') : 'nearest',
  });

  const delta = compareTo ? dept.valor - compareTo.valor : null;
  const deltaSuffix = mode === 'proporcion' ? ' pp' : unidad ? ` ${unidad}` : '';

  const info = (
    <div className={`min-w-0 ${bleeding && side === 'left' ? 'ml-auto' : ''}`} style={{ maxWidth: maxW }}>
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
          // Halo tenue del mismo color — puro detalle estético. color-mix
          // porque colorOf devuelve "rgb(…)" (no hex, no se le apenda alpha).
          textShadow: `0 0 22px color-mix(in srgb, ${colorOf(dept.valor)} 28%, transparent)`,
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
      {/* Sin multitud (no-personas): la unidad debajo del número, legible */}
      {!crowd && unidad && (
        <p className="font-sans text-pica-subtitle text-text-muted">{unidad}</p>
      )}
    </div>
  );

  if (!crowd) return <div className={bleeding ? 'w-full' : 'min-w-0'}>{info}</div>;

  const canvasEl = (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={panelH}
      role="img"
      aria-label={`${dept.nombre}: ${dept.valor}${unidad ? ` ${unidad}` : ''}${mode === 'proporcion' ? ' representado con figuras sobre el total de referencia.' : ' — una figura por caso.'}`}
      className="mt-2 block"
      style={{
        imageRendering: 'pixelated',
        // Sangrado: el canvas ocupa TODO el ancho de la columna (las figuras
        // entran desde el borde de la ventana); sin sangrado, tamaño natural.
        width: bleeding ? '100%' : 'auto',
        height: 'auto',
        maxWidth: '100%',
        minWidth: !bleeding && mode === 'proporcion' ? '100%' : undefined,
        // no captura el hover del mapa
        pointerEvents: 'none',
      }}
    />
  );

  // Con sangrado: el panel ocupa la columna, el número se ancla al lado del mapa
  // y el canvas se extiende hacia el borde exterior.
  return bleeding ? (
    <div className="min-w-0 w-full">
      {info}
      {canvasEl}
    </div>
  ) : (
    <div className="min-w-0" style={{ maxWidth: maxW }}>
      {info}
      {canvasEl}
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
  // Mobile: menos figuras por panel (más grandes y livianas para el teléfono)
  const isMobile = useIsMobile();
  const { per } = useMemo(() => {
    if (proportional) return seriesScale(proporcionBase!, baseLabel, isMobile ? 100 : CAP);
    // Conteos/tasas absolutas: como máximo 1 figura por caso (per >= 1) —
    // si un departamento tiene 2, se dibujan 2.
    const s = seriesScale(maxV, data.unidad, isMobile ? 80 : 150);
    return s.per < 1 ? { per: 1, label: perLabel(1, data.unidad) } : s;
  }, [proportional, proporcionBase, baseLabel, maxV, data.unidad, CAP, isMobile]);

  // Alto disponible medido → mapa y multitudes entran sin scroll
  const rowRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ mapW: 400, panelW: 300, colW: 300 });
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const avail = Math.max(200, window.innerHeight - rect.top - 220);
      const mapW = Math.round(Math.min(430, ((avail - 30) * 480) / 520));
      // panel: nombre+número+delta ≈ 130px; el resto para la multitud
      const panelW = Math.round(Math.min(340, Math.max(180, (avail - 140) * (CROWD_W / CROWD_H))));
      // Ancho de cada columna lateral: la multitud se dibuja sobre un canvas
      // tan ancho como la columna, así las figuras entran/salen desde el borde
      // EXTERIOR (el de la ventana) y no desde una caja interna angosta.
      const colW = Math.max(panelW, Math.round((rect.width - mapW - 48) / 2));
      setFit({ mapW, panelW, colW });
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
        className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
      >
        {/* IZQUIERDA — panel del departamento seleccionado (SIEMPRE: si el dato
            no es de personas va sin multitud, solo nombre + número — el mapa
            de rapiñas quedaba mudo al click/hover sin esto) */}
        <div className="min-w-0 justify-self-center md:justify-self-stretch">
          <DeptPanel
            dept={active}
            colorOf={colorOf}
            unidad={data.unidad}
            per={per}
            mode={mode}
            base={proporcionBase ?? 100}
            maxW={fit.panelW}
            hint="(click en el mapa para cambiar)"
            crowd={showCrowd}
            bleedW={isMobile ? undefined : fit.colW}
            side="left"
          />
        </div>

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

          {/* Leyenda pixel: bloques discretos; la escala de figuras va DEBAJO
              del gradiente (al costado se solapaba con las multitudes de los
              paneles al hacer hover). */}
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
          </div>
          {/* La escala de figuras solo aplica cuando HAY multitud */}
          {showCrowd && (
            <p className="mt-1 text-center font-sans text-pica-subtitle text-text-muted">
              {perLabel(per, proportional ? baseLabel : data.unidad)}
            </p>
          )}
        </div>

        {/* DERECHA — comparador al hover (placeholder mantiene la composición).
            En MOBILE no existe el hover → se quita la comparación: solo se ve
            el departamento seleccionado. */}
        <div className="min-w-0 justify-self-center max-md:hidden md:justify-self-stretch">
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
                crowd={showCrowd}
                bleedW={isMobile ? undefined : fit.colW}
                side="right"
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
      </div>

      <VizMeta
        dataset={data}
        table={{
          caption: data.caracteristica,
          head: ['Departamento', `Valor${data.unidad ? ` (${data.unidad})` : ''}`],
          rows: [...data.departamentos]
            .sort((a, b) => b.valor - a.valor)
            .map((d) => [d.nombre, d.valor]),
        }}
      />
    </div>
  );
}
