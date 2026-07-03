'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — useColorDots
// Simulación de los puntos de colores del Home, en coordenadas normalizadas
// (0–1) del stage.
//
// · Las calles tienen ANCHO: cada punto lleva un offset lateral perpendicular
//   a la dirección del path, así se distribuyen por toda la calzada.
// · La convergencia usa PATHFINDING sobre la red de calles. Los paths se
//   cruzan a mitad de camino: las INTERSECCIONES entre segmentos se detectan
//   automáticamente y se vuelven nodos del grafo, así un punto puede doblar
//   de una avenida a otra en cualquier cruce. Al seleccionar un edificio cada
//   punto camina por su calle hasta el mejor cruce, sigue la ruta más corta
//   (Dijkstra) y recién al final hace un salto corto de la calle al edificio.
// · Respeta prefers-reduced-motion (puntos estáticos / salto directo).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { SPRITE_COLORS } from '@/lib/colors';
import { LANDSCAPE_SIZE } from '@/lib/assets';
import type { ColorDot } from '@/types/sprites';

/** Punto en coordenadas normalizadas (0–1). */
type Pct = { x: number; y: number };

/**
 * Paths de calles en % del stage (0–1).
 * Calibrados por Facundo con el PathCalibrator (tecla P) sobre las avenidas
 * reales del landscape — no editar a mano: recalibrar con la herramienta.
 */
export const STREET_PATHS: ReadonlyArray<ReadonlyArray<[number, number]>> = [
  [[0.009, 0.182], [0.829, 0.995]],
  [[0.007, 0.564], [0.398, 0.995]],
  [[0.202, 0.021], [0.997, 0.761]],
  [[0.569, 0.017], [0.888, 0.315]],
  [[0.998, 0.181], [0.541, 0.684], [0.465, 0.708], [0.193, 0.995]],
  [[-0.001, 0.795], [0.784, 0.021]],
  [[0.002, 0.471], [0.48, 0.017]],
  [[1, 0.565], [0.729, 0.887], [0.597, 0.997]],
];

// ── Constantes de simulación ─────────────────────────────────────────────────

/** Relación de aspecto del stage — las distancias "físicas" corrigen por esto. */
const ASPECT = LANDSCAPE_SIZE.width / LANDSCAPE_SIZE.height;
/** Mitad del ancho de calle, en fracción del alto del stage (~3.4% total). */
const LANE_HALF = 0.017;
/** Velocidad al seguir una ruta de convergencia (fracción física del alto/seg). */
const ROUTE_SPEED = 0.25;
/** Distancia a la que se considera alcanzado un waypoint. */
const WAYPOINT_EPS = 0.012;
/** Distancia máxima para fusionar puntos de la red en un mismo nodo del grafo. */
const NODE_EPS = 0.02;

/** Distancia física (corregida por aspecto), en fracciones del alto. */
function physDist(a: Pct, b: Pct): number {
  return Math.hypot((a.x - b.x) * ASPECT, a.y - b.y);
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Offset perpendicular a una dirección (dx,dy), de magnitud `amount`
 * (en fracción del alto), devuelto en coordenadas normalizadas.
 */
function perpOffset(dx: number, dy: number, amount: number): Pct {
  const px = dx * ASPECT;
  const py = dy;
  const len = Math.hypot(px, py) || 1;
  return { x: ((-py / len) * amount) / ASPECT, y: (px / len) * amount };
}

// ── Metadatos de paths (longitudes físicas) ──────────────────────────────────

interface PathMeta {
  pts: Pct[];
  /** longitud física acumulada hasta cada vértice */
  cum: number[];
  total: number;
}

function buildPathMeta(paths: typeof STREET_PATHS): PathMeta[] {
  return paths.map((raw) => {
    const pts = raw.map(([x, y]) => ({ x, y }));
    const cum: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1]! + physDist(pts[i - 1]!, pts[i]!));
    }
    return { pts, cum, total: cum[cum.length - 1] || 1 };
  });
}

/** Posición + dirección sobre el path según progreso 0–1 (clamped, sin wrap). */
function pointDirOnPath(meta: PathMeta, t: number): { x: number; y: number; dx: number; dy: number } {
  const s = clamp01(t) * meta.total;
  for (let i = 0; i < meta.pts.length - 1; i++) {
    if (s <= meta.cum[i + 1]! || i === meta.pts.length - 2) {
      const a = meta.pts[i]!;
      const b = meta.pts[i + 1]!;
      const segLen = meta.cum[i + 1]! - meta.cum[i]! || 1;
      const tt = clamp01((s - meta.cum[i]!) / segLen);
      return { x: lerp(a.x, b.x, tt), y: lerp(a.y, b.y, tt), dx: b.x - a.x, dy: b.y - a.y };
    }
  }
  const last = meta.pts[meta.pts.length - 1]!;
  return { x: last.x, y: last.y, dx: 1, dy: 0 };
}

