'use client';

/* eslint-disable @next/next/no-img-element */
// Sprites de pixel art: <img> directo, sin optimizar (image-rendering: pixelated).

// ─────────────────────────────────────────────────────────────────────────────
// PICA — PlacementCalibrator (herramienta de desarrollo)
// Mueve y escala los edificios del Home. Se activa con la tecla E.
// · ARRASTRAR un edificio → lo desplaza
// · click → seleccionarlo (para las teclas); 1..6 → seleccionar por número
// · flechas → mover 0.001 (con Shift: 0.01)
// · + / −  → escalar 1% ANCLADO al punto de apoyo (no se despega del piso)
// · G → mostrar/ocultar el rombo de base (para calzar con la calle)
// · C → copia el bloque BUILDING_PLACEMENT listo para lib/assets.ts
// · E → salir
// Montar DENTRO del stage para que los % coincidan con el landscape.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import {
  assetUrl,
  BUILDING_FOOTPRINT,
  BUILDING_LAYERS,
  BUILDING_PLACEMENT,
  LANDSCAPE_PALACIO,
  type Placement,
} from '@/lib/assets';
import { TEMA_COLOR, TEMA_LABEL } from '@/lib/colors';
import {
  CALIBRATION_EVENT,
  calibration,
  setCalibrationMode,
  type CalibrationMode,
} from './calibrationState';
import type { Tematica } from '@/types/sprites';

type Key = Tematica | 'palacio';
/** Orden de la lista y de las teclas 1..6. */
const KEYS: Key[] = ['educacion', 'salud', 'seguridad', 'trabajo', 'palacio', 'economia'];

const SRC: Record<Key, string> = {
  educacion: BUILDING_LAYERS.educacion,
  salud: BUILDING_LAYERS.salud,
  seguridad: BUILDING_LAYERS.seguridad,
  trabajo: BUILDING_LAYERS.trabajo,
  economia: BUILDING_LAYERS.economia,
  palacio: LANDSCAPE_PALACIO,
};

const LABEL: Record<Key, string> = {
  educacion: TEMA_LABEL.educacion,
  salud: TEMA_LABEL.salud,
  seguridad: TEMA_LABEL.seguridad,
  trabajo: TEMA_LABEL.trabajo,
  economia: TEMA_LABEL.economia,
  palacio: 'Palacio',
};

const COLOR: Record<Key, string> = {
  educacion: TEMA_COLOR.educacion,
  salud: TEMA_COLOR.salud,
  seguridad: TEMA_COLOR.seguridad,
  trabajo: TEMA_COLOR.trabajo,
  economia: TEMA_COLOR.economia,
  palacio: '#EBEBEB',
};

const r5 = (n: number) => Number(n.toFixed(5));

function serialize(p: Record<Key, Placement>): string {
  const line = (k: Key) =>
    `  ${k}: { left: ${r5(p[k].left)}, top: ${r5(p[k].top)}, width: ${r5(p[k].width)}, height: ${r5(p[k].height)} },`;
  return [
    "export const BUILDING_PLACEMENT: Record<Tematica | 'palacio', Placement> = {",
    ...(['educacion', 'trabajo', 'salud', 'economia', 'seguridad', 'palacio'] as Key[]).map(line),
    '};',
  ].join('\n');
}

