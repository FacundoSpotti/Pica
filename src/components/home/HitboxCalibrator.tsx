'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — HitboxCalibrator (herramienta de desarrollo)
// Modo calibración de hitboxes de edificios: se activa con la tecla H.
// · Click sobre el landscape → agrega un vértice al polígono de la temática
//   actual (coords en % 0–1)
// · N → pasa a la siguiente temática · 1-5 → salta a una temática específica
// · Z → deshace el último vértice
// · X → borra el polígono de la temática actual (para redibujarlo)
// · C → copia el bloque BUILDING_HITBOX_POLYGONS completo al clipboard
//       (también lo imprime en la consola como respaldo)
// · H → salir del modo
// Arranca precargado con los polígonos actuales de assets.ts: solo hace falta
// redibujar (X + clicks) los que estén mal.
//
// Cubre TODA LA VENTANA (el Home ya no tiene marco): se puede marcar fuera de
// la caja del stage, que es necesario para los edificios que sangran por el
// borde. La conversión pantalla→stage usa el mismo stageBox() que el resto.
// Montar FUERA del stage (el stage tiene transform y capturaría el `fixed`).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { stageBox, toScreen, toStage } from '@/lib/streets';
import { BUILDING_HITBOX_POLYGONS, PALACIO_HITBOX_POLYGON } from '@/lib/assets';
import { TEMA_COLOR, TEMA_LABEL } from '@/lib/colors';
import type { Tematica } from '@/types/sprites';
import {
  CALIBRATION_EVENT,
  calibration,
  setCalibrationMode,
  type CalibrationMode,
} from './calibrationState';

type Pt = [number, number];

/** Editables: las 5 temáticas + el Palacio (dato al azar). */
type CalKey = Tematica | 'palacio';
const SEQUENCE: readonly CalKey[] = [
  'educacion', 'salud', 'trabajo', 'economia', 'seguridad', 'palacio',
];
const colorOf = (k: CalKey) => (k === 'palacio' ? '#EBEBEB' : TEMA_COLOR[k]);
const labelOf = (k: CalKey) => (k === 'palacio' ? 'Palacio (dato al azar)' : TEMA_LABEL[k]);

/** Serializa los polígonos en el formato exacto de assets.ts (ambos bloques). */
function serialize(polys: Record<CalKey, Pt[]>): string {
  const temas = SEQUENCE.filter((k): k is Tematica => k !== 'palacio');
  const rows = temas.map(
    (tema) =>
      `  ${tema}: [` + polys[tema].map(([x, y]) => `[${x}, ${y}]`).join(', ') + '],',
  );
  const palacio =
    'export const PALACIO_HITBOX_POLYGON: Polygon = [\n' +
    polys.palacio.map(([x, y]) => `  [${x}, ${y}],`).join('\n') +
    '\n];';
  return (
    'export const BUILDING_HITBOX_POLYGONS: Record<Tematica, Polygon> = {\n' +
    rows.join('\n') +
    '\n};\n\n' +
    palacio
  );
}

/** Polígonos actuales de assets.ts como estado inicial editable. */
function initialPolys(): Record<CalKey, Pt[]> {
  const out = {} as Record<CalKey, Pt[]>;
  for (const tema of SEQUENCE) {
    const src = tema === 'palacio' ? PALACIO_HITBOX_POLYGON : BUILDING_HITBOX_POLYGONS[tema];
    out[tema] = src.map(([x, y]) => [x, y] as Pt);
  }
  return out;
}

function centroid(poly: Pt[]): Pt {
  if (poly.length === 0) return [0.5, 0.5];
  let sx = 0;
  let sy = 0;
  for (const [x, y] of poly) {
    sx += x;
    sy += y;
  }
  return [sx / poly.length, sy / poly.length];
}

