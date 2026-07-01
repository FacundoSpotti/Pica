'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — HomeCanvas
// Canvas transparente que dibuja SOLO los puntos de colores, superpuesto al
// landscape. Render a 60fps (RAF), simulación interna a ~30fps. Se redimensiona
// con ResizeObserver. pointer-events: none para que los clicks lleguen a las
// hitboxes de CityLandscape que están debajo.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useColorDots } from '@/hooks/useColorDots';

interface HomeCanvasProps {
  /** Objetivo de convergencia en % (0–1) del stage, o null para movimiento normal. */
  convergeTarget: { x: number; y: number } | null;
  /** Cantidad de puntos. */
  count?: number;
}

const SIM_STEP_MS = 1000 / 30; // la simulación avanza a 30fps

export default function HomeCanvas({ convergeTarget, count = 120 }: HomeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { dotsRef, updateDots, convergeTo, reset } = useColorDots(count);

  // Convergencia / reset según el prop
  useEffect(() => {
    if (convergeTarget) convergeTo(convergeTarget);
    else reset();
  }, [convergeTarget, convergeTo, reset]);

  // Loop de render + resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar el backing store al tamaño mostrado
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth));
      const h = Math.max(1, Math.round(canvas.clientHeight));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      const dt = Math.min(100, now - last); // clamp por si la pestaña estuvo inactiva
      last = now;
      acc += dt;
      while (acc >= SIM_STEP_MS) {
        updateDots(SIM_STEP_MS / 1000);
        acc -= SIM_STEP_MS;
      }

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      for (const dot of dotsRef.current) {
        // Puntos cuadrados (pixel art) — fillRect, no arc.
        const size = dot.radius; // 2 o 3 px
        ctx.fillStyle = dot.color;
        ctx.fillRect(
          Math.round(dot.x * width - size / 2),
          Math.round(dot.y * height - size / 2),
          size,
          size,
        );
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [dotsRef, updateDots]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: 'pixelated', pointerEvents: 'none' }}
    />
  );
}
