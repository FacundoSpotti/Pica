'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — LampCalibrator (herramienta de desarrollo)
// Marca los FAROLES de la ciudad y las MANZANAS que todavía no tienen temática.
// Se activa con la tecla L.
//
// · click → agrega un punto en la capa activa
// · T → alterna capa: faroles ⇄ manzanas
// · Z → deshace el último punto de la capa activa
// · X → borra la capa activa
// · V → previsualiza el efecto real (apaga las marcas de edición)
// · C → copia CITY_LAMPS y FUTURE_BLOCKS listos para lib/assets.ts
// · L → salir
//
// Cubre TODA la ventana y convierte pantalla→stage con stageBox(), igual que
// los calibradores de calles e hitboxes. Montar FUERA del stage (que está
// transformado y capturaría el `fixed`).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { stageBox, toScreen, toStage } from '@/lib/streets';
import { CITY_LAMPS, FUTURE_BLOCKS, GROUND_SLOPE } from '@/lib/assets';
import {
  CALIBRATION_EVENT,
  calibration,
  setCalibrationMode,
  type CalibrationMode,
} from './calibrationState';

type Pt = [number, number];
type Layer = 'lamps' | 'blocks';

const BLOCK_HW = 0.085; // mismo valor que CityAmbience

function serialize(lamps: Pt[], blocks: Pt[]): string {
  const list = (pts: Pt[]) => pts.map(([x, y]) => `[${x}, ${y}]`).join(', ');
  return (
    'export const CITY_LAMPS: ReadonlyArray<readonly [number, number]> = [\n' +
    (lamps.length ? '  ' + list(lamps) + ',\n' : '') +
    '];\n\n' +
    'export const FUTURE_BLOCKS: ReadonlyArray<readonly [number, number]> = [\n' +
    (blocks.length ? '  ' + list(blocks) + ',\n' : '') +
    '];'
  );
}

export default function LampCalibrator() {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<CalibrationMode>(calibration.mode);
  const [lamps, setLamps] = useState<Pt[]>(() => CITY_LAMPS.map(([x, y]) => [x, y] as Pt));
  const [blocks, setBlocks] = useState<Pt[]>(() => FUTURE_BLOCKS.map(([x, y]) => [x, y] as Pt));
  const [layer, setLayer] = useState<Layer>('lamps');
  const [preview, setPreview] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const activeRef = useRef(false);
  const layerRef = useRef(layer);
  const lampsRef = useRef(lamps);
  const blocksRef = useRef(blocks);
  activeRef.current = active;
  layerRef.current = layer;
  lampsRef.current = lamps;
  blocksRef.current = blocks;

  useEffect(() => {
    const onMode = (e: Event) => setMode((e as CustomEvent<CalibrationMode>).detail);
    window.addEventListener(CALIBRATION_EVENT, onMode);
    return () => window.removeEventListener(CALIBRATION_EVENT, onMode);
  }, []);

  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const box = stageBox(vp.w || 1, vp.h || 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'l') {
        if (calibration.mode !== 'none' && calibration.mode !== 'lamps') return;
        const next = !activeRef.current;
        setActive(next);
        setCalibrationMode(next ? 'lamps' : 'none');
        return;
      }
      if (!activeRef.current) return;

      const isLamps = layerRef.current === 'lamps';
      if (k === 't') return setLayer((l) => (l === 'lamps' ? 'blocks' : 'lamps'));
      if (k === 'v') return setPreview((p) => !p);
      if (k === 'z') {
        if (isLamps) setLamps((p) => p.slice(0, -1));
        else setBlocks((p) => p.slice(0, -1));
        return;
      }
      if (k === 'x') {
        if (isLamps) setLamps([]);
        else setBlocks([]);
        return;
      }
      if (k === 'c') {
        const text = serialize(lampsRef.current, blocksRef.current);
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

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const [x, y] = toStage(e.clientX, e.clientY, box);
    const pt: Pt = [Number(x.toFixed(4)), Number(y.toFixed(4))];
    if (layerRef.current === 'lamps') setLamps((p) => [...p, pt]);
    else setBlocks((p) => [...p, pt]);
  };

  if (!active) {
    if (mode !== 'none') return null;
    return (
      <div
        className="pointer-events-none absolute bottom-20 right-2 z-40 bg-black/70 px-2 py-1 text-[11px] text-white/70"
        style={{ fontFamily: 'monospace' }}
      >
        L · faroles y manzanas
      </div>
    );
  }

  const hw = BLOCK_HW * box.w;
  const hh = BLOCK_HW * box.w * GROUND_SLOPE;

  return (
    <div className="fixed inset-0 z-40 cursor-crosshair select-none" onClick={handleClick}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${vp.w || 1} ${vp.h || 1}`}
        aria-hidden="true"
      >
        {/* Manzanas marcadas */}
        {blocks.map(([x, y], i) => {
          const [sx, sy] = toScreen(x, y, box);
          return (
            <polygon
              key={`b${i}`}
              points={`${sx},${sy - hh} ${sx + hw},${sy} ${sx},${sy + hh} ${sx - hw},${sy}`}
              fill="rgba(235,235,235,0.05)"
              stroke={layer === 'blocks' ? '#39FF14' : 'rgba(235,235,235,0.35)'}
              strokeWidth={1.5}
              strokeDasharray="6 5"
            />
          );
        })}
        {/* Faroles marcados: halo de referencia + X del punto exacto */}
        {lamps.map(([x, y], i) => {
          const [sx, sy] = toScreen(x, y, box);
          const r = 5;
          return (
            <g key={`l${i}`}>
              <circle
                cx={sx}
                cy={sy}
                r={box.w * 0.018}
                fill="rgba(255,176,74,0.28)"
                stroke="none"
              />
              {!preview && (
                <g stroke={layer === 'lamps' ? '#FFEA00' : 'rgba(255,234,0,0.4)'} strokeWidth={1.25}>
                  <line x1={sx - r} y1={sy - r} x2={sx + r} y2={sy + r} />
                  <line x1={sx - r} y1={sy + r} x2={sx + r} y2={sy - r} />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* HUD abajo al centro (arriba lo tapan las notas del Home) */}
      <div
        className="pointer-events-none absolute bottom-2 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap bg-black/90 px-3 py-2 text-center text-[12px] leading-relaxed text-white"
        style={{ fontFamily: 'monospace' }}
      >
        <p className="font-bold text-yellow-300">
          MODO FAROLES — capa activa: {layer === 'lamps' ? 'FAROLES' : 'MANZANAS FUTURAS'}
        </p>
        <p>click agregar · T cambiar capa · Z deshacer · X borrar capa</p>
        <p>V previsualizar · C copiar · L salir</p>
        <p className="mt-1 text-white/70">
          faroles: {lamps.length} · manzanas: {blocks.length}
        </p>
        {flash && <p className="mt-1 text-green-400">{flash}</p>}
      </div>
    </div>
  );
}
