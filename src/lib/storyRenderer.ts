// ─────────────────────────────────────────────────────────────────────────────
// PICA — Story renderer (TAREA 6, "Wrapped")
// Dibuja una historia 1080×1920 (Instagram Stories) para una estadística:
// branding de campaña + bloque del dato + la visualización + pie. Todo en un
// canvas para conservar el pixel-art crujiente. La multitud (isotype) se compone
// tomando el/los <canvas> de la viz ya renderizada en pantalla.
// ─────────────────────────────────────────────────────────────────────────────

import { TEMA_COLOR, TEMA_LABEL, TEMA_PALETTE, textOnColor } from '@/lib/colors';
import type { Dataset } from '@/types/data';

export const STORY_W = 1080;
export const STORY_H = 1920;

// Titular de campaña (placeholder — Facundo pasa el texto final).
export const CAMPAIGN_HEADLINE =
  'Este año no solo compartís tu Wrapped, también compartí el nuestro.';

const BG = '#0A0A0A';
const PAD = 72;
const MUTED = '#A0A09A';

/** Familia real de una fuente cargada por next/font (desde su CSS var). */
function fontFamily(varName: string): string {
  if (typeof window === 'undefined') return 'monospace';
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || 'monospace';
}

/** Dibuja texto con wrapping; devuelve la Y siguiente. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  maxLines = 99,
): number {
  const words = text.split(/\s+/);
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i]!;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = words[i]!;
      y += lineH;
      if (++lines >= maxLines - 1) {
        // última línea: recorta con …
        let last = line;
        while (ctx.measureText(`${last}…`).width > maxW && last.length) last = last.slice(0, -1);
        ctx.fillText(`${last}…`, x, y);
        return y + lineH;
      }
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

/** Grilla de cuadrados pixel (decoración) en la esquina superior derecha. */
function drawDeco(ctx: CanvasRenderingContext2D, color: string) {
  const s = 34;
  const gap = 6;
  const cells: Array<[number, number]> = [
    [0, 0], [1, 0], [2, 0], [3, 0],
    [1, 1], [2, 1], [3, 1],
    [3, 2], [3, 3],
  ];
  const x0 = STORY_W - PAD - 4 * (s + gap) + gap;
  const y0 = PAD;
  ctx.fillStyle = color;
  for (const [cx, cy] of cells) ctx.fillRect(x0 + cx * (s + gap), y0 + cy * (s + gap), s, s);
}

