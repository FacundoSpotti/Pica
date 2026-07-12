// ─────────────────────────────────────────────────────────────────────────────
// PICA — Story renderer (TAREA 6, "Wrapped")
// Dibuja una historia 1080×1920 (Instagram Stories) para una estadística:
// branding de campaña + bloque del dato + la multitud + pie. Todo en un canvas
// para conservar el pixel-art crujiente.
// La multitud se REDIBUJA desde los datos con layouts verticales que llenan el
// bloque (no se copia el canvas apaisado de pantalla): las personas se agrupan
// en filas horizontales y las filas se apilan hasta ocupar el espacio.
// ─────────────────────────────────────────────────────────────────────────────

import { geoMercator, geoPath, interpolateRgb, scaleLinear } from 'd3';
import { SPRITE_CONFIGS, LOGOS, assetUrl } from '@/lib/assets';
import { paletteFor, TEMA_COLOR, TEMA_LABEL, TEMA_SCALE, textOnColor } from '@/lib/colors';
import { figureCount, figureScale, matrixScale, niceClosest, perLabel } from '@/lib/isotype';
import { loadSprite, tintSprite } from '@/lib/spriteManager';
import { hardenAlpha } from '@/hooks/useSpriteWalkers';
import type { Tematica } from '@/types/sprites';
import type {
  Dataset,
  DatasetDistribucion,
  DatasetEscalar,
  DatasetEspacial,
  DatasetMatriz,
  DatasetSerie,
} from '@/types/data';

export const STORY_W = 1080;
export const STORY_H = 1920;

/** Titular de campaña (definido por Facundo). */
export const CAMPAIGN_HEADLINE = '¿Y si también compartís nuestro wrapped?';

const BG = '#0A0A0A';
const PAD = 72;
const MUTED = '#A0A09A';
const GRAY = '#4B4B46';

// Geometría del sprite (frame 17×43, contenido 9×17 en offset 4,13)
const C_MIN_X = 4;
const C_MIN_Y = 13;
const C_W = 9;
const C_H = 17;
const GAP = 1;

type Pool = 'm' | 'w' | 'child' | 'any';
const MODELS: Record<Pool, string[]> = {
  m: ['m-01', 'm-02', 'm-03', 'm-04', 'm-05', 'm-06', 'm-07', 'm-08'],
  w: ['w-01', 'w-02', 'w-03', 'w-04', 'w-05', 'w-06', 'w-07', 'w-08'],
  child: ['cm-01', 'cm-02', 'cm-03', 'cm-04', 'cw-01', 'cw-02', 'cw-03', 'cw-04'],
  any: [
    'm-01', 'm-02', 'm-03', 'm-04', 'm-05', 'm-06', 'm-07', 'm-08',
    'w-01', 'w-02', 'w-03', 'w-04', 'w-05', 'w-06', 'w-07', 'w-08',
  ],
};

/** Pool según de quién habla la categoría/el dato (igual criterio que la app). */
function poolFor(entidad: string, caracteristica: string, label: string): Pool {
  if (/niñ|infant|menor/i.test(`${entidad} ${caracteristica}`)) return 'child';
  if (/mujer|femenin|femicid/i.test(label) || /mujer|femicid/i.test(caracteristica)) return 'w';
  if (/var[oó]n|hombre|masculin/i.test(label)) return 'm';
  return 'any';
}

/** Modelo determinista (misma figura en cada regeneración). */
function pickModel(pool: Pool, i: number): string {
  const list = MODELS[pool];
  return list[((i * 2654435761) >>> 0) % list.length]!;
}

type Sheet = HTMLCanvasElement | OffscreenCanvas;
/** Precarga y tinta los sheets necesarios; clave `${model}|${color}`. */
async function loadSheets(pairs: Set<string>): Promise<Map<string, Sheet>> {
  const map = new Map<string, Sheet>();
  await Promise.all(
    [...pairs].map(async (key) => {
      const [model, color] = key.split('|') as [string, string];
      const cfg = SPRITE_CONFIGS.find((c) => c.id === model) ?? SPRITE_CONFIGS[0]!;
      const img = await loadSprite(cfg.src);
      map.set(key, hardenAlpha(tintSprite(img, color)));
    }),
  );
  return map;
}