// ── Grafo de calles con intersecciones (pathfinding de convergencia) ────────

/** Parada sobre un path: posición de arco física + nodo del grafo. */
interface PathStop {
  s: number;
  node: number;
}

interface StreetGraph {
  nodes: Pct[];
  adj: Array<Array<{ to: number; cost: number }>>;
  /** por path, sus paradas (vértices + cruces con otros paths) ordenadas por arco */
  pathStops: PathStop[][];
}

/**
 * Intersección de segmentos p1→p2 y p3→p4 (en coordenadas normalizadas).
 * Devuelve el punto y los parámetros t (sobre p1→p2) y u (sobre p3→p4), o null.
 */
function segIntersect(
  p1: Pct, p2: Pct, p3: Pct, p4: Pct,
): { x: number; y: number; t: number; u: number } | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) return null; // paralelos
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  const EPS = 1e-6;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return { x: p1.x + d1x * t, y: p1.y + d1y * t, t: clamp01(t), u: clamp01(u) };
}

function buildGraph(metas: PathMeta[]): StreetGraph {
  const nodes: Pct[] = [];
  const adj: StreetGraph['adj'] = [];

  const nodeFor = (p: Pct): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (physDist(nodes[i]!, p) < NODE_EPS) return i;
    }
    nodes.push({ x: p.x, y: p.y });
    adj.push([]);
    return nodes.length - 1;
  };

  // 1. Paradas iniciales: los vértices propios de cada path
  const pathStops: PathStop[][] = metas.map((meta) =>
    meta.pts.map((p, i) => ({ s: meta.cum[i]!, node: nodeFor(p) })),
  );

  // 2. Cruces entre paths → nueva parada en AMBOS paths
  for (let i = 0; i < metas.length; i++) {
    for (let j = i + 1; j < metas.length; j++) {
      const mi = metas[i]!;
      const mj = metas[j]!;
      for (let si = 0; si < mi.pts.length - 1; si++) {
        for (let sj = 0; sj < mj.pts.length - 1; sj++) {
          const hit = segIntersect(mi.pts[si]!, mi.pts[si + 1]!, mj.pts[sj]!, mj.pts[sj + 1]!);
          if (!hit) continue;
          const node = nodeFor(hit);
          const segLenI = mi.cum[si + 1]! - mi.cum[si]!;
          const segLenJ = mj.cum[sj + 1]! - mj.cum[sj]!;
          pathStops[i]!.push({ s: mi.cum[si]! + hit.t * segLenI, node });
          pathStops[j]!.push({ s: mj.cum[sj]! + hit.u * segLenJ, node });
        }
      }
    }
  }

  // 3. Ordenar paradas por arco, deduplicar nodos consecutivos y crear aristas
  for (const stops of pathStops) {
    stops.sort((a, b) => a.s - b.s);
    for (let i = stops.length - 1; i > 0; i--) {
      if (stops[i]!.node === stops[i - 1]!.node) stops.splice(i, 1);
    }
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i]!;
      const b = stops[i + 1]!;
      const cost = b.s - a.s; // distancia sobre la calle
      adj[a.node]!.push({ to: b.node, cost });
      adj[b.node]!.push({ to: a.node, cost });
    }
  }

  return { nodes, adj, pathStops };
}

