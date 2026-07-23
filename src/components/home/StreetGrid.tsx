'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — StreetGrid
// Las calles del Home renderizadas por código desde STREET_PATHS (la fuente de
// verdad calibrada), extendidas hasta salir del viewport en las cuatro
// direcciones. SVG estático: se calcula una vez y solo se recalcula en resize
// (debounce) — nunca dentro del loop de RAF. Los puntos de HomeCanvas viajan
// EXACTAMENTE sobre esta calzada (mismo transform de src/lib/streets.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { STREET_PATHS, LANE_HALF } from '@/hooks/useColorDots';
import { stageBox, toScreen, extendPath } from '@/lib/streets';

/** Colores de la calzada (sobre las manzanas #0D0D0D, apenas por encima). */
const ROAD = '#161616';
const ROAD_EDGE = '#1E1E1E';
const LANE_DASH = '#242424';

export default function StreetGrid() {
  const [vp, setVp] = useState<{ vw: number; vh: number } | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const update = () => setVp({ vw: window.innerWidth, vh: window.innerHeight });
    update();
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(update, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(t);
    };
  }, []);

  if (!vp) return null;
  const box = stageBox(vp.vw, vp.vh);
  const roadW = LANE_HALF * 2 * box.h;
  // Polilíneas extendidas, ya en píxeles de pantalla.
  const roads = STREET_PATHS.map((p) =>
    extendPath(p, box, vp.vw, vp.vh).map(([x, y]) => toScreen(x, y, box)),
  );
  const str = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  return (
    <svg
      className="pointer-events-none fixed inset-0 h-full w-full"
      width={vp.vw}
      height={vp.vh}
      aria-hidden="true"
    >
      {/* Borde de calzada apenas más claro (da relieve de vereda) */}
      {roads.map((pts, i) => (
        <polyline
          key={`e${i}`}
          points={str(pts)}
          fill="none"
          stroke={ROAD_EDGE}
          strokeWidth={roadW + 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {/* Calzada */}
      {roads.map((pts, i) => (
        <polyline
          key={`r${i}`}
          points={str(pts)}
          fill="none"
          stroke={ROAD}
          strokeWidth={roadW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {/* Eje central punteado (lee como calle, no como línea dibujada) */}
      {roads.map((pts, i) => (
        <polyline
          key={`c${i}`}
          points={str(pts)}
          fill="none"
          stroke={LANE_DASH}
          strokeWidth={Math.max(1, roadW * 0.05)}
          strokeDasharray={`${(roadW * 0.5).toFixed(1)} ${(roadW * 0.8).toFixed(1)}`}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
}
