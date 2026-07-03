'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — HomeCanvas
// Canvas transparente que dibuja SOLO los puntos de colores, superpuesto al
// landscape (debajo de las capas de edificios). Render a 60fps (RAF) con
// simulación desacoplada a ~30fps. Se redimensiona con ResizeObserver.
// Cuando ≥70% de los puntos llegan al edificio seleccionado dispara
// onConverged (una sola vez por selección) — ahí aparece el ThemeOverlay.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useColorDots } from '@/hooks/useColorDots';

interface HomeCanvasProps {
  /** Objetivo de convergencia en % (0–1) del stage, o null para movimiento normal. */
  convergeTarget: { x: number; y: number } | null;
  /** Se dispara (una vez por selección) cuando la mayoría de los puntos llegó. */
  onConverged?: () => void;
  /** Cantidad de puntos. */
  count?: number;
}

const SIM_STEP_MS = 1000 / 30; // la simulación avanza a 30fps
const CONVERGED_RATIO = 0.7; // fracción de puntos 'arrived' para dar por llegada

export default function HomeCanvas({ convergeTarget, onConverged, count = 120 }: HomeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { dotsRef, updateDots, convergeTo, reset } = useColorDots(count);

  // Refs para leer estado fresco dentro del loop RAF sin re-crear el efecto
  const onConvergedRef = useRef(onConverged);
  onConvergedRef.current = onConverged;
  const convergingRef = useRef(false);
  const firedRef = useRef(false);

  // Convergencia / reset según el prop
  useEffect(() => {
    firedRef.current = false;
    convergingRef.current = convergeTarget !== null;
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
      let arrived = 0;
      for (const dot of dotsRef.current) {
        if (dot.phase === 'arrived') arrived++;
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

      // Aviso de convergencia completada (una sola vez por selección)
      if (
        convergingRef.current &&
        !firedRef.current &&
        dotsRef.current.length > 0 &&
        arrived / dotsRef.current.length >= CONVERGED_RATIO
      ) {
        firedRef.current = true;
        onConvergedRef.current?.();
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
