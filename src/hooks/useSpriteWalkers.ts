'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — useSpriteWalkers
// Motor de isotype charts: cada dato es una PERSONA (uno de los 24 sprites del
// Home, tintado con tintSprite) que CAMINA desde el borde del canvas hasta su
// posición en la grilla, con walk cycle real (filas walk frente/espalda del
// spritesheet, flip horizontal para caminar a la izquierda).
//
// · Entrada escalonada: las figuras salen en tandas (delay por índice).
// · Al llegar: idle frente con respiración (2 frames lentos).
// · prefers-reduced-motion: aparecen directamente en su lugar, quietas.
// · D3/React deciden las posiciones; este hook solo mueve y dibuja.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { SPRITE_CONFIGS, SPRITE_SHEET } from '@/lib/assets';
import { loadSprite, tintSprite } from '@/lib/spriteManager';

/** Pool de sprites según demografía. */
export type SpritePool = 'm' | 'w' | 'child' | 'any';

export interface WalkerTarget {
  x: number;
  y: number;
  color: string;
  /** de qué conjunto de modelos sale la figura (mujeres/hombres/niños/mixto) */
  pool?: SpritePool;
}

/** Índices de SPRITE_CONFIGS por pool: masculino, femenino, infantil, todos. */
const POOL_IDX: Record<SpritePool, number[]> = {
  m: SPRITE_CONFIGS.map((c, i) => (c.id.startsWith('m-') ? i : -1)).filter((i) => i >= 0),
  w: SPRITE_CONFIGS.map((c, i) => (c.id.startsWith('w-') ? i : -1)).filter((i) => i >= 0),
  child: SPRITE_CONFIGS.map((c, i) => (c.id.startsWith('cm-') || c.id.startsWith('cw-') ? i : -1)).filter((i) => i >= 0),
  any: SPRITE_CONFIGS.map((_, i) => i),
};
function pickSprite(pool: SpritePool = 'any'): number {
  const list = POOL_IDX[pool].length ? POOL_IDX[pool] : POOL_IDX.any;
  return list[Math.floor(Math.random() * list.length)]!;
}

const FW = SPRITE_SHEET.frameWidth; // 17
const FH = SPRITE_SHEET.frameHeight; // 43
// Mapeo REAL del spritesheet (verificado visualmente sobre los PNGs — difiere
// del skill): fila 0 = idle FRONTAL (4 variantes), fila 1 = idle ESPALDA,
// fila 2 = caminata LATERAL de perfil (4 frames, mirando a la DERECHA — lo
// confirmó Facundo al ver figuras caminando "hacia atrás" con el flip inverso),
// fila 3 = extras. El plano lateral es el recurso para el movimiento horizontal.
const ROW_IDLE_FRONT = 0;
const ROW_IDLE_BACK = 1;
const ROW_WALK_SIDE = 2;
const WALK_FRAME_MS = 120;
const IDLE_FRAME_MS = 600;
const SIM_STEP_MS = 1000 / 30;

interface Walker {
  spriteIdx: number;
  color: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number; // px/s
  delay: number; // ms hasta empezar a caminar
  phase: 'waiting' | 'walking' | 'idle';
  animT: number; // ms acumulados para el frame
  dx: number;
  dy: number;
}

type Sheet = HTMLCanvasElement | OffscreenCanvas;

// Caché global de sheets tintados (modelo × color) — persiste entre vizs
const tintedCache = new Map<string, Sheet>();
const tintedPending = new Map<string, Promise<Sheet>>();

/**
 * Endurece el canal alfa: todo píxel queda 100% opaco o 100% transparente.
 * Los PNGs traen bordes semitransparentes (antialiasing) que, al escalar,
 * se ven como pixelado sucio — la silueta binaria escala limpia.
 */
export function hardenAlpha(sheet: Sheet): Sheet {
  try {
    const ctx = sheet.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) return sheet;
    const img = ctx.getImageData(0, 0, sheet.width, sheet.height);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i]! > 64 ? 255 : 0;
    ctx.putImageData(img, 0, 0);
  } catch {
    /* si el contexto no permite lectura, dejar el sheet como está */
  }
  return sheet;
}

/** Acceso público a la caché de sheets tintados (para componentes ambient). */
export function getTintedSheet(spriteIdx: number, color: string): Sheet | null {
  return getTinted(spriteIdx, color);
}

function getTinted(spriteIdx: number, color: string): Sheet | null {
  const key = `${spriteIdx}|${color}`;
  const hit = tintedCache.get(key);
  if (hit) return hit;
  if (!tintedPending.has(key)) {
    const config = SPRITE_CONFIGS[spriteIdx]!;
    const p = loadSprite(config.src).then((img) => {
      const sheet = hardenAlpha(tintSprite(img, color));
      tintedCache.set(key, sheet);
      return sheet;
    });
    tintedPending.set(key, p);
    p.catch(() => tintedPending.delete(key));
  }
  return null;
}

interface WalkerOptions {
  /** factor de escala de dibujo de los sprites (2 = 34×86 px lógicos) */
  scale?: number;
  /**
   * Identidad del layout (ej. dataset.id): los walkers se reconstruyen SOLO
   * cuando cambia — un cambio de colores (aislar demografía) recolorea en
   * caliente sin que las figuras vuelvan a entrar caminando.
   */
  layoutKey?: string;
  /**
   * Borde por el que entran las figuras. Por defecto 'nearest' (el borde más
   * cercano a cada destino, menos recorrido). 'left'/'right' fuerzan el borde
   * — se usa en el mapa para que las figuras entren desde el borde EXTERIOR
   * (el de la ventana), aunque la multitud esté pegada al mapa.
   */
  enterFrom?: 'left' | 'right' | 'nearest';
}