/** Dijkstra simple (decenas de nodos). parent permite reconstruir rutas. */
function dijkstra(g: StreetGraph, start: number): { dist: number[]; parent: number[] } {
  const n = g.nodes.length;
  const dist: number[] = new Array(n).fill(Infinity);
  const parent: number[] = new Array(n).fill(-1);
  const done: boolean[] = new Array(n).fill(false);
  dist[start] = 0;
  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!done[i] && dist[i]! < best) {
        best = dist[i]!;
        u = i;
      }
    }
    if (u < 0) break;
    done[u] = true;
    for (const e of g.adj[u]!) {
      if (dist[u]! + e.cost < dist[e.to]!) {
        dist[e.to] = dist[u]! + e.cost;
        parent[e.to] = u;
      }
    }
  }
  return { dist, parent };
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
  const graph = useMemo(() => buildGraph(pathMeta), [pathMeta]);

  // Inicialización de los puntos (una sola vez)
  if (dotsRef.current.length === 0) {
    const dots: ColorDot[] = [];
    for (let i = 0; i < count; i++) {
      const pathIndex = i % STREET_PATHS.length;
      const meta = pathMeta[pathIndex]!;
      const progress = Math.random();
      const pos = pointDirOnPath(meta, progress);
      // Velocidad física uniforme entre paths de distinta longitud
      const mag = 0.06 + Math.random() * 0.06;
      dots.push({
        x: pos.x,
        y: pos.y,
        pathIndex,
        progress,
        speed: (mag / meta.total) * (Math.random() < 0.5 ? -1 : 1),
        color: SPRITE_COLORS[Math.floor(Math.random() * SPRITE_COLORS.length)]!,
        radius: Math.random() < 0.5 ? 2 : 3,
        phase: 'moving',
        lateral: Math.random() * 2 - 1,
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

      // Nodo del grafo más cercano al edificio + rutas más cortas desde él
      let goal = 0;
      let bestGoal = Infinity;
      graph.nodes.forEach((n, i) => {
        const d = physDist(n, target);
        if (d < bestGoal) {
          bestGoal = d;
          goal = i;
        }
      });
      const { dist, parent } = dijkstra(graph, goal);

      for (const dot of dotsRef.current) {
        if (prefersReducedRef.current) {
          dot.x = target.x;
          dot.y = target.y;
          dot.phase = 'arrived';
          continue;
        }

        const meta = pathMeta[dot.pathIndex]!;
        const stops = graph.pathStops[dot.pathIndex]!;
        const s = clamp01(dot.progress) * meta.total;

        // Mejor parada de salida: caminar por la calle + ruta por el grafo
        let bestStop: PathStop | null = null;
        let bestCost = Infinity;
        for (const stop of stops) {
          const c = Math.abs(stop.s - s) + (dist[stop.node] ?? Infinity);
          if (c < bestCost) {
            bestCost = c;
            bestStop = stop;
          }
        }
        // Fallback (red desconectada): salir por la parada más cercana
        if (!bestStop) {
          bestStop = stops[0] ?? null;
        }
        if (!bestStop) {
          dot.phase = 'arriving';
          continue;
        }

        // Waypoints: las paradas de su calle entre el punto y la salida…
        const route: Pct[] = [];
        if (bestStop.s >= s) {
          for (const stop of stops) {
            if (stop.s > s && stop.s <= bestStop.s) route.push(graph.nodes[stop.node]!);
          }
        } else {
          for (let i = stops.length - 1; i >= 0; i--) {
            const stop = stops[i]!;
            if (stop.s < s && stop.s >= bestStop.s) route.push(graph.nodes[stop.node]!);
          }
        }
        // …después la cadena de cruces del grafo hasta el nodo objetivo
        let cur = parent[bestStop.node]!;
        while (cur !== -1) {
          route.push(graph.nodes[cur]!);
          cur = parent[cur]!;
        }

        dot.route = route;
        dot.routeIndex = 0;
        dot.phase = 'converging';
      }
    },
    [graph, pathMeta],
  );

  const reset = useCallback(() => {
    targetRef.current = null;
    for (const dot of dotsRef.current) {
      dot.phase = 'moving';
      dot.route = undefined;
      dot.routeIndex = undefined;
      // El progreso quedó donde estaba; el punto retoma su calle desde ahí
      dot.progress = clamp01(dot.progress);
    }
  }, []);

  const updateDots = useCallback(
    (dt: number) => {
      if (prefersReducedRef.current) return; // estáticos
      const target = targetRef.current;

      for (const dot of dotsRef.current) {
        if (dot.phase === 'moving') {
          const meta = pathMeta[dot.pathIndex]!;
          dot.progress += dot.speed * dt;
          // Ping-pong en los extremos (sin teleport de fin a inicio)
          if (dot.progress > 1) {
            dot.progress = 2 - dot.progress;
            dot.speed = -dot.speed;
          } else if (dot.progress < 0) {
            dot.progress = -dot.progress;
            dot.speed = -dot.speed;
          }
          const p = pointDirOnPath(meta, dot.progress);
          // Ancho de calle: offset lateral perpendicular a la dirección
          const off = perpOffset(p.dx, p.dy, dot.lateral * LANE_HALF);
          dot.x = p.x + off.x;
          dot.y = p.y + off.y;
        } else if (dot.phase === 'converging') {
          const route = dot.route;
          const idx = dot.routeIndex ?? 0;
          if (!route || idx >= route.length) {
            dot.phase = 'arriving';
            continue;
          }
          const wp = route[idx]!;
          const pdx = (wp.x - dot.x) * ASPECT;
          const pdy = wp.y - dot.y;
          const d = Math.hypot(pdx, pdy);
          const step = ROUTE_SPEED * dt;
          if (d <= Math.max(step, WAYPOINT_EPS)) {
            dot.x = wp.x;
            dot.y = wp.y;
            dot.routeIndex = idx + 1;
            if (dot.routeIndex >= route.length) dot.phase = 'arriving';
          } else {
            dot.x += ((pdx / d) * step) / ASPECT;
            dot.y += (pdy / d) * step;
          }
        } else if (dot.phase === 'arriving' && target) {
          // Único movimiento fuera de calle: salto corto final al edificio
          const t = Math.min(1, 2.5 * dt);
          dot.x = lerp(dot.x, target.x, t);
          dot.y = lerp(dot.y, target.y, t);
          if (physDist(dot, target) < 0.008) dot.phase = 'arrived';
        }
      }
    },
    [pathMeta],
  );

  return { dotsRef, updateDots, convergeTo, reset, prefersReducedRef };
}