interface Fig {
  color: string;
  pool: Pool;
}

/** Dibuja una figura (idle frontal, frame 0) recortada a su contenido. */
function drawFig(
  ctx: CanvasRenderingContext2D,
  sheets: Map<string, Sheet>,
  fig: Fig,
  i: number,
  x: number,
  y: number,
  s: number,
) {
  const sheet = sheets.get(`${pickModel(fig.pool, i)}|${fig.color}`);
  if (!sheet) return;
  ctx.drawImage(sheet, C_MIN_X, C_MIN_Y, C_W, C_H, x, y, C_W * s, C_H * s);
}

/** Mayor escala de sprite con la que `total` figuras entran en w×h. */
function planScale(total: number, w: number, h: number, extraPx = 0): { s: number; cols: number } {
  for (let s = 7; s >= 1; s--) {
    const cols = Math.max(1, Math.floor(w / ((C_W + GAP) * s)));
    const rows = Math.ceil(total / cols);
    if (rows * (C_H + GAP) * s + extraPx <= h || s === 1) return { s, cols };
  }
  return { s: 1, cols: Math.max(1, Math.floor(w / (C_W + GAP))) };
}

/** Vuelca figuras fila por fila (agrupadas en horizontal); devuelve la Y final. */
function drawFlow(
  ctx: CanvasRenderingContext2D,
  sheets: Map<string, Sheet>,
  figs: Fig[],
  x: number,
  y: number,
  cols: number,
  s: number,
  startIdx = 0,
): number {
  const px = (C_W + GAP) * s;
  const py = (C_H + GAP) * s;
  figs.forEach((f, j) => {
    drawFig(ctx, sheets, f, startIdx + j, x + (j % cols) * px, y + Math.floor(j / cols) * py, s);
  });
  return y + Math.ceil(figs.length / cols) * py;
}

// ── Layouts de multitud por tipo ─────────────────────────────────────────────

interface CrowdPlan {
  figs?: Fig[]; // flujo simple
  bands?: Array<{ title?: string; figs: Fig[] }>; // bandas apiladas
  gridC?: {
    cells: Array<{ periodo: string; valor: number; color: string; count: number }>;
    pool: Pool;
    pct: boolean;
  };
  scaleNote?: string;
}

function planB(d: DatasetDistribucion, palette: string[]): CrowdPlan {
  const sum = d.categorias.reduce((a, c) => a + c.valor, 0);
  const isRate = d.unidad === '%' && Math.abs(sum - 100) > 3;
  const colorOf = (i: number) => d.categorias[i]!.color ?? palette[i % palette.length]!;
  if (isRate) {
    // Tasas: una banda de 100 por categoría (valor en color, resto gris)
    return {
      bands: d.categorias.map((c, i) => {
        const colored = Math.max(0, Math.min(100, Math.round(c.valor)));
        const pool = poolFor(d.entidad, d.caracteristica, c.label);
        const figs: Fig[] = Array.from({ length: 100 }, (_, j) => ({
          color: j < colored ? colorOf(i) : GRAY,
          pool,
        }));
        return { figs };
      }),
      scaleNote: '1 figura = 1% (resto en gris)',
    };
  }
  const { per, label } = figureScale(sum, d.unidad);
  const figs: Fig[] = [];
  d.categorias.forEach((c, i) => {
    const pool = poolFor(d.entidad, d.caracteristica, c.label);
    for (let j = 0; j < figureCount(c.valor, per); j++) figs.push({ color: colorOf(i), pool });
  });
  return { figs, scaleNote: label };
}

function planD(d: DatasetMatriz, palette: string[]): CrowdPlan {
  const filasH = d.filas.length >= d.columnas.length;
  const hLabels = filasH ? d.filas : d.columnas;
  const vLabels = filasH ? d.columnas : d.filas;
  const valueAt = (v: number, h: number) => (filasH ? d.valores[h]![v]! : d.valores[v]![h]!);
  const sum = d.valores.flat().reduce((a, n) => a + n, 0);
  const { per, label } = matrixScale(sum, d.unidad);
  return {
    bands: vLabels.map((vLabel, v) => {
      const figs: Fig[] = [];
      hLabels.forEach((hl, h) => {
        const pool = poolFor(d.entidad, d.caracteristica, hl);
        for (let j = 0; j < figureCount(valueAt(v, h), per); j++)
          figs.push({ color: palette[h % palette.length]!, pool });
      });
      return { title: vLabel, figs };
    }),
    scaleNote: label,
  };
}

