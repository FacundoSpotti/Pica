'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — FlagCalibrator (herramienta de desarrollo)
// Posiciona la bandera del Palacio: se activa con la tecla B sobre el Home.
// · Click sobre el landscape → coloca la bandera ahí (preview en vivo, con
//   mástil y flameo reales)
// · C → copia `PALACIO_FLAG_ANCHOR` al clipboard en el formato exacto de
//   lib/assets.ts (también lo imprime en consola como respaldo)
// · B → salir del modo
// Montar DENTRO del stage para que los % coincidan con el landscape.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import PalacioFlag from './PalacioFlag';
import { PALACIO_FLAG_ANCHOR } from '@/lib/assets';
import {
  CALIBRATION_EVENT,
  calibration,
  setCalibrationMode,
  type CalibrationMode,
} from './calibrationState';

function serialize(a: { x: number; y: number }): string {
  return `export const PALACIO_FLAG_ANCHOR: { x: number; y: number } = { x: ${a.x}, y: ${a.y} };`;
}

export default function FlagCalibrator() {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<CalibrationMode>(calibration.mode);
  const [anchor, setAnchor] = useState<{ x: number; y: number }>(PALACIO_FLAG_ANCHOR);
  const [flash, setFlash] = useState<string | null>(null);
  const activeRef = useRef(false);
  const anchorRef = useRef(anchor);
  const overlayRef = useRef<HTMLDivElement>(null);
  activeRef.current = active;
  anchorRef.current = anchor;

  useEffect(() => {
    const onMode = (e: Event) => setMode((e as CustomEvent<CalibrationMode>).detail);
    window.addEventListener(CALIBRATION_EVENT, onMode);
    return () => window.removeEventListener(CALIBRATION_EVENT, onMode);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'b') {
        // P/H tienen prioridad si están activos
        if (calibration.mode === 'paths' || calibration.mode === 'hitboxes') return;
        const next = !activeRef.current;
        setActive(next);
        setCalibrationMode(next ? 'flag' : 'none');
        return;
      }
      if (!activeRef.current) return;

      if (k === 'c') {
        const text = serialize(anchorRef.current);
        console.log(text);
        navigator.clipboard
          ?.writeText(text)
          .then(() => setFlash('¡Copiado al portapapeles! Pegalo en lib/assets.ts'))
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
    setAnchor({
      x: Number(((e.clientX - rect.left) / rect.width).toFixed(4)),
      y: Number(((e.clientY - rect.top) / rect.height).toFixed(4)),
    });
  };

  if (!active) {
    if (mode !== 'none') return null; // otro calibrador en uso
    return (
      <div
        className="pointer-events-none absolute bottom-8 right-2 z-40 bg-black/70 px-2 py-1 text-[11px] text-white/70"
        style={{ fontFamily: 'monospace' }}
      >
        B · posicionar bandera
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-40 cursor-crosshair select-none"
      onClick={handleClick}
    >
      {/* Preview en vivo: bandera + mástil reales en la posición elegida */}
      <PalacioFlag anchor={anchor} />
      {/* Cruz del ancla exacta */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 border border-yellow-300"
        style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }}
      />

      {/* HUD de instrucciones y estado */}
      <div
        className="pointer-events-none absolute left-2 top-2 z-50 bg-black/85 px-3 py-2 text-[12px] leading-relaxed text-white"
        style={{ fontFamily: 'monospace' }}
      >
        <p className="font-bold text-yellow-300">MODO BANDERA DEL PALACIO</p>
        <p>click → colocar bandera · C copiar PALACIO_FLAG_ANCHOR · B salir</p>
        <p className="mt-1 text-white/70">
          ancla: {anchor.x}, {anchor.y}
        </p>
        {flash && <p className="mt-1 text-green-400">{flash}</p>}
      </div>
    </div>
  );
}
