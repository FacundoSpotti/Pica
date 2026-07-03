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
// Montar DENTRO del stage para que los % coincidan con el landscape.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
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

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Number(((e.clientX - rect.left) / rect.width).toFixed(3));
    const y = Number(((e.clientY - rect.top) / rect.height).toFixed(3));
    setPaths((ps) => {
      const next = ps.map((p) => [...p]);
      next[next.length - 1]!.push([x, y]);
      return next;
    });
  };

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursor([
      Number(((e.clientX - rect.left) / rect.width).toFixed(3)),
      Number(((e.clientY - rect.top) / rect.height).toFixed(3)),
    ]);
  };

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
      className="absolute inset-0 z-40 cursor-crosshair select-none"
      onClick={handleClick}
      onMouseMove={handleMove}
    >
      {/* Paths dibujados en tiempo real */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {paths.map((path, i) => {
          const isCurrent = i === paths.length - 1;
          return (
            <g key={i}>
              {path.length >= 2 && (
                <polyline
                  points={path.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                  fill="none"
                  stroke={isCurrent ? '#FFEA00' : '#39FF14'}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {path.map(([x, y], j) => (
                <circle
                  key={j}
                  cx={x * 100}
                  cy={y * 100}
                  r={2.5}
                  fill={isCurrent ? '#FFEA00' : '#39FF14'}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
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
