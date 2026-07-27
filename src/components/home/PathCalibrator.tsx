'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — PathCalibrator (herramienta de desarrollo)
// Modo calibración de paths de calles: se activa con la tecla P sobre el Home.
// · Click sobre el landscape → agrega un punto al path actual (coords en % 0–1)
// · N → empieza un path nuevo
// · Z → deshace el último punto
// · X → borra todo
// · C → copia todos los paths al clipboard en el formato exacto de STREET_PATHS
//       (también los imprime en la consola como respaldo)
// · P → salir del modo
// Los paths dibujados se ven en lima en tiempo real; los STREET_PATHS actuales
// siguen visibles en rojo (debug de CityLandscape) para comparar.
//
// Cubre TODA LA VENTANA (el Home ya no tiene marco): se puede marcar fuera de
// la caja del stage y las coordenadas salen fuera de [0,1], que es justo lo que
// necesitan las calles que se extienden más allá del borde. La conversión
// pantalla→stage usa el mismo stageBox() que StreetGrid y los puntos, así que
// las coordenadas coinciden exactamente con lo que se dibuja.
// Montar FUERA del stage (el stage tiene transform y capturaría el `fixed`).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { stageBox, toScreen, toStage } from '@/lib/streets';
import { LANE_HALF } from '@/hooks/useColorDots';
import {
  CALIBRATION_EVENT,
  calibration,
  setCalibrationMode,
  type CalibrationMode,
} from './calibrationState';

type Pt = [number, number];

/** Serializa los paths dibujados en el formato exacto de STREET_PATHS. */
function serialize(paths: Pt[][]): string {
  const rows = paths
    .filter((p) => p.length >= 2)
    .map((p) => '  [' + p.map(([x, y]) => `[${x}, ${y}]`).join(', ') + '],');
  return (
    'export const STREET_PATHS: ReadonlyArray<ReadonlyArray<[number, number]>> = [\n' +
    rows.join('\n') +
    '\n];'
  );
}

export default function PathCalibrator() {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<CalibrationMode>(calibration.mode);
  const [paths, setPaths] = useState<Pt[][]>([[]]);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const activeRef = useRef(false);
  const pathsRef = useRef(paths);
  const overlayRef = useRef<HTMLDivElement>(null);
  activeRef.current = active;
  pathsRef.current = paths;

  // Reaccionar a cambios de modo (para ocultar el badge si H está activo)
  useEffect(() => {
    const onMode = (e: Event) => setMode((e as CustomEvent<CalibrationMode>).detail);
    window.addEventListener(CALIBRATION_EVENT, onMode);
    return () => window.removeEventListener(CALIBRATION_EVENT, onMode);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'p') {
        if (calibration.mode === 'hitboxes') return; // H tiene prioridad si está activo
        const next = !activeRef.current;
        setActive(next);
        setCalibrationMode(next ? 'paths' : 'none');
        return;
      }
      if (!activeRef.current) return;

      if (k === 'n') {
        // Path nuevo (solo si el actual tiene contenido)
        setPaths((ps) => (ps[ps.length - 1]!.length > 0 ? [...ps, []] : ps));
      } else if (k === 'z') {
        // Deshacer último punto (o quitar el path vacío)
        setPaths((ps) => {
          const next = ps.map((p) => [...p]);
          const last = next[next.length - 1]!;
          if (last.length > 0) last.pop();
          else if (next.length > 1) next.pop();
          return next;
        });
      } else if (k === 'x') {
        setPaths([[]]);
      } else if (k === 'c') {
        const text = serialize(pathsRef.current);
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
  /** Ancho de calzada en px, idéntico al que dibuja StreetGrid. */
  const roadW = LANE_HALF * 2 * box.h;

  /** Pantalla → coordenadas del stage (pueden salir de [0,1]: no hay marco). */
  const at = (e: React.MouseEvent<HTMLDivElement>): Pt => {
    const [x, y] = toStage(e.clientX, e.clientY, box);
    return [Number(x.toFixed(3)), Number(y.toFixed(3))];
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = at(e);
    setPaths((ps) => {
      const next = ps.map((p) => [...p]);
      next[next.length - 1]!.push(pt);
      return next;
    });
  };

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => setCursor(at(e));

  if (!active) {
    // Badge oculto si el calibrador de hitboxes está en uso
    if (mode === 'hitboxes') return null;
    // Pista discreta para descubrir el modo
    return (
      <div className="pointer-events-none absolute bottom-2 right-2 z-40 bg-black/70 px-2 py-1 text-[11px] text-white/70" style={{ fontFamily: 'monospace' }}>
        P · calibrar paths
      </div>
    );
  }

  const totalPoints = paths.reduce((acc, p) => acc + p.length, 0);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 cursor-crosshair select-none"
      onClick={handleClick}
      onMouseMove={handleMove}
    >
      {/* Paths dibujados en tiempo real, en PIXELES de pantalla (el overlay ya
          no comparte caja con el stage: cada punto se proyecta con toScreen). */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${vp.w || 1} ${vp.h || 1}`}
        aria-hidden="true"
      >
        {/* Borde de la caja del stage, como referencia de dónde estaba el marco */}
        <rect
          x={box.originX}
          y={box.originY}
          width={box.w}
          height={box.h}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeDasharray="6 6"
        />
        {paths.map((path, i) => {
          const isCurrent = i === paths.length - 1;
          const color = isCurrent ? '#FFEA00' : '#39FF14';
          const pts = path.map(([x, y]) => toScreen(x, y, box).join(',')).join(' ');
          return (
            <g key={i}>
              {/* ANCHO REAL de la calzada: mismo grosor que dibuja StreetGrid
                  (LANE_HALF·2·box.h), semitransparente, para ver si la calle
                  cae bien entre las manzanas y no se come los edificios. */}
              {path.length >= 2 && (
                <polyline
                  points={pts}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.25}
                  strokeWidth={roadW}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Eje de la calle (el path en sí) */}
              {path.length >= 2 && (
                <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
              )}
              {/* Marcador en X (chico y calado): deja ver el arte debajo */}
              {path.map(([x, y], j) => {
                const [sx, sy] = toScreen(x, y, box);
                const r = 4;
                return (
                  <g key={j} stroke={color} strokeWidth={1.25}>
                    <line x1={sx - r} y1={sy - r} x2={sx + r} y2={sy + r} />
                    <line x1={sx - r} y1={sy + r} x2={sx + r} y2={sy - r} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* HUD de instrucciones y estado */}
      <div
        className="pointer-events-none absolute left-2 top-2 z-50 bg-black/85 px-3 py-2 text-[12px] leading-relaxed text-white"
        style={{ fontFamily: 'monospace' }}
      >
        <p className="font-bold text-yellow-300">MODO CALIBRACIÓN DE PATHS</p>
        <p>click agregar punto · N nuevo path · Z deshacer</p>
        <p>X borrar todo · C copiar STREET_PATHS · P salir</p>
        <p className="mt-1 text-white/70">
          paths: {paths.filter((p) => p.length >= 2).length} · puntos: {totalPoints}
          {cursor ? ` · cursor: ${cursor[0]}, ${cursor[1]}` : ''}
        </p>
        {flash && <p className="mt-1 text-green-400">{flash}</p>}
      </div>
    </div>
  );
}