export default function HitboxCalibrator() {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<CalibrationMode>(calibration.mode);
  const [polys, setPolys] = useState<Record<CalKey, Pt[]>>(initialPolys);
  const [temaIdx, setTemaIdx] = useState(0);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const activeRef = useRef(false);
  const polysRef = useRef(polys);
  const temaIdxRef = useRef(temaIdx);
  const overlayRef = useRef<HTMLDivElement>(null);
  activeRef.current = active;
  polysRef.current = polys;
  temaIdxRef.current = temaIdx;

  // Reaccionar a cambios de modo (para ocultar el badge si P está activo)
  useEffect(() => {
    const onMode = (e: Event) => setMode((e as CustomEvent<CalibrationMode>).detail);
    window.addEventListener(CALIBRATION_EVENT, onMode);
    return () => window.removeEventListener(CALIBRATION_EVENT, onMode);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'h') {
        if (calibration.mode === 'paths') return; // P tiene prioridad si está activo
        const next = !activeRef.current;
        setActive(next);
        setCalibrationMode(next ? 'hitboxes' : 'none');
        return;
      }
      if (!activeRef.current) return;

      const tema = SEQUENCE[temaIdxRef.current]!;
      if (k === 'n') {
        setTemaIdx((i) => (i + 1) % SEQUENCE.length);
      } else if (k >= '1' && k <= '5') {
        setTemaIdx(Number(k) - 1);
      } else if (k === 'z') {
        setPolys((ps) => ({ ...ps, [tema]: ps[tema].slice(0, -1) }));
      } else if (k === 'x') {
        setPolys((ps) => ({ ...ps, [tema]: [] }));
      } else if (k === 'c') {
        const text = serialize(polysRef.current);
        // Respaldo siempre en consola por si el clipboard falla
        console.log(text);
        navigator.clipboard
          ?.writeText(text)
          .then(() => setFlash('¡Copiado al portapapeles! (y en la consola)'))
          .catch(() => setFlash('Clipboard falló — el bloque está en la consola (F12)'));
        setTimeout(() => setFlash(null), 2500);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Tamaño de ventana: el overlay es full-screen y las coordenadas se calculan
  // contra la caja del stage, que depende del viewport.
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const box = stageBox(vp.w || 1, vp.h || 1);

  /** Pantalla → coordenadas del stage (pueden salir de [0,1]: no hay marco). */
  const at = (e: React.MouseEvent<HTMLDivElement>): Pt => {
    const [x, y] = toStage(e.clientX, e.clientY, box);
    return [Number(x.toFixed(3)), Number(y.toFixed(3))];
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = at(e);
    const tema = SEQUENCE[temaIdxRef.current]!;
    setPolys((ps) => ({ ...ps, [tema]: [...ps[tema], pt] }));
  };

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => setCursor(at(e));

  if (!active) {
    // Badge oculto si el calibrador de paths está en uso
    if (mode === 'paths') return null;
    return (
      <div
        className="pointer-events-none absolute bottom-7 right-2 z-40 bg-black/70 px-2 py-1 text-[11px] text-white/70"
        style={{ fontFamily: 'monospace' }}
      >
        H · calibrar hitboxes
      </div>
    );
  }

  const currentTema = SEQUENCE[temaIdx]!;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 cursor-crosshair select-none"
      onClick={handleClick}
      onMouseMove={handleMove}
    >
      {/* Polígonos en tiempo real (en píxeles de pantalla, vía toScreen) */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${vp.w || 1} ${vp.h || 1}`}
        aria-hidden="true"
      >
        {/* Borde de la caja del stage, como referencia */}
        <rect
          x={box.originX}
          y={box.originY}
          width={box.w}
          height={box.h}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeDasharray="6 6"
        />
        {SEQUENCE.map((tema) => {
          const poly = polys[tema];
          if (poly.length === 0) return null;
          const isCurrent = tema === currentTema;
          const pts = poly.map(([x, y]) => toScreen(x, y, box).join(',')).join(' ');
          return (
            <g key={tema}>
              {poly.length >= 3 ? (
                <polygon
                  points={pts}
                  fill={colorOf(tema)}
                  fillOpacity={isCurrent ? 0.22 : 0.1}
                  stroke={colorOf(tema)}
                  strokeWidth={isCurrent ? 2 : 1}
                />
              ) : (
                poly.length >= 2 && (
                  <polyline points={pts} fill="none" stroke={colorOf(tema)} strokeWidth={2} />
                )
              )}
              {/* Marcador en X (chico y calado): deja ver el arte debajo */}
              {isCurrent &&
                poly.map(([x, y], j) => {
                  const [sx, sy] = toScreen(x, y, box);
                  const r = 4;
                  return (
                    <g key={j} stroke="#FFEA00" strokeWidth={1.25}>
                      <line x1={sx - r} y1={sy - r} x2={sx + r} y2={sy + r} />
                      <line x1={sx - r} y1={sy + r} x2={sx + r} y2={sy - r} />
                    </g>
                  );
                })}
            </g>
          );
        })}
      </svg>

      {/* Etiquetas en el centroide de cada polígono (proyectadas a pantalla) */}
      {SEQUENCE.map((tema) => {
        const poly = polys[tema];
        if (poly.length === 0) return null;
        const [sx, sy] = toScreen(...centroid(poly), box);
        return (
          <span
            key={tema}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-black/80 px-1 text-[11px] leading-tight"
            style={{
              left: sx,
              top: sy,
              fontFamily: 'monospace',
              color: colorOf(tema),
            }}
          >
            {tema}
            {tema === currentTema ? ' ◀' : ''}
          </span>
        );
      })}

      {/* HUD de instrucciones y estado */}
      <div
        className="pointer-events-none absolute left-2 top-2 z-50 bg-black/85 px-3 py-2 text-[12px] leading-relaxed text-white"
        style={{ fontFamily: 'monospace' }}
      >
        <p className="font-bold" style={{ color: colorOf(currentTema) }}>
          MODO CALIBRACIÓN DE HITBOXES — {labelOf(currentTema).toUpperCase()} ({temaIdx + 1}/{SEQUENCE.length})
        </p>
        <p>click agregar vértice · N siguiente temática · 1-5 elegir</p>
        <p>Z deshacer vértice · X borrar temática actual (y redibujar)</p>
        <p>C copiar BUILDING_HITBOX_POLYGONS · H salir</p>
        <p className="mt-1 text-white/70">
          vértices: {SEQUENCE.map((t) => `${t.slice(0, 3)}:${polys[t].length}`).join(' · ')}
          {cursor ? ` · cursor: ${cursor[0]}, ${cursor[1]}` : ''}
        </p>
        {flash && <p className="mt-1 text-green-400">{flash}</p>}
      </div>
    </div>
  );
}
