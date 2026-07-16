'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — EdgeDissolve
// Inmersión del landscape en el fondo: en vez de un borde/línea que separa el
// mapa, los bordes se "disuelven" en píxeles hacia el color del fondo — un
// dither retro: bloques del color del fondo pintados SOBRE el mapa, densísimos
// en el borde exterior (100%) y cada vez más ralos hacia adentro.
// Determinístico (PRNG con semilla): el patrón no "hierve" al redibujar.
// pointer-events-none: los hitboxes de los edificios siguen recibiendo clicks.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

interface EdgeDissolveProps {
  /** color del fondo hacia el que se disuelve el mapa */
  color?: string;
  /** lado del bloque pixel (px CSS) */
  block?: number;
  /** ancho máximo de la banda de disolución (se achica en mapas chicos) */
  band?: number;
  className?: string;
}

export default function EdgeDissolve({
  color = '#0A0A0A',
  block = 6,
  band = 56,
  className = '',
}: EdgeDissolveProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;

      // Banda proporcional: en el mapa chico de mobile no se come el arte
      const b = Math.max(24, Math.min(band, Math.floor(Math.min(w, h) * 0.12)));

      // PRNG determinístico (LCG) — mismo patrón en cada redibujado
      let seed = 0x9e3779b9;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      for (let y = 0; y < h; y += block) {
        for (let x = 0; x < w; x += block) {
          // distancia del centro del bloque al borde más cercano
          const cx = x + block / 2;
          const cy = y + block / 2;
          const d = Math.min(cx, cy, w - cx, h - cy);
          if (d >= b) continue;
          // 1 en el borde exterior (sólido) → 0 hacia adentro
          const t = 1 - Math.max(0, d) / b;
          if (rnd() < Math.pow(t, 1.6)) ctx.fillRect(x, y, block, block);
        }
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [color, block, band]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-10 h-full w-full ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
