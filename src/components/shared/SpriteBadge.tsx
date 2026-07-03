'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — SpriteBadge
// Mini grupo de personajes del proyecto (sprites idle frontales, tintados con
// alfa endurecido) para iconografía de entidades. Animación idle sutil
// (respiración, 2 frames) — quietos pero vivos. Respeta reduced-motion.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { SPRITE_CONFIGS, SPRITE_SHEET } from '@/lib/assets';
import { hardenAlpha } from '@/hooks/useSpriteWalkers';
import { loadSprite, tintSprite } from '@/lib/spriteManager';

const FW = SPRITE_SHEET.frameWidth;
const FH = SPRITE_SHEET.frameHeight;
// Contenido real de la figura dentro del frame (ver IsotypeDistributionViz)
const C_MIN_X = 4;
const C_MIN_Y = 13;
const C_W = 9;
const C_H = 17;
const IDLE_MS = 650;

interface SpriteBadgeProps {
  /** ids de modelos a mostrar, ej: ['m-01','w-02'] o ['cm-01','cw-02'] */
  models: string[];
  color: string;
  /** alto visual en px */
  height?: number;
}

export default function SpriteBadge({ models, color, height = 56 }: SpriteBadgeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = 3; // dibujo lógico; el alto visual lo fija el CSS
  const gap = 2 * scale;
  const W = models.length * (C_W * scale + gap) - gap;
  const H = C_H * scale;

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sheets: Array<HTMLCanvasElement | OffscreenCanvas | null> = models.map(() => null);

    const draw = (frame: number) => {
      ctx.clearRect(0, 0, W, H);
      sheets.forEach((sheet, i) => {
        if (!sheet) return;
        // Frames 0/1 de idle frontal (respiración), recortados al contenido
        ctx.drawImage(
          sheet,
          frame * FW + C_MIN_X, C_MIN_Y, C_W, C_H,
          i * (C_W * scale + gap), 0, C_W * scale, C_H * scale,
        );
      });
    };

    models.forEach((id, i) => {
      const config = SPRITE_CONFIGS.find((c) => c.id === id) ?? SPRITE_CONFIGS[0]!;
      loadSprite(config.src)
        .then((img) => {
          if (cancelled) return;
          sheets[i] = hardenAlpha(tintSprite(img, color));
          draw(0);
        })
        .catch(() => undefined);
    });

    // Idle vivo: alterna los 2 frames de respiración (desfasado por figura no —
    // sutil y sincronizado alcanza). Con reduced-motion queda el frame 0.
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!reduced) {
      let frame = 0;
      interval = setInterval(() => {
        frame = frame === 0 ? 1 : 0;
        draw(frame);
      }, IDLE_MS);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [models, color, gap, W, H]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      aria-hidden="true"
      style={{
        height,
        width: (W / H) * height,
        imageRendering: 'pixelated',
      }}
    />
  );
}