function planC(d: DatasetSerie, palette: string[]): CrowdPlan {
  const pool = poolFor(d.entidad, d.caracteristica, '');
  return {
    gridC: {
      pool,
      pct: d.unidad === '%',
      cells: d.puntos.map((p, i) => ({
        periodo: p.periodo,
        valor: p.valor,
        color: palette[i % palette.length]!,
        count: Math.max(1, Math.round(p.valor)),
      })),
    },
    scaleNote: d.unidad === '%' ? '1 figura = 1%' : `1 figura = 1 ${d.unidad ?? ''}`.trim(),
  };
}

function planA(d: DatasetEscalar, color: string): CrowdPlan {
  const pool = poolFor(d.entidad, d.caracteristica, d.caracteristica);
  let per = 1;
  if (d.valor > 400) per = niceClosest(d.valor / 300);
  const count = Math.max(1, Math.round(d.valor / per));
  return {
    figs: Array.from({ length: count }, () => ({ color, pool })),
    scaleNote: per > 1 ? perLabel(per, d.unidad) : undefined,
  };
}

// ── Piezas de la plantilla ───────────────────────────────────────────────────

function fontFamily(varName: string): string {
  if (typeof window === 'undefined') return 'monospace';
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || 'monospace';
}

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

/** Decoración pixel de la esquina superior derecha — patrón según temática. */
const DECO_PATTERNS: Record<Tematica, Array<[number, number]>> = {
  // Escalera (el patrón del prototipo)
  educacion: [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3]],
  // Bloque diagonal descendente
  trabajo: [[3, 0], [2, 0], [3, 1], [1, 1], [2, 1], [0, 2], [1, 2], [3, 3]],
  // Cruz/plus desplazada
  salud: [[2, 0], [1, 1], [2, 1], [3, 1], [2, 2], [2, 3], [0, 3]],
  // Columnas descendentes (barras)
  economia: [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [3, 1], [3, 2], [1, 2], [3, 3], [1, 3]],
  // Dispersión (puntos de vigilancia)
  seguridad: [[0, 0], [2, 0], [3, 0], [3, 1], [1, 2], [3, 3], [2, 2], [0, 3]],
};

function drawDeco(ctx: CanvasRenderingContext2D, tema: Tematica) {
  const s = 34;
  const gap = 6;
  const cells = DECO_PATTERNS[tema];
  const x0 = STORY_W - PAD - 4 * (s + gap) + gap;
  const y0 = PAD;
  ctx.fillStyle = TEMA_COLOR[tema];
  for (const [cx, cy] of cells) ctx.fillRect(x0 + cx * (s + gap), y0 + cy * (s + gap), s, s);
}

/**
 * Recorta una imagen a su contenido real (bbox por alfa). El SVG del logo es un
 * lienzo 1000×1000 con el dibujo en una franja del centro — dibujado directo a
 * 64px queda invisible; recortado al contenido se ve al tamaño esperado.
 */
function contentBox(img: HTMLImageElement): { sx: number; sy: number; sw: number; sh: number } {
  const R = 400; // resolución de análisis
  const off = document.createElement('canvas');
  off.width = R;
  off.height = R;
  const octx = off.getContext('2d')!;
  octx.drawImage(img, 0, 0, R, R);
  const data = octx.getImageData(0, 0, R, R).data;
  let minX = R, minY = R, maxX = 0, maxY = 0;
  for (let py = 0; py < R; py++)
    for (let px = 0; px < R; px++)
      if (data[(py * R + px) * 4 + 3]! > 16) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
  if (maxX <= minX || maxY <= minY) return { sx: 0, sy: 0, sw: img.width, sh: img.height };
  const kx = img.width / R;
  const ky = img.height / R;
  return { sx: minX * kx, sy: minY * ky, sw: (maxX - minX + 1) * kx, sh: (maxY - minY + 1) * ky };
}

