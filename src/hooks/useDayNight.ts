'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — useDayNight
// Reloj maestro del paisaje: un ciclo lento de día → atardecer → noche →
// amanecer del que cuelgan los faroles, las sombras, los charcos y el tinte del
// cielo. Un solo rAF compartido por todos los consumidores (se suscriben a un
// store module-level), así no hay un bucle por componente.
//
// El ciclo arranca de tarde para que lo primero que se vea sea la ciudad de día
// y la transición a la noche ocurra mientras se explora.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

/** Duración de un ciclo completo (ms). Lento a propósito: es ambiente, no show. */
const CYCLE_MS = 240_000; // 4 minutos
/** Fase inicial: 0 = medianoche, 0.5 = mediodía. Arranca a media tarde. */
const START_PHASE = 0.62;

export interface DayNight {
  /** Fase del ciclo, 0–1 (0 medianoche · 0.25 amanecer · 0.5 mediodía · 0.75 atardecer). */
  phase: number;
  /** Cuán de noche está, 0 (pleno día) → 1 (noche cerrada). */
  night: number;
  /** Cuán cálida está la luz: pico en amanecer/atardecer (0–1). */
  golden: number;
}

function compute(phase: number): DayNight {
  // Curva suave: night = 1 en fase 0, 0 en fase 0.5
  const night = (Math.cos(phase * Math.PI * 2) + 1) / 2;
  // Dorado: máximo en las dos transiciones (fase 0.25 y 0.75)
  const golden = Math.pow(Math.abs(Math.sin(phase * Math.PI * 2)), 3);
  return { phase, night, golden };
}

// ── Store compartido: un solo rAF para toda la app ───────────────────────────
let started = false;
let current: DayNight = compute(START_PHASE);
const listeners = new Set<(v: DayNight) => void>();

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const t0 = performance.now();
  let lastEmit = 0;
  const tick = (now: number) => {
    // Se emite ~4 veces por segundo: el ciclo es lentísimo, no hace falta 60fps
    if (now - lastEmit > 250) {
      lastEmit = now;
      const phase = (START_PHASE + ((now - t0) % CYCLE_MS) / CYCLE_MS) % 1;
      current = compute(phase);
      listeners.forEach((fn) => fn(current));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Estado actual del ciclo. Con `frozen` (reduced-motion o para tests) devuelve
 * una tarde fija y no se suscribe a nada.
 */
export function useDayNight(frozen = false): DayNight {
  const [value, setValue] = useState<DayNight>(() => compute(START_PHASE));

  useEffect(() => {
    if (frozen) return;
    start();
    setValue(current);
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, [frozen]);

  return frozen ? compute(START_PHASE) : value;
}
