'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — EdgeDissolve
// Inmersión del landscape en el fondo: en vez de un borde/línea que separa el
// mapa, los bordes se "disuelven" en píxeles hacia el color del fondo — un
// dither retro: bloques del color del fondo pintados SOBRE el mapa, densísimos
// en el borde exterior (100%) y cada vez más ralos hacia adentro.
// · ANIMADO: los píxeles se alternan entre sí re-sorteando el patrón a ~7fps
//   (efecto "estática" retro). Con prefers-reduced-motion queda estático.
// · Un anillo exterior SÓLIDO garantiza que nunca asome la línea donde
//   termina la imagen de verdad.
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
  /** frames por segundo de la alternancia (retro: bajo a propósito) */
  fps?: number;
  className?: string;
}

export default function EdgeDissolve({
  color = '#0A0A0A',
  block = 2,
  band = 48,
  fps = 7,
  className = '',
}: EdgeDissolveProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const draw = (frameSeed: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;

      // Banda proporcional: en el mapa chico de mobile no se come el arte
      const b = Math.max(20, Math.min(band, Math.floor(Math.min(w, h) * 0.12)));

      // Anillo exterior SIEMPRE sólido: tapa la última fila/columna real de la
      // imagen (la "línea" que delataba dónde terminaba el mapa).
      const edge = block * 2;
      ctx.fillRect(0, 0, w, edge);
      ctx.fillRect(0, h - edge, w, edge);
      ctx.fillRect(0, 0, edge, h);
      ctx.fillRect(w - edge, 0, edge, h);

      // PRNG determinístico por frame (LCG): re-sortear la semilla alterna
      // qué píxeles están pintados — la "estática" retro.
      let seed = (0x9e3779b9 ^ Math.imul(frameSeed, 0x85ebca6b)) >>> 0;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      for (let y = 0; y < h; y += block) {
        for (let x = 0; x < w; x += block) {
          const cx = x + block / 2;
          const cy = y + block / 2;
          const d = Math.min(cx, cy, w - cx, h - cy);
          if (d < edge || d >= b) continue; // el anillo sólido ya está pintado
          // 1 en el borde exterior → 0 hacia adentro
          const t = 1 - Math.max(0, d) / b;
          if (rnd() < Math.pow(t, 1.6)) ctx.fillRect(x, y, block, block);
        }
      }
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let frame = 0;
    let last = 0;
    const interval = 1000 / fps;
    const loop = (now: number) => {
      if (now - last >= interval) {
        last = now;
        frame++;
        draw(frame);
      }
      raf = requestAnimationFrame(loop);
    };

    if (reduce) {
      draw(1);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => draw(frame));
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color, block, band, fps]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-10 h-full w-full ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
