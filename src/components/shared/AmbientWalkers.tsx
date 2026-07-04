'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — AmbientWalkers
// Personas de los sprites deambulando en GRIS por el fondo de una pantalla:
// no compiten en jerarquía, solo le dan vida. Caminan de lado a lado (plano
// lateral del spritesheet — mira a la derecha, flip para la izquierda) y
// reaparecen por el borde opuesto.
//
// INTERACTIVAS: mantené el click sobre una y se detiene a mirarte de frente;
// al soltar, sigue caminando. (El canvas solo captura clicks que caen sobre
// una figura — el resto pasa de largo.)
// Con prefers-reduced-motion quedan quietas en idle.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { SPRITE_CONFIGS, SPRITE_SHEET } from '@/lib/assets';
import { getTintedSheet } from '@/hooks/useSpriteWalkers';

const FW = SPRITE_SHEET.frameWidth;
const FH = SPRITE_SHEET.frameHeight;
const ROW_IDLE_FRONT = 0;
const ROW_WALK_SIDE = 2;
const WALK_FRAME_MS = 140;
const IDLE_FRAME_MS = 600;
const SIM_STEP_MS = 1000 / 30;

interface Walker {
  idx: number;
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number; // px/s
  animT: number;
  /** true mientras el usuario la mantiene clickeada — se detiene y mira al frente */
  paused: boolean;
}

interface AmbientWalkersProps {
  count?: number;
  /** gris apagado por defecto — fondo, no protagonista */
  color?: string;
  scale?: number;
  className?: string;
}

export default function AmbientWalkers({
  count = 10,
  color = '#3F3F3A',
  scale = 2,
  className,
}: AmbientWalkersProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SW = FW * scale;
    const SH = FH * scale;

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth));
      const h = Math.max(1, Math.round(canvas.clientHeight));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        ctx.imageSmoothingEnabled = false;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawn = (fromEdge: boolean): Walker => {
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      return {
        idx: Math.floor(Math.random() * SPRITE_CONFIGS.length),
        x: fromEdge
          ? dir === 1
            ? -SW - Math.random() * 120
            : canvas.width + Math.random() * 120
          : Math.random() * canvas.width,
        y: (0.06 + Math.random() * 0.85) * Math.max(1, canvas.height - SH),
        dir,
        speed: 22 + Math.random() * 34,
        animT: Math.random() * 1000,
        paused: false,
      };
    };
    const walkers: Walker[] = Array.from({ length: count }, () => spawn(false));

    // ── Interacción: mantener click = pausa mirando al frente ────────────────
    const hitWalker = (e: PointerEvent | MouseEvent): Walker | null => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // De arriba hacia abajo en el array (el último dibujado primero)
      for (let i = walkers.length - 1; i >= 0; i--) {
        const w = walkers[i]!;
        if (mx >= w.x && mx <= w.x + SW && my >= w.y && my <= w.y + SH) return w;
      }
      return null;
    };
    const onPointerDown = (e: PointerEvent) => {
      const w = hitWalker(e);
      if (w) w.paused = true;
    };
    const releaseAll = () => {
      for (const w of walkers) w.paused = false;
    };
    const onMove = (e: PointerEvent) => {
      canvas.style.cursor = hitWalker(e) ? 'pointer' : 'default';
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', releaseAll);
    canvas.addEventListener('pointerleave', releaseAll);

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const step = (dtMs: number) => {
      for (let i = 0; i < walkers.length; i++) {
        const w = walkers[i]!;
        w.animT += dtMs;
        if (reduced || w.paused) continue; // quietos
        w.x += (w.dir * w.speed * dtMs) / 1000;
        if ((w.dir === 1 && w.x > canvas.width + 60) || (w.dir === -1 && w.x < -SW - 60)) {
          walkers[i] = spawn(true);
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const w of walkers) {
        const sheet = getTintedSheet(w.idx, color);
        if (!sheet) continue;
        const front = reduced || w.paused;
        const row = front ? ROW_IDLE_FRONT : ROW_WALK_SIDE;
        const frame = front
          ? reduced
            ? 0
            : Math.floor(w.animT / IDLE_FRAME_MS) % 2 // respira mientras te mira
          : Math.floor(w.animT / WALK_FRAME_MS) % SPRITE_SHEET.cols;
        const sx = frame * FW;
        const sy = row * FH;
        const px = Math.round(w.x);
        const py = Math.round(w.y);
        // El plano lateral mira a la DERECHA: flip para caminar a la izquierda
        if (!front && w.dir === -1) {
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

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', releaseAll);
      canvas.removeEventListener('pointerleave', releaseAll);
    };
  }, [count, color, scale]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? 'absolute inset-0 h-full w-full'}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