export default function PlacementCalibrator() {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<CalibrationMode>(calibration.mode);
  const [place, setPlace] = useState<Record<Key, Placement>>(() => ({ ...BUILDING_PLACEMENT }));
  const [sel, setSel] = useState<Key>('educacion');
  const [showBase, setShowBase] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);

  const activeRef = useRef(false);
  const placeRef = useRef(place);
  const selRef = useRef(sel);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ k: Key; px: number; py: number; l: number; t: number } | null>(null);
  activeRef.current = active;
  placeRef.current = place;
  selRef.current = sel;

  useEffect(() => {
    const onMode = (e: Event) => setMode((e as CustomEvent<CalibrationMode>).detail);
    window.addEventListener(CALIBRATION_EVENT, onMode);
    return () => window.removeEventListener(CALIBRATION_EVENT, onMode);
  }, []);

  /** Escala anclando el punto de apoyo (vértice inferior del rombo de base). */
  const scaleAt = (k: Key, factor: number) =>
    setPlace((prev) => {
      const p = prev[k];
      const f = BUILDING_FOOTPRINT[k];
      const bx = p.left + f.bottomX * p.width;
      const by = p.top + f.bottomY * p.height;
      const width = p.width * factor;
      const height = p.height * factor;
      return {
        ...prev,
        [k]: { left: bx - f.bottomX * width, top: by - f.bottomY * height, width, height },
      };
    });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'e') {
        // P/H/B tienen prioridad si están activos
        if (calibration.mode !== 'none' && calibration.mode !== 'placement') return;
        const next = !activeRef.current;
        setActive(next);
        setCalibrationMode(next ? 'placement' : 'none');
        return;
      }
      if (!activeRef.current) return;

      // 1..6 → seleccionar edificio
      const n = Number(e.key);
      if (n >= 1 && n <= KEYS.length) {
        setSel(KEYS[n - 1]!);
        return;
      }

      const step = e.shiftKey ? 0.01 : 0.001;
      const cur = selRef.current;
      const nudge = (dx: number, dy: number) => {
        e.preventDefault();
        setPlace((p) => ({
          ...p,
          [cur]: { ...p[cur], left: p[cur].left + dx, top: p[cur].top + dy },
        }));
      };
      if (e.key === 'ArrowLeft') return nudge(-step, 0);
      if (e.key === 'ArrowRight') return nudge(step, 0);
      if (e.key === 'ArrowUp') return nudge(0, -step);
      if (e.key === 'ArrowDown') return nudge(0, step);

      if (k === '+' || k === '=') return scaleAt(cur, 1.01);
      if (k === '-' || k === '_') return scaleAt(cur, 1 / 1.01);
      if (k === 'g') return setShowBase((s) => !s);
      if (k === 'r') return setPlace({ ...BUILDING_PLACEMENT });

      if (k === 'c') {
        const text = serialize(placeRef.current);
        console.log(text);
        navigator.clipboard
          ?.writeText(text)
          .then(() => setFlash('¡Copiado! Pegalo en lib/assets.ts'))
          .catch(() => setFlash('Clipboard falló — está en la consola (F12)'));
        setTimeout(() => setFlash(null), 2500);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Arrastre con pointer events (funciona con mouse y touch)
  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      const rect = rootRef.current?.getBoundingClientRect();
      if (!d || !rect) return;
      const dx = (e.clientX - d.px) / rect.width;
      const dy = (e.clientY - d.py) / rect.height;
      setPlace((p) => ({ ...p, [d.k]: { ...p[d.k], left: d.l + dx, top: d.t + dy } }));
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [active]);

  if (!active) {
    if (mode !== 'none') return null; // otro calibrador en uso
    return (
      <div
        className="pointer-events-none absolute bottom-14 right-2 z-40 bg-black/70 px-2 py-1 text-[11px] text-white/70"
        style={{ fontFamily: 'monospace' }}
      >
        E · mover edificios
      </div>
    );
  }

  const p = place[sel];

  return (
    <div ref={rootRef} className="absolute inset-0 z-40 select-none">
      {KEYS.map((k) => {
        const pl = place[k];
        const f = BUILDING_FOOTPRINT[k];
        const isSel = k === sel;
        // Rombo de base en % del sprite → para verificar el calce con la calle
        const gy = f.groundY * 100;
        const by = f.bottomY * 100;
        const bx = f.bottomX * 100;
        const ty = gy - (by - gy);
        return (
          <div
            key={k}
            className="absolute cursor-move"
            style={{
              left: `${pl.left * 100}%`,
              top: `${pl.top * 100}%`,
              width: `${pl.width * 100}%`,
              height: `${pl.height * 100}%`,
              outline: isSel ? `2px dashed ${COLOR[k]}` : '1px dashed rgba(255,255,255,0.25)',
              zIndex: isSel ? 2 : 1,
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              setSel(k);
              drag.current = { k, px: e.clientX, py: e.clientY, l: pl.left, t: pl.top };
            }}
          >
            <img
              src={assetUrl(SRC[k])}
              alt=""
              className="pointer-events-none h-full w-full"
              style={{ imageRendering: 'pixelated', opacity: isSel ? 1 : 0.85 }}
            />
            {/* Rombo de base del arte: si la calle no calza, se ve acá */}
            {showBase && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polygon
                  points={`0,${gy} ${bx},${by} 100,${gy} ${bx},${ty}`}
                  fill="none"
                  stroke={COLOR[k]}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                  opacity={isSel ? 0.9 : 0.35}
                />
              </svg>
            )}
            <span
              className="pointer-events-none absolute left-0 top-0 bg-black/80 px-1 text-[10px]"
              style={{ fontFamily: 'monospace', color: COLOR[k] }}
            >
              {KEYS.indexOf(k) + 1} {LABEL[k]}
            </span>
          </div>
        );
      })}

      {/* HUD abajo al centro: arriba a la izquierda lo tapa la nota de POBLACIÓN
          (las notas viven en un z-index hermano y ganan al del stage). */}
      <div
        className="pointer-events-none absolute bottom-2 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap bg-black/90 px-3 py-2 text-center text-[12px] leading-relaxed text-white"
        style={{ fontFamily: 'monospace' }}
      >
        <p className="font-bold text-yellow-300">MODO EMPLAZAMIENTO</p>
        <p>arrastrar → mover · 1..6 seleccionar · flechas mover (Shift ×10)</p>
        <p>+/− escalar (anclado al piso) · G rombo de base · R reset · C copiar · E salir</p>
        <p className="mt-1" style={{ color: COLOR[sel] }}>
          {LABEL[sel]}: left {r5(p.left)} · top {r5(p.top)} · width {r5(p.width)} · height{' '}
          {r5(p.height)}
        </p>
        {flash && <p className="mt-1 text-green-400">{flash}</p>}
      </div>
    </div>
  );
}