/** Pie: logotipo real (recortado a contenido) + dominio + hashtag. */
async function drawFooter(ctx: CanvasRenderingContext2D, sans: string, display: string) {
  const y = STORY_H - 110;
  try {
    // Imagotipo (solo el símbolo, sin el texto "PICA") — versión fondo oscuro
    const logo = await loadSprite(assetUrl(LOGOS.isotipo.navbar.light));
    if (!logo.width || !logo.height) throw new Error('logo sin dimensiones');
    const { sx, sy, sw, sh } = contentBox(logo);
    const h = 72;
    const w = (sw / sh) * h;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(logo, sx, sy, sw, sh, PAD, y - h / 2 - 4, w, h);
    ctx.fillStyle = '#EBEBEB';
    ctx.font = `28px ${sans}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('PICA.COM.UY', PAD + w + 28, y + 4);
  } catch {
    // Fallback: texto plano si el SVG no carga
    ctx.fillStyle = '#EBEBEB';
    ctx.font = `700 40px ${display}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('PICA · PICA.COM.UY', PAD, y + 4);
  }
  ctx.fillStyle = '#EBEBEB';
  ctx.textAlign = 'right';
  ctx.font = `700 40px ${display}`;
  ctx.fillText('#URUGUAY', STORY_W - PAD, y + 4);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  items: Array<{ label: string; color: string }>,
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
  for (const it of items) {
    const w = ctx.measureText(it.label).width + padX * 2;
    if (cx + w > x + maxW) {
      cx = x;
      cy += h + 10;
    }
    ctx.fillStyle = it.color;
    ctx.fillRect(cx, cy, w, h);
    ctx.fillStyle = textOnColor(it.color);
    ctx.fillText(it.label, cx + padX, cy + h / 2 + 1);
    cx += w + 10;
  }
  ctx.textBaseline = 'alphabetic';
  return cy + h;
}

const fmt = (n: number) => n.toLocaleString('es-UY');

/**
 * Tipo E — mapa coroplético de Uruguay dibujado en el canvas (d3-geo con
 * context) + leyenda de gradiente + ranking (top y bottom 3 departamentos).
 */
