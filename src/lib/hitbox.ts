// ─────────────────────────────────────────────────────────────────────────────
// PICA — cálculo automático de hitboxes desde PNGs de capas
// Escanea los píxeles no transparentes de una capa (ej. un edificio del
// landscape) y devuelve su bounding box en porcentajes (0–1) del lienzo.
// Así las hitboxes escalan con la pantalla sin depender de píxeles fijos.
// ─────────────────────────────────────────────────────────────────────────────

import { loadSprite } from '@/lib/spriteManager';

/** Bounding box en fracciones (0–1) del lienzo original. */
export interface HitboxPct {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Umbral de alpha para considerar un píxel parte del edificio. */
const ALPHA_THRESHOLD = 16;

/**
 * Devuelve la hitbox (en %) de los píxeles no transparentes de un PNG.
 * Escanea a baja resolución (`sampleWidth`) para ser rápido incluso con las
 * capas de 4096×2305 — la precisión en % es más que suficiente para las hitboxes.
 * Devuelve null si la capa está completamente vacía.
 */
export async function getHitboxFromPNG(
  src: string,
  sampleWidth = 512,
): Promise<HitboxPct | null> {
  const img = await loadSprite(src);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (nw === 0 || nh === 0) return null;

  // Escalar manteniendo el aspecto
  const sw = Math.min(sampleWidth, nw);
  const sh = Math.max(1, Math.round((nh / nw) * sw));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  let minX = sw;
  let minY = sh;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (data[(y * sw + x) * 4 + 3]! > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null; // capa vacía

  return {
    x: minX / sw,
    y: minY / sh,
    w: (maxX - minX + 1) / sw,
    h: (maxY - minY + 1) / sh,
  };
}

/** Centro (en %) de una hitbox. */
export function hitboxCenter(box: HitboxPct): { x: number; y: number } {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}
