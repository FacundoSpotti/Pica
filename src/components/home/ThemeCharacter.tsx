'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — ThemeCharacter
// Personaje pixel art de una temática girando 360° en loop continuo.
// Usa buildRotationSheet (spriteManager): 5 frames dibujados + 3 espejados,
// normalizados a celdas uniformes. 100ms por frame → 800ms la vuelta completa.
// Con prefers-reduced-motion queda quieto en el frame frontal.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ROTATION_SPRITES } from '@/lib/assets';
import { TEMA_LABEL } from '@/lib/colors';
import { buildRotationSheet } from '@/lib/spriteManager';
import type { RotationSheet, Tematica } from '@/types/sprites';

/** ms por frame de la rotación (ver pica-home). */
const FRAME_DURATION = 100;

interface ThemeCharacterProps {
  tema: Tematica;
  /** Alto de render en px (el ancho mantiene la proporción del frame). */
  height?: number;
}

export default function ThemeCharacter({ tema, height = 180 }: ThemeCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sheet, setSheet] = useState<RotationSheet | null>(null);
  const [frame, setFrame] = useState(0);
  const prefersReduced = useReducedMotion();

  // Cargar y armar la hoja de rotación completa (con caché en loadSprite)
  useEffect(() => {
    let cancelled = false;
    setSheet(null);
    setFrame(0);
    // Versión sin color — decisión de diseño (ver assets.ts)
    buildRotationSheet(ROTATION_SPRITES[tema].nocolor)
      .then((s) => {
        if (!cancelled) setSheet(s);
      })
      .catch(() => {
        // Si falla la carga se queda sin sprite; el overlay sigue siendo usable
      });
    return () => {
      cancelled = true;
    };
  }, [tema]);

  // Avanzar el frame en loop (salvo movimiento reducido)
  useEffect(() => {
    if (!sheet || prefersReduced) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % sheet.frameCount), FRAME_DURATION);
    return () => clearInterval(id);
  }, [sheet, prefersReduced]);

  // Dibujar el frame actual
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sheet) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      sheet.canvas,
      frame * sheet.frameWidth, 0, sheet.frameWidth, sheet.frameHeight,
      0, 0, sheet.frameWidth, sheet.frameHeight,
    );
  }, [sheet, frame]);

  const width = sheet ? Math.round((sheet.frameWidth / sheet.frameHeight) * height) : height;

  return (
    <canvas
      ref={canvasRef}
      width={sheet?.frameWidth ?? 48}
      height={sheet?.frameHeight ?? 70}
      role="img"
      aria-label={`Personaje de ${TEMA_LABEL[tema]} girando en 360 grados`}
      style={{
        width,
        height,
        imageRendering: 'pixelated',
      }}
    />
  );
}