/** Pie: logo PICA + dominio + hashtag. */
function drawFooter(ctx: CanvasRenderingContext2D, sans: string, display: string) {
  const y = STORY_H - 110;
  // Logo PICA (recuadro)
  ctx.strokeStyle = '#EBEBEB';
  ctx.lineWidth = 4;
  ctx.strokeRect(PAD, y - 20, 96, 56);
  ctx.fillStyle = '#EBEBEB';
  ctx.font = `700 30px ${display}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('PICA', PAD + 16, y + 9);
  ctx.font = `28px ${sans}`;
  ctx.fillText('PICA.COM.UY', PAD + 128, y + 9);
  // Hashtag a la derecha
  ctx.textAlign = 'right';
  ctx.font = `700 40px ${display}`;
  ctx.fillText('#URUGUAY', STORY_W - PAD, y + 9);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Compone los canvas de la viz (multitud) escalados dentro del área dada. */
function drawVizCanvases(
  ctx: CanvasRenderingContext2D,
  canvases: HTMLCanvasElement[],
  x: number,
  y: number,
  maxW: number,
  maxH: number,
) {
  const usable = canvases.filter((c) => c.width > 0 && c.height > 0);
  if (!usable.length) return;
  const GAP = 14;
  // Escala común para que el más ancho entre en maxW y el total en maxH
  const totalHAt1 = usable.reduce((a, c) => a + c.height, 0) + GAP * (usable.length - 1);
  const maxWidth = Math.max(...usable.map((c) => c.width));
  const scale = Math.min(maxW / maxWidth, maxH / totalHAt1);
  let cy = y;
  ctx.imageSmoothingEnabled = false;
  for (const c of usable) {
    const w = c.width * scale;
    const h = c.height * scale;
    ctx.drawImage(c, x + (maxW - w) / 2, cy, w, h);
    cy += h + GAP * scale;
  }
}

/** Leyenda simple (chips de color) desde los datos, para B y D. */
function drawLegend(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  colors: string[],
  x: number,
  y: number,
  maxW: number,
  sans: string,
): number {
  ctx.font = `26px ${sans}`;
  ctx.textBaseline = 'middle';
  const h = 40;
  const padX = 12;
  let cx = x;
  let cy = y;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]!;
    const w = ctx.measureText(label).width + padX * 2;
    if (cx + w > x + maxW) {
      cx = x;
      cy += h + 10;
    }
    ctx.fillStyle = colors[i % colors.length]!;
    ctx.fillRect(cx, cy, w, h);
    ctx.fillStyle = textOnColor(colors[i % colors.length]!);
    ctx.fillText(label, cx + padX, cy + h / 2 + 1);
    cx += w + 10;
  }
  ctx.textBaseline = 'alphabetic';
  return cy + h;
}

export interface StoryOpts {
  headline?: string;
}

/**
 * Dibuja la historia completa en `story`. `vizCanvases` son los <canvas> de la
 * viz ya montada en pantalla (la multitud). Espera a que fuentes estén listas.
 */
export async function renderStory(
  story: HTMLCanvasElement,
  dataset: Dataset,
  vizCanvases: HTMLCanvasElement[],
  opts: StoryOpts = {},
): Promise<void> {
  story.width = STORY_W;
  story.height = STORY_H;
  const ctx = story.getContext('2d')!;
  const color = TEMA_COLOR[dataset.tematica];
  const sans = fontFamily('--font-vt323');
  const display = fontFamily('--font-handjet');
  if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready;

  // Fondo
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  drawDeco(ctx, color);

  // Etiqueta de temática
  ctx.fillStyle = color;
  ctx.font = `700 40px ${display}`;
  ctx.fillText(TEMA_LABEL[dataset.tematica].toUpperCase(), PAD, PAD + 40);

  // Titular de campaña
  ctx.fillStyle = '#EBEBEB';
  ctx.font = `700 62px ${display}`;
  let y = wrapText(ctx, (opts.headline ?? CAMPAIGN_HEADLINE).toUpperCase(), PAD, PAD + 130, STORY_W - PAD * 2, 68, 5);

  // Bloque del dato
  y += 40;
  ctx.fillStyle = '#EBEBEB';
  ctx.font = `700 46px ${display}`;
  y = wrapText(ctx, dataset.caracteristica, PAD, y, STORY_W - PAD * 2, 52, 3);
  ctx.fillStyle = MUTED;
  ctx.font = `28px ${sans}`;
  ctx.fillText(`${dataset.entidad} · ${dataset.anio}`, PAD, y + 8);
  y += 44;
  ctx.fillStyle = '#C8C8C2';
  ctx.font = `28px ${sans}`;
  y = wrapText(ctx, dataset.descripcion, PAD, y, STORY_W - PAD * 2, 36, 4);

  // Leyenda (B/D) desde los datos
  y += 24;
  const palette = TEMA_PALETTE[dataset.tematica];
  if (dataset.tipoResultado === 'B') {
    const cols = dataset.categorias.map((c, i) => c.color ?? palette[i % palette.length]!);
    y = drawLegend(ctx, dataset.categorias.map((c) => c.label), cols, PAD, y, STORY_W - PAD * 2, sans) + 8;
  } else if (dataset.tipoResultado === 'D') {
    const cols = dataset.columnas.map((_, i) => palette[i % palette.length]!);
    y = drawLegend(ctx, dataset.columnas, cols, PAD, y, STORY_W - PAD * 2, sans) + 8;
  }

  // Visualización (multitud tomada de pantalla)
  const footerTop = STORY_H - 170;
  drawVizCanvases(ctx, vizCanvases, PAD, y + 10, STORY_W - PAD * 2, footerTop - y - 20);

  drawFooter(ctx, sans, display);
}
