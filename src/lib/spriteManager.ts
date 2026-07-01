// ─────────────────────────────────────────────────────────────────────────────
// PICA — spriteManager
// Carga, caché, palette swap, flip y armado de hojas de rotación 360°.
// Todas las funciones son client-side (usan Image/Canvas). Las rutas provienen
// de assets.ts; acá nunca se hardcodea una ruta.
// ─────────────────────────────────────────────────────────────────────────────

import { assetUrl, ROTATION_SHEET_SIZE } from '@/lib/assets';
import type { RotationSheet } from '@/types/sprites';

/** Fuente dibujable en un canvas 2D. */
type Drawable = HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;

/** Ancho de cualquier Drawable. */
function drawableWidth(src: Drawable): number {
  return src instanceof HTMLImageElement ? src.naturalWidth : src.width;
}

/** Alto de cualquier Drawable. */
function drawableHeight(src: Drawable): number {
  return src instanceof HTMLImageElement ? src.naturalHeight : src.height;
}

/**
 * Crea un canvas offscreen. Prefiere OffscreenCanvas; si no está disponible
 * cae a un <canvas> del DOM. `willReadFrequently` acelera getImageData.
 */
function createCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('No se pudo obtener el contexto 2D de OffscreenCanvas');
    return { canvas, ctx };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas');
  return { canvas, ctx };
}

// ── Carga con caché ──────────────────────────────────────────────────────────

const spriteCache = new Map<string, Promise<HTMLImageElement>>();

/**
 * Carga un PNG y lo cachea por ruta. Devuelve siempre la misma promesa para
 * una ruta dada (evita descargas duplicadas). La clave de caché es la ruta
 * original del manifiesto; internamente se codifica con assetUrl().
 */
