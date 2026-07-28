'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — WindowTwinkles (microvida del landscape)
// Lucecitas cálidas que se encienden y apagan en las VENTANAS de los edificios.
// Cada una tiene su período y fase — la ciudad respira sin robar protagonismo.
//
// Las posiciones salen de BUILDING_WINDOWS, detectadas del propio arte, y se
// proyectan al stage con BUILDING_PLACEMENT. Antes se muestreaban puntos AL AZAR
// dentro del polígono de hitbox, así que las luces caían en techos, jardines y
// veredas por igual.
//
// Encienden de noche (useDayNight) y se atenúan con una temática seleccionada.
// Con prefers-reduced-motion queda un subconjunto fijo, sin parpadeo.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BUILDING_PLACEMENT, BUILDING_WINDOWS } from '@/lib/assets';
import { useDayNight } from '@/hooks/useDayNight';
import type { Tematica } from '@/types/sprites';

interface Light {
  x: number; // fracción 0-1 del stage
  y: number;
  size: number; // multiplicador de tamaño
  period: number; // segundos del ciclo
  phase: number; // desfase 0-1
}

/** Cuántas ventanas se encienden por edificio (de todas las detectadas). */
const LIT_PER_BUILDING = 22;
const WARM = { r: 255, g: 226, b: 140 };

/** Ventanas de todos los edificios, ya proyectadas a coordenadas del stage. */
function buildLights(): Light[] {
  const out: Light[] = [];
  for (const [key, wins] of Object.entries(BUILDING_WINDOWS)) {
    const p = BUILDING_PLACEMENT[key as Tematica | 'palacio'];
    // Se eligen algunas repartidas a lo largo de la lista (no las primeras N,
    // que quedarían agrupadas en una sola fachada).
    const step = Math.max(1, Math.floor(wins.length / LIT_PER_BUILDING));
    for (let i = 0; i < wins.length; i += step) {
      const [u, v] = wins[i]!;
      out.push({
        x: p.left + u * p.width,
        y: p.top + v * p.height,
        size: 0.8 + Math.random() * 0.7,
        period: 2.8 + Math.random() * 5,
        phase: Math.random(),
      });
    }
  }
  return out;
}

export default function WindowTwinkles({ selectedTema }: { selectedTema: Tematica | 'palacio' | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedRef = useRef(selectedTema);
  selectedRef.current = selectedTema;
  const reduce = useReducedMotion() ?? false;
  const { night } = useDayNight(reduce);
  const nightRef = useRef(night);
  nightRef.current = night;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Ventanas reales de cada edificio, proyectadas al stage
    const lights = buildLights();

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
    const draw = (now: number) => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      // Atenuadas cuando la ciudad está en grayscale, y encendidas de noche:
      // de día una ventana iluminada no se leería (y no tendría sentido).
      const lit = Math.min(1, Math.max(0, (nightRef.current - 0.12) / 0.45));
      const globalDim = (selectedRef.current ? 0.15 : 1) * lit;
      if (globalDim < 0.02) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const unit = Math.max(2, Math.round(width / 320)); // tamaño pixel de la luz

      for (let i = 0; i < lights.length; i++) {
        const l = lights[i]!;
        let alpha: number;
        if (reduced) {
          // Sin parpadeo: un subconjunto fijo encendido suave
          alpha = i % 3 === 0 ? 0.55 : 0;
        } else {
          const wave = (Math.sin(2 * Math.PI * (now / 1000 / l.period + l.phase)) + 1) / 2;
          alpha = Math.pow(wave, 3) * 0.85; // encendidos breves, apagados largos
        }
        if (alpha < 0.03) continue;
        const s = Math.round(unit * l.size);
        ctx.fillStyle = `rgba(${WARM.r}, ${WARM.g}, ${WARM.b}, ${alpha * globalDim})`;
        ctx.fillRect(Math.round(l.x * width), Math.round(l.y * height), s, s);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
