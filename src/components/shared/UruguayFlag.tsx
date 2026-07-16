'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — UruguayFlag
// Bandera de Uruguay en pixel art, FLAMEANDO: 9 franjas (5 blancas, 4 azules)
// + cantón con el Sol de Mayo, dibujada en canvas con una onda vertical por
// columna redondeada a píxeles enteros (flameo retro, sin subpíxeles).
// Con prefers-reduced-motion queda estática (un solo frame).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

// Grilla lógica 27×18 (proporción 3:2, franjas de 2 px)
const FLAG_W = 27;
const FLAG_H = 18;
const CANTON = 10; // cantón 10×10 (las primeras 5 franjas)

const BLUE = '#0038A8';
const WHITE = '#F4F4F0';
const GOLD = '#FCD116';

/** Color de un pixel lógico de la bandera (sin onda). */
function flagPixel(x: number, y: number): string {
  if (x < CANTON && y < CANTON) {
    // Sol de Mayo: disco central + 8 rayos cortos
    const dx = x - 4.5;
    const dy = y - 4.5;
    const dist = Math.hypot(dx, dy);
    if (dist <= 2.3) return GOLD;
    const isRay = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
    if (isRay && dist >= 2.8 && dist <= 4.3) return GOLD;
    return WHITE;
  }
  return Math.floor(y / 2) % 2 === 0 ? WHITE : BLUE;
}

interface UruguayFlagProps {
  /** alto en px CSS (el ancho sale de la proporción 3:2 + amplitud de onda) */
  height?: number;
  className?: string;
  title?: string;
}

export default function UruguayFlag({
  height = 36,
  className = '',
  title = 'Bandera de Uruguay',
}: UruguayFlagProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = Math.max(1, Math.round(height / FLAG_H)); // px por pixel lógico
    const amp = 1.5; // amplitud de la onda en px lógicos
    canvas.width = FLAG_W * s;
    canvas.height = (FLAG_H + 4) * s; // margen vertical para la onda
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    ctx.imageSmoothingEnabled = false;

    const drawFrame = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let x = 0; x < FLAG_W; x++) {
        // La onda crece hacia el extremo libre (el mástil no se mueve)
        const off = Math.round(amp * Math.sin((x / FLAG_W) * Math.PI * 2 - t) * (x / FLAG_W));
        for (let y = 0; y < FLAG_H; y++) {
          ctx.fillStyle = flagPixel(x, y);
          ctx.fillRect(x * s, (y + 2 + off) * s, s, s);
        }
      }
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      drawFrame(0.8); // un frame con algo de onda, quieto
      return;
    }

    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      // ~24fps alcanza para el flameo retro
      if (now - last > 42) {
        last = now;
        drawFrame(now / 280);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [height]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={title}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