export function loadSprite(src: string): Promise<HTMLImageElement> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadSprite solo puede usarse en el cliente'));
  }
  const cached = spriteCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar el sprite: ${src}`));
    img.src = assetUrl(src);
  });

  spriteCache.set(src, promise);
  return promise;
}

/** Vacía la caché de sprites (útil en tests o hot-reload manual). */
export function clearSpriteCache(): void {
  spriteCache.clear();
}

// ── Palette swap ─────────────────────────────────────────────────────────────

/**
 * Aplica un color plano al sprite conservando su silueta (alpha).
 * Los sprites base son blancos; el color se aplica en runtime con
 * globalCompositeOperation 'source-in'.
 */
export function tintSprite(src: Drawable, color: string): HTMLCanvasElement | OffscreenCanvas {
  const w = drawableWidth(src);
  const h = drawableHeight(src);
  const { canvas, ctx } = createCanvas(w, h);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  return canvas;
}

// ── Flip horizontal ──────────────────────────────────────────────────────────

/** Espeja horizontalmente un sprite (para la dirección izquierda). */
export function flipSprite(src: Drawable): HTMLCanvasElement | OffscreenCanvas {
  const w = drawableWidth(src);
  const h = drawableHeight(src);
  const { canvas, ctx } = createCanvas(w, h);
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return canvas;
}

// ── Detección de frames en hojas de rotación ────────────────────────────────
// Las hojas reales (256×128) NO son una grilla uniforme: cada frame tiene
// ancho distinto (perfil ≈ 35px, frente ≈ 51px) y hay gaps transparentes entre
// ellos. Detectamos cada frame por sus columnas no transparentes y luego los
// normalizamos a celdas uniformes.

interface FrameBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Umbral de alpha para considerar un píxel "no transparente". */
const ALPHA_THRESHOLD = 16;
/** Ancho mínimo (px) de un run para no descartarlo como ruido. */
const MIN_RUN_WIDTH = 3;

/**
 * Detecta las cajas de contenido de cada frame en una hoja horizontal,
 * agrupando columnas no transparentes separadas por gaps.
 */
function detectFrames(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  expected: number,
): FrameBox[] {
  // 1. Columnas con algún píxel no transparente
  const filled: boolean[] = new Array(width).fill(false);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (data[(y * width + x) * 4 + 3]! > ALPHA_THRESHOLD) {
        filled[x] = true;
        break;
      }
    }
  }

  // 2. Runs de columnas contiguas → frames candidatos [start, endExclusive]
  let runs: Array<[number, number]> = [];
  let start: number | null = null;
  for (let x = 0; x <= width; x++) {
    if (x < width && filled[x]) {
      if (start === null) start = x;
    } else if (start !== null) {
      if (x - start >= MIN_RUN_WIDTH) runs.push([start, x]);
      start = null;
    }
  }

  // 3. Si hay más runs que los esperados (gaps internos de algún frame),
  //    fusionar iterativamente por el gap más chico hasta llegar a `expected`.
  while (runs.length > expected && runs.length > 1) {
    let minGap = Infinity;
    let idx = 0;
    for (let i = 0; i < runs.length - 1; i++) {
      const gap = runs[i + 1]![0] - runs[i]![1];
      if (gap < minGap) {
        minGap = gap;
        idx = i;
      }
    }
    runs[idx] = [runs[idx]![0], runs[idx + 1]![1]];
    runs.splice(idx + 1, 1);
  }

  // 4. Fallback: si no se detectó una estructura razonable, dividir uniforme.
  if (runs.length < 2) {
    runs = [];
    const cellW = Math.floor(width / expected);
    for (let i = 0; i < expected; i++) runs.push([i * cellW, (i + 1) * cellW]);
  }

  // 5. Caja vertical de contenido por cada run
  return runs.map(([x0, x1]) => {
    let top = height;
    let bottom = 0;
    for (let x = x0; x < x1; x++) {
      for (let y = 0; y < height; y++) {
        if (data[(y * width + x) * 4 + 3]! > ALPHA_THRESHOLD) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }
    if (top > bottom) {
      top = 0;
      bottom = height - 1;
    }
    return { x: x0, y: top, w: x1 - x0, h: bottom - top + 1 };
  });
}

/**
 * Toma una hoja de rotación (5 frames dibujados: 0°,45°,90°,135°,180°) y
 * genera la rotación 360° completa (8 frames) espejando los frames 4,3,2.
 *
 * Devuelve una hoja NORMALIZADA con celdas uniformes: cada frame queda centrado
 * horizontalmente y alineado a la base (pies) dentro de una celda del mismo
 * tamaño, lista para animar con backgroundPosition o drawImage.
 *
 * Se aparta de la spec del skill (que asumía celdas fijas de 48×70 sobre una
 * hoja de 240×70) porque las hojas reales son 256×128 con frames irregulares.
 */
export async function buildRotationSheet(src: string): Promise<RotationSheet> {
  const img = await loadSprite(src);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // Leer píxeles de la hoja original
  const read = createCanvas(w, h);
  read.ctx.drawImage(img, 0, 0);
  const { data } = read.ctx.getImageData(0, 0, w, h);

  const drawn = detectFrames(data, w, h, ROTATION_SHEET_SIZE.drawnFrames);

  // Índices a espejar para completar 360° (ej. drawn=5 → 3,2,1 → total 8)
  const flipIndices: number[] = [];
  for (let i = drawn.length - 2; i >= 1; i--) flipIndices.push(i);
  const totalFrames = drawn.length + flipIndices.length;

  // Celda uniforme = mayor ancho/alto de contenido entre los frames
  const cellW = Math.max(...drawn.map((f) => f.w));
  const cellH = Math.max(...drawn.map((f) => f.h));

  const out = createCanvas(cellW * totalFrames, cellH);

  /** Dibuja el frame `box` en la celda `cellIndex`, centrado y con base abajo. */
  const drawInto = (box: FrameBox, cellIndex: number, flip: boolean): void => {
    const offsetX = Math.floor((cellW - box.w) / 2);
    const destY = cellH - box.h; // alinear pies a la base de la celda
    const cellX = cellIndex * cellW;
    if (!flip) {
      out.ctx.drawImage(img, box.x, box.y, box.w, box.h, cellX + offsetX, destY, box.w, box.h);
      return;
    }
    out.ctx.save();
    out.ctx.translate(cellX + cellW, destY);
    out.ctx.scale(-1, 1);
    out.ctx.drawImage(img, box.x, box.y, box.w, box.h, offsetX, 0, box.w, box.h);
    out.ctx.restore();
  };

  // Frames dibujados (0°–180°)
  drawn.forEach((box, i) => drawInto(box, i, false));
  // Frames generados por flip (225°,270°,315°)
  flipIndices.forEach((srcIdx, i) => drawInto(drawn[srcIdx]!, drawn.length + i, true));

  return {
    canvas: out.canvas,
    frameWidth: cellW,
    frameHeight: cellH,
    frameCount: totalFrames,
  };
}