async function drawMapE(
  ctx: CanvasRenderingContext2D,
  d: DatasetEspacial,
  areaX: number,
  y: number,
  areaW: number,
  areaH: number,
  sans: string,
  display: string,
): Promise<void> {
  const res = await fetch('/geo/uruguay-departamentos.json');
  const geo = (await res.json()) as {
    features: Array<{ properties?: { HASC_1?: string }; [k: string]: unknown }>;
  };
  const [lo, hi] = TEMA_SCALE[d.tematica];
  const vals = d.departamentos.map((x) => x.valor);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const t = scaleLinear().domain([minV, maxV]).range([0, 1]).clamp(true);
  const colorOf = (v: number) => interpolateRgb(lo, hi)(t(v));
  const byId = new Map(d.departamentos.map((x) => [x.id as string, x]));

  // Mapa arriba (deja ~300px para leyenda + ranking), misma proyección que MapViz
  const mapH = Math.max(300, Math.min(areaH - 320, areaW * (520 / 480)));
  const mapW = mapH * (480 / 520);
  const proj = geoMercator()
    .center([-55.8, -32.6])
    .scale(4200 * (mapW / 480))
    .translate([areaX + areaW / 2, y + mapH / 2]);
  const path = geoPath(proj, ctx);
  for (const f of geo.features) {
    const iso = (f.properties?.HASC_1 ?? '').replace('.', '-');
    const dept = byId.get(iso);
    ctx.beginPath();
    path(f as unknown as Parameters<typeof path>[0]);
    ctx.fillStyle = dept ? colorOf(dept.valor) : '#26262A';
    ctx.fill();
    ctx.strokeStyle = '#0A0A0A';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Leyenda de bloques (min → max)
  const pctE = d.unidad === '%' ? '%' : '';
  let ly = y + mapH + 30;
  const blocks = 7;
  const bw = 28;
  const lx0 = areaX + areaW / 2 - (blocks * bw) / 2;
  for (let i = 0; i < blocks; i++) {
    ctx.fillStyle = interpolateRgb(lo, hi)(i / (blocks - 1));
    ctx.fillRect(lx0 + i * bw, ly, bw, 16);
  }
  ctx.fillStyle = MUTED;
  ctx.font = `26px ${sans}`;
  ctx.textAlign = 'right';
  ctx.fillText(fmt(minV), lx0 - 12, ly + 14);
  ctx.textAlign = 'left';
  ctx.fillText(`${fmt(maxV)}${pctE}`, lx0 + blocks * bw + 12, ly + 14);

  // Ranking: los 3 más altos y los 3 más bajos
  ly += 56;
  const sorted = [...d.departamentos].sort((a, b) => b.valor - a.valor);
  const rows = [...sorted.slice(0, 3), ...sorted.slice(-3)];
  rows.forEach((dep, i) => {
    const ry = ly + i * 42;
    if (ry > y + areaH - 6) return;
    ctx.fillStyle = colorOf(dep.valor);
    ctx.fillRect(areaX, ry - 20, 22, 22);
    ctx.fillStyle = '#EBEBEB';
    ctx.font = `28px ${sans}`;
    ctx.fillText(dep.nombre, areaX + 36, ry);
    ctx.textAlign = 'right';
    ctx.fillStyle = colorOf(dep.valor);
    ctx.font = `700 30px ${display}`;
    ctx.fillText(`${fmt(dep.valor)}${pctE}`, areaX + areaW, ry);
    ctx.textAlign = 'left';
  });
}

// ── Render principal ─────────────────────────────────────────────────────────

export interface StoryOpts {
  headline?: string;
}

export async function renderStory(
  story: HTMLCanvasElement,
  dataset: Dataset,
  opts: StoryOpts = {},
): Promise<void> {
  story.width = STORY_W;
  story.height = STORY_H;
  const ctx = story.getContext('2d')!;
  const tema = dataset.tematica;
  const color = TEMA_COLOR[tema];
  // Paleta sin repeticiones según cuántas categorías/períodos tenga el dato
  const paletteN =
    dataset.tipoResultado === 'B'
      ? dataset.categorias.length
      : dataset.tipoResultado === 'C'
        ? dataset.puntos.length
        : dataset.tipoResultado === 'D'
          ? Math.max(dataset.filas.length, dataset.columnas.length)
          : 8;
  const palette = paletteFor(tema, paletteN);
  const sans = fontFamily('--font-vt323');
  const display = fontFamily('--font-handjet');
  if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  drawDeco(ctx, tema);

  // Etiqueta de temática + titular de campaña.
  // El titular deja libre la COLUMNA de la decoración (esquina sup. derecha):
  // nunca se tocan, sin importar el patrón de la temática.
  const DECO_COL = 4 * (34 + 6) + 40; // ancho de la grilla de cuadrados + aire
  ctx.fillStyle = color;
  ctx.font = `700 40px ${display}`;
  ctx.fillText(TEMA_LABEL[tema].toUpperCase(), PAD, PAD + 40);
  ctx.fillStyle = '#EBEBEB';
  ctx.font = `700 74px ${display}`;
  let y = wrapText(
    ctx,
    (opts.headline ?? CAMPAIGN_HEADLINE).toUpperCase(),
    PAD,
    PAD + 136,
    STORY_W - PAD * 2 - DECO_COL,
    80,
    4,
  );

  // Bloque del dato
  y += 36;
  ctx.fillStyle = '#EBEBEB';
  ctx.font = `700 46px ${display}`;
  y = wrapText(ctx, dataset.caracteristica, PAD, y, STORY_W - PAD * 2, 52, 3);
  ctx.fillStyle = MUTED;
  ctx.font = `28px ${sans}`;
  ctx.fillText(`${dataset.entidad} · ${dataset.anio}`, PAD, y + 6);
  y += 42;
  ctx.fillStyle = '#C8C8C2';
  ctx.font = `28px ${sans}`;
  y = wrapText(ctx, dataset.descripcion, PAD, y, STORY_W - PAD * 2, 36, 4);
  y += 20;

  // Plan de multitud según tipo
  let plan: CrowdPlan = {};
  if (dataset.tipoResultado === 'B') plan = planB(dataset, palette);
  else if (dataset.tipoResultado === 'D') plan = planD(dataset, palette);
  else if (dataset.tipoResultado === 'C') plan = planC(dataset, palette);
  else if (dataset.tipoResultado === 'A') plan = planA(dataset, color);

  // Leyenda (B distribución/tasa y D) con valores
  if (dataset.tipoResultado === 'B') {
    const items = dataset.categorias.map((c, i) => ({
      label: `${fmt(c.valor)}${dataset.unidad === '%' ? '%' : ''} ${c.label}`,
      color: c.color ?? palette[i % palette.length]!,
    }));
    y = drawLegend(ctx, items, PAD, y, STORY_W - PAD * 2, sans) + 14;
  } else if (dataset.tipoResultado === 'D') {
    const filasH = dataset.filas.length >= dataset.columnas.length;
    const hLabels = filasH ? dataset.filas : dataset.columnas;
    const items = hLabels.map((l, i) => ({ label: l, color: palette[i % palette.length]! }));
    y = drawLegend(ctx, items, PAD, y, STORY_W - PAD * 2, sans) + 14;
  }

  // Nota de escala — con aire respecto de los chips de la leyenda
  if (plan.scaleNote) {
    y += 22;
    ctx.fillStyle = MUTED;
    ctx.font = `26px ${sans}`;
    ctx.textAlign = 'right';
    ctx.fillText(plan.scaleNote, STORY_W - PAD, y + 8);
    ctx.textAlign = 'left';
    y += 34;
  }

  // Área de multitud: de y al pie — la multitud LLENA este bloque
  const footerTop = STORY_H - 180;
  const areaX = PAD;
  const areaW = STORY_W - PAD * 2;
  const areaH = footerTop - y - 10;

  // Tipo E — mapa coroplético (sin multitud de sprites)
  if (dataset.tipoResultado === 'E') {
    await drawMapE(ctx, dataset, areaX, y + 6, areaW, areaH, sans, display);
    await drawFooter(ctx, sans, display);
    return;
  }

  // Precarga de sheets
  const pairs = new Set<string>();
  const collect = (figs: Fig[], base: number) =>
    figs.forEach((f, j) => pairs.add(`${pickModel(f.pool, base + j)}|${f.color}`));
  if (plan.figs) collect(plan.figs, 0);
  plan.bands?.forEach((b, i) => collect(b.figs, i * 100000));
  if (plan.gridC) {
    plan.gridC.cells.forEach((c, i) => {
      for (let j = 0; j < c.count; j++) pairs.add(`${pickModel(plan.gridC!.pool, i * 1000 + j)}|${c.color}`);
    });
  }
  const sheets = await loadSheets(pairs);

  if (dataset.tipoResultado === 'A' && plan.figs) {
    // Tipo A (ej. femicidios): número GRANDE centrado, la unidad centrada
    // justo debajo, y la multitud completando el resto del espacio.
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = `900 210px ${display}`;
    ctx.fillText(
      `${fmt(dataset.valor)}${dataset.unidad === '%' ? '%' : ''}`,
      areaX + areaW / 2,
      y + 190,
    );
    let yy = y + 190;
    if (dataset.unidad && dataset.unidad !== '%') {
      ctx.fillStyle = MUTED;
      ctx.font = `36px ${sans}`;
      ctx.fillText(dataset.unidad, areaX + areaW / 2, yy + 52);
      yy += 52;
    }
    ctx.textAlign = 'left';
    const crowdY = yy + 40;
    const crowdAreaH = footerTop - crowdY - 10;
    // REGLA: nada de espacio vacío — con pocas figuras (ej. 23) la escala sube
    // hasta que la multitud LLENA el bloque bajo el número, centrada.
    const n = plan.figs.length;
    let s = 1;
    let usedCols = n;
    for (let t = 18; t >= 1; t--) {
      const px = (C_W + GAP) * t;
      const py = (C_H + GAP) * t;
      const c = Math.max(1, Math.floor(areaW / px));
      const r = Math.ceil(n / c);
      if (r * py <= crowdAreaH) {
        s = t;
        usedCols = Math.min(c, Math.ceil(n / r));
        break;
      }
    }
    const pxA = (C_W + GAP) * s;
    const rowsA = Math.ceil(n / usedCols);
    const blockW = usedCols * pxA - GAP * s;
    const crowdH = rowsA * (C_H + GAP) * s;
    drawFlow(
      ctx,
      sheets,
      plan.figs,
      areaX + Math.max(0, (areaW - blockW) / 2),
      crowdY + Math.max(0, (crowdAreaH - crowdH) / 2),
      usedCols,
      s,
    );
  } else if (plan.figs) {
    const { s, cols } = planScale(plan.figs.length, areaW, areaH);
    const rows = Math.ceil(plan.figs.length / cols);
    const crowdH = rows * (C_H + GAP) * s;
    drawFlow(ctx, sheets, plan.figs, areaX, y + Math.max(0, (areaH - crowdH) / 2), cols, s);
  } else if (plan.bands) {
    // Bandas apiladas verticalmente, escala común, con título opcional
    const titleH = plan.bands.some((b) => b.title) ? 40 : 0;
    const bandGap = 26;
    let chosen = 1;
    for (let s = 6; s >= 1; s--) {
      const cols = Math.max(1, Math.floor(areaW / ((C_W + GAP) * s)));
      const h = plan.bands.reduce(
        (a, b) => a + titleH + Math.ceil(b.figs.length / cols) * (C_H + GAP) * s,
        bandGap * (plan.bands.length - 1),
      );
      if (h <= areaH || s === 1) {
        chosen = s;
        break;
      }
    }
    const cols = Math.max(1, Math.floor(areaW / ((C_W + GAP) * chosen)));
    let by = y + 6;
    plan.bands.forEach((b, i) => {
      if (b.title) {
        ctx.fillStyle = MUTED;
        ctx.font = `28px ${sans}`;
        ctx.fillText(b.title, areaX, by + 26);
        by += titleH;
      }
      by = drawFlow(ctx, sheets, b.figs, areaX, by, cols, chosen, i * 100000) + bandGap;
    });
  } else if (plan.gridC) {
    // Grilla de períodos: las celdas REPARTEN el ancho completo (de margen a
    // margen) — cada celda tiene su carril fijo, así los números y años nunca
    // se superponen ni se apelmazan al centro.
    const cells = plan.gridC.cells;
    const maxCount = Math.max(...cells.map((c) => c.count));
    const labelH = 76;
    // Buscar la combinación filas×escala que MÁS LLENA el bloque (regla de
    // composición: ocupar el espacio vacío — ej. 18 años → 4×5, no 2×9).
    let best = { r: 1, s: 1, fc: 2, cellW: Math.floor(areaW), fill: 0 };
    for (let r = 1; r <= 6; r++) {
      const cols = Math.ceil(cells.length / r);
      const cw = Math.floor(areaW / cols);
      for (let t = 6; t >= 1; t--) {
        const px = (C_W + GAP) * t;
        const py = (C_H + GAP) * t;
        const fc = Math.floor((cw - 10) / px);
        if (fc < 2) continue;
        const ch = Math.ceil(maxCount / fc) * py + labelH;
        const gridH = r * ch + (r - 1) * 18;
        if (gridH <= areaH) {
          const fill = gridH / areaH;
          if (fill > best.fill) best = { r, s: t, fc, cellW: cw, fill };
          break; // con este r, t mayor ya encontrado
        }
      }
    }
    const { r: nRows, s, fc: figCols, cellW } = best;
    const nCols = Math.ceil(cells.length / nRows);
    const px = (C_W + GAP) * s;
    const py = (C_H + GAP) * s;
    const cellH = Math.ceil(maxCount / figCols) * py + labelH;
    cells.forEach((cell, i) => {
      const gx = areaX + (i % nCols) * cellW;
      const gy = y + 6 + Math.floor(i / nCols) * (cellH + 18);
      for (let j = 0; j < cell.count; j++) {
        drawFig(
          ctx,
          sheets,
          { color: cell.color, pool: plan.gridC!.pool },
          i * 1000 + j,
          gx + (j % figCols) * px,
          gy + Math.floor(j / figCols) * py,
          s,
        );
      }
      const ly = gy + Math.ceil(maxCount / figCols) * py;
      ctx.fillStyle = MUTED;
      ctx.font = `26px ${sans}`;
      ctx.fillText(cell.periodo, gx, ly + 30);
      ctx.fillStyle = cell.color;
      ctx.font = `700 32px ${display}`;
      ctx.fillText(`${fmt(cell.valor)}${plan.gridC!.pct ? '%' : ''}`, gx, ly + 66);
    });
  }

  await drawFooter(ctx, sans, display);
}
