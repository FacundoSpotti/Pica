'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — useColorDots
// Maneja los puntos de colores del Home. Toda la simulación trabaja en
// coordenadas normalizadas (0–1) del stage, para que escale con la pantalla.
// El render (px) lo hace HomeCanvas. Respeta prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { SPRITE_COLORS } from '@/lib/colors';
import type { ColorDot } from '@/types/sprites';

/** Punto en coordenadas normalizadas (0–1). */
type Pct = { x: number; y: number };

/**
 * Paths de calles en % del stage (0–1). Siguen la grilla de avenidas isométricas
 * que rodean y cruzan el superblock central: un ANILLO exterior (perimetral) +
 * un DIAMANTE interior + dos avenidas centrales. Aproximados a la imagen real —
 * afinar visualmente con el debug de hitboxes activo.
 *
 * En la ciudad isométrica las avenidas corren en dos diagonales (↘ y ↙) con una
 * pendiente ≈ ±0.9 en coordenadas fraccionarias.
 */
const STREET_PATHS: ReadonlyArray<ReadonlyArray<[number, number]>> = [
  // Anillo interior — avenidas que rodean el Palacio (junctions N/E/S/O)
  [[0.50, 0.30], [0.61, 0.385], [0.70, 0.47]], // N → E
  [[0.70, 0.47], [0.605, 0.565], [0.50, 0.66]], // E → S
  [[0.50, 0.66], [0.405, 0.565], [0.31, 0.47]], // S → O
  [[0.31, 0.47], [0.405, 0.385], [0.50, 0.30]], // O → N
  // Anillo exterior — avenidas entre el superblock central y las manzanas
  [[0.05, 0.47], [0.28, 0.30], [0.50, 0.13]], // izq → arriba
  [[0.50, 0.13], [0.72, 0.30], [0.90, 0.47]], // arriba → der
  [[0.90, 0.47], [0.70, 0.685], [0.50, 0.90]], // der → abajo
  [[0.05, 0.47], [0.28, 0.685], [0.50, 0.90]], // izq → abajo
  // Conectores verticales (calles que se alejan del observador)
  [[0.50, 0.13], [0.50, 0.30]], // arriba → N
  [[0.50, 0.66], [0.50, 0.90]], // S → abajo
];

// ── Precálculo de longitudes por path ────────────────────────────────────────

interface Segment {
  from: [number, number];
  to: [number, number];
  len: number;
}
interface PathMeta {
  segments: Segment[];
  total: number;
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function buildPathMeta(paths: typeof STREET_PATHS): PathMeta[] {
  return paths.map((pts) => {
    const segments: Segment[] = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const from = pts[i]!;
      const to = pts[i + 1]!;
      const len = dist(from, to);
      segments.push({ from, to, len });
      total += len;
    }
    return { segments, total: total || 1 };
  });
}