/**
 * Anima `targets` como personas que caminan a su posición dentro del canvas.
 * El canvas debe tener width/height lógicos ya seteados (coordenadas de targets).
 */
export function useSpriteWalkers(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  targets: WalkerTarget[],
  options: WalkerOptions = {},
): void {
  const walkersRef = useRef<Walker[]>([]);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const scale = options.scale ?? 1;
  const layoutKey = options.layoutKey ?? '';
  const enterFrom = options.enterFrom ?? 'nearest';

  // Recoloreo en caliente: mismas posiciones, colores nuevos
  useEffect(() => {
    const walkers = walkersRef.current;
    if (walkers.length !== targets.length) return;
    targets.forEach((t, i) => {
      const w = walkers[i]!;
      if (w.color !== t.color) {
        w.color = t.color;
        getTinted(w.spriteIdx, t.color); // precalentar el tint nuevo
      }
    });
  }, [targets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const targets = targetsRef.current;
    if (!canvas || targets.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = canvas.width;
    const H = canvas.height;
    const SW = FW * scale;
    const SH = FH * scale;

    // Crear walkers: cada figura entra desde el borde MÁS CERCANO a su destino
    // (derecha si el destino está en la mitad derecha, izquierda si no) para no
    // atravesar la pantalla. Velocidad/delays escalados al tamaño del sprite.
    walkersRef.current = targets.map((t, i) => {
      const fromRight =
        enterFrom === 'right' ? true : enterFrom === 'left' ? false : t.x > W / 2;
      const sx = fromRight ? W + Math.random() * 120 : -SW - Math.random() * 120;
      const sy = Math.min(H - SH, Math.max(0, t.y + (Math.random() * 40 - 20)));
      return {
        spriteIdx: pickSprite(t.pool),
        color: t.color,
        x: reduced ? t.x : sx,
        y: reduced ? t.y : sy,
        tx: t.x,
        ty: t.y,
        speed: (150 + Math.random() * 60) * scale,
        // delay por índice a la mitad: con el doble de figuras (~800) la
        // entrada completa mantiene la misma duración total (~1,6s)
        delay: reduced ? 0 : i * 2 + Math.random() * 80,
        phase: reduced ? 'idle' : 'waiting',
        animT: Math.random() * 1000,
        dx: 0,
        dy: 0,
      };
    });

    // Precalentar la caché de tints
    for (const w of walkersRef.current) getTinted(w.spriteIdx, w.color);

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const step = (dtMs: number) => {
      for (const w of walkersRef.current) {
        w.animT += dtMs;
        if (w.phase === 'waiting') {
          w.delay -= dtMs;
          if (w.delay <= 0) w.phase = 'walking';
        } else if (w.phase === 'walking') {
          const dx = w.tx - w.x;
          const dy = w.ty - w.y;
          const dist = Math.hypot(dx, dy);
          const stepLen = (w.speed * dtMs) / 1000;
          if (dist <= stepLen || dist < 2) {
            w.x = w.tx;
            w.y = w.ty;
            w.phase = 'idle';
            w.animT = Math.random() * 1000;
          } else {
            w.dx = dx / dist;
            w.dy = dy / dist;
            w.x += w.dx * stepLen;
            w.y += w.dy * stepLen;
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const w of walkersRef.current) {
        if (w.phase === 'waiting') continue;
        const sheet = getTinted(w.spriteIdx, w.color);
        if (!sheet) continue;

        let row: number;
        let frame: number;
        let flip = false;
        if (w.phase === 'walking' && !reduced) {
          const horizontal = Math.abs(w.dx) >= 0.4 * Math.abs(w.dy);
          if (horizontal) {
            // Plano LATERAL del spritesheet (mira a la derecha; flip para ir a la izquierda)
            row = ROW_WALK_SIDE;
            flip = w.dx < 0;
          } else {
            // Movimiento vertical: espalda al alejarse (subir), frente al acercarse
            row = w.dy < 0 ? ROW_IDLE_BACK : ROW_IDLE_FRONT;
          }
          frame = Math.floor(w.animT / WALK_FRAME_MS) % SPRITE_SHEET.cols;
        } else {
          row = ROW_IDLE_FRONT;
          // Con reduced-motion la figura queda quieta (frame 0, sin respiración)
          frame = reduced ? 0 : Math.floor(w.animT / IDLE_FRAME_MS) % 2;
        }

        const sx = frame * FW;
        const sy = row * FH;
        const px = Math.round(w.x);
        const py = Math.round(w.y);
        const SW = FW * scale;
        const SH = FH * scale;
        if (flip) {
          ctx.save();
          ctx.translate(px + SW, py);
          ctx.scale(-1, 1);
          ctx.drawImage(sheet, sx, sy, FW, FH, 0, 0, SW, SH);
          ctx.restore();
        } else {
          ctx.drawImage(sheet, sx, sy, FW, FH, px, py, SW, SH);
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      acc += dt;
      while (acc >= SIM_STEP_MS) {
        step(SIM_STEP_MS);
        acc -= SIM_STEP_MS;
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- targets vía ref: reconstruir solo si cambia el layout
  }, [canvasRef, layoutKey, scale, enterFrom]);
}