/** Posición (en %) a lo largo de un path según progreso 0–1. */
function pointOnPath(meta: PathMeta, progress: number): Pct {
  const target = ((progress % 1) + 1) % 1 * meta.total;
  let acc = 0;
  for (const seg of meta.segments) {
    if (acc + seg.len >= target) {
      const t = seg.len === 0 ? 0 : (target - acc) / seg.len;
      return {
        x: seg.from[0] + (seg.to[0] - seg.from[0]) * t,
        y: seg.from[1] + (seg.to[1] - seg.from[1]) * t,
      };
    }
    acc += seg.len;
  }
  const last = meta.segments[meta.segments.length - 1]!;
  return { x: last.to[0], y: last.to[1] };
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Progreso (0–1) del punto del path más cercano a un objetivo. */
function nearestProgress(meta: PathMeta, target: Pct, samples = 64): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i <= samples; i++) {
    const p = i / samples;
    const pos = pointOnPath(meta, p);
    const d = Math.hypot(pos.x - target.x, pos.y - target.y);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseColorDots {
  /** Array mutable de puntos (leído por HomeCanvas para dibujar). */
  dotsRef: React.MutableRefObject<ColorDot[]>;
  /** Avanza la simulación `dt` segundos. */
  updateDots: (dt: number) => void;
  /** Inicia la convergencia de todos los puntos hacia un objetivo (en %). */
  convergeTo: (target: Pct) => void;
  /** Vuelve al estado 'moving' (puntos recorriendo las calles). */
  reset: () => void;
  /** true si el usuario pidió movimiento reducido. */
  prefersReducedRef: React.MutableRefObject<boolean>;
}

export function useColorDots(count = 120): UseColorDots {
  const dotsRef = useRef<ColorDot[]>([]);
  const targetRef = useRef<Pct | null>(null);
  const prefersReducedRef = useRef<boolean>(false);
  const pathMeta = useMemo(() => buildPathMeta(STREET_PATHS), []);

  // Inicialización de los puntos (una sola vez)
  if (dotsRef.current.length === 0) {
    const dots: ColorDot[] = [];
    for (let i = 0; i < count; i++) {
      const pathIndex = i % STREET_PATHS.length;
      const progress = Math.random();
      const pos = pointOnPath(pathMeta[pathIndex]!, progress);
      dots.push({
        x: pos.x,
        y: pos.y,
        pathIndex,
        progress,
        // fracción de path por segundo · signo aleatorio para variar dirección
        speed: (0.03 + Math.random() * 0.05) * (Math.random() < 0.5 ? -1 : 1),
        color: SPRITE_COLORS[Math.floor(Math.random() * SPRITE_COLORS.length)]!,
        radius: Math.random() < 0.5 ? 2 : 3,
        phase: 'moving',
      });
    }
    dotsRef.current = dots;
  }

  // Detectar prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedRef.current = e.matches;
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const convergeTo = useCallback(
    (target: Pct) => {
      targetRef.current = target;
      for (const dot of dotsRef.current) {
        if (prefersReducedRef.current) {
          // Con movimiento reducido, los puntos saltan directo al edificio
          dot.x = target.x;
          dot.y = target.y;
          dot.phase = 'arrived';
          continue;
        }
        // El punto camina por SU calle hasta el punto más cercano al edificio
        dot.convergeProgress = nearestProgress(pathMeta[dot.pathIndex]!, target);
        dot.phase = 'converging';
      }
    },
    [pathMeta],
  );

  const reset = useCallback(() => {
    targetRef.current = null;
    for (const dot of dotsRef.current) {
      dot.phase = 'moving';
      dot.convergeProgress = undefined;
    }
  }, []);

  const updateDots = useCallback(
    (dt: number) => {
      if (prefersReducedRef.current) return; // estáticos
      const target = targetRef.current;
      for (const dot of dotsRef.current) {
        const meta = pathMeta[dot.pathIndex]!;
        if (dot.phase === 'moving') {
          dot.progress += dot.speed * dt;
          const pos = pointOnPath(meta, dot.progress);
          dot.x = pos.x;
          dot.y = pos.y;
        } else if (dot.phase === 'converging' && dot.convergeProgress !== undefined) {
          // Avanzar por la calle hacia el punto más cercano al edificio
          const delta = dot.convergeProgress - dot.progress;
          const step = Math.sign(delta) * Math.min(Math.abs(delta), 0.7 * dt);
          dot.progress += step;
          const pos = pointOnPath(meta, dot.progress);
          dot.x = pos.x;
          dot.y = pos.y;
          if (Math.abs(delta) < 0.01) dot.phase = 'arriving';
        } else if (dot.phase === 'arriving' && target) {
          // Salto final corto desde la calle hacia el edificio
          const t = Math.min(1, 2 * dt);
          dot.x = lerp(dot.x, target.x, t);
          dot.y = lerp(dot.y, target.y, t);
          if (Math.hypot(dot.x - target.x, dot.y - target.y) < 0.005) {
            dot.phase = 'arrived';
          }
        }
      }
    },
    [pathMeta],
  );

  return { dotsRef, updateDots, convergeTo, reset, prefersReducedRef };
}
