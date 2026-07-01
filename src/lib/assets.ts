// ─────────────────────────────────────────────────────────────────────────────
// PICA — Manifiesto de assets
//
// ÚNICA fuente de verdad para rutas de assets en todo el proyecto.
// Todas las rutas usan los nombres EXACTOS de los archivos en disco
// (public/assets/…), verificados con `find` — no los nombres de los skills,
// que en varios casos no coinciden con la realidad del repo.
//
// Notas importantes de discrepancia con los skills:
//  · Los sprites viven en /assets/Characters/24-sprites/, no en /sprites/.
//  · El landscape vive en /assets/design_system/landscape/ y la capa de
//    educación es "Landscape_parts-educacion.png" SIN tilde.
//  · Las hojas de rotación miden 256×128 (no 240×70) y tienen frames de ancho
//    variable con gaps transparentes — ver buildRotationSheet en spriteManager.
//  · Varias carpetas/archivos tienen acentos y espacios → usar assetUrl() para
//    generar una URL segura (encodeURI) antes de fetch/Image.src.
// ─────────────────────────────────────────────────────────────────────────────

import type { SpriteConfig, Tematica } from '@/types/sprites';

/** Raíz de los assets servidos desde /public. */
export const ASSET_BASE = '/assets';

/**
 * Convierte una ruta del manifiesto en una URL segura para fetch/Image.src.
 * Codifica espacios y acentos (á, í, ñ) preservando las barras.
 */
export function assetUrl(path: string): string {
  return encodeURI(path);
}

// ── 1. Sprites de personas (Home Canvas) ─────────────────────────────────────
// 24 spritesheets base en blanco, 68×172px (frame 17×43, grilla 4×4).
// Set limpio y completo: /assets/Characters/24-sprites/

const SPRITES_DIR = `${ASSET_BASE}/Characters/24-sprites`;

/** Genera un SpriteConfig estándar para un id de persona. */
function persona(id: string): SpriteConfig {
  return {
    id,
    src: `${SPRITES_DIR}/persona_${id}-base-spritesheet.png`,
    frameWidth: 17,
    frameHeight: 43,
    walkFrames: 4,
    idleFrames: 2,
  };
}

export const SPRITE_CONFIGS: readonly SpriteConfig[] = [
  // Adulto masculino (8)
  persona('m-01'), persona('m-02'), persona('m-03'), persona('m-04'),
  persona('m-05'), persona('m-06'), persona('m-07'), persona('m-08'),
  // Adulta femenina (8)
  persona('w-01'), persona('w-02'), persona('w-03'), persona('w-04'),
  persona('w-05'), persona('w-06'), persona('w-07'), persona('w-08'),
  // Niño (4)
  persona('cm-01'), persona('cm-02'), persona('cm-03'), persona('cm-04'),
  // Niña (4)
  persona('cw-01'), persona('cw-02'), persona('cw-03'), persona('cw-04'),
] as const;

/** Dimensiones del spritesheet de persona. */
export const SPRITE_SHEET = {
  width: 68,
  height: 172,
  frameWidth: 17,
  frameHeight: 43,
  cols: 4,
  rows: 4,
} as const;

// ── 2. Landscape isométrico (Home) ───────────────────────────────────────────
// Canvas 4096×2305, todas las capas alineadas al mismo lienzo (apilar con
// position:absolute, sin ajustar coordenadas).

const LANDSCAPE_DIR = `${ASSET_BASE}/design_system/landscape`;

/** Dimensiones nativas del landscape (todas las capas). */
export const LANDSCAPE_SIZE = { width: 4096, height: 2305 } as const;

/**
 * Ciudad COMPLETA en una sola imagen (background + edificios compuestos).
 * Es la imagen default del Home. Las capas individuales de edificios se usan
 * solo al seleccionar una temática (mostrar ese edificio en color).
 */
export const LANDSCAPE_COMPLETE = `${LANDSCAPE_DIR}/Landscape_complete.png`;

/** Capa base: ciudad con el centro (edificios temáticos) vaciado. */
export const LANDSCAPE_BACKGROUND = `${LANDSCAPE_DIR}/Landscape_background.png`;

/** Palacio Legislativo: decorativo central, NO clickeable. */
export const LANDSCAPE_PALACIO = `${LANDSCAPE_DIR}/Landscape_parts_palacio_legislativo.png`;

/** Capa de color de cada temática (se muestra al seleccionar el edificio). */
export const BUILDING_LAYERS: Record<Tematica, string> = {
  educacion: `${LANDSCAPE_DIR}/Landscape_parts-educacion.png`, // IAVA (sin tilde en disco)
  trabajo: `${LANDSCAPE_DIR}/Landscape_parts_trabajo.png`, // Intendencia
  salud: `${LANDSCAPE_DIR}/Landscape_parts_salud.png`, // Hospital de Clínicas
  economia: `${LANDSCAPE_DIR}/Landscape_parts_economia.png`, // BROU (V2)
  seguridad: `${LANDSCAPE_DIR}/Landscape_parts_seguridad.png`, // Comisaría (V2)
};

/**
 * Hitboxes ajustadas al contorno real de cada edificio, como polígonos (quads
 * isométricos) en fracciones (0–1) del stage. Trazadas a mano sobre
 * Landscape_complete.png para que NO se solapen entre sí y cubran solo el
 * edificio (no la manzana ni las calles). Se usan como clip-path del área
 * clickeable. Orden de vértices: arriba → derecha → abajo → izquierda.
 */
export type Polygon = ReadonlyArray<readonly [number, number]>;

export const BUILDING_HITBOX_POLYGONS: Record<Tematica, Polygon> = {
  educacion: [[0.72, 0.11], [0.865, 0.25], [0.70, 0.41], [0.585, 0.27]], // edificio rojo (arriba-der)
  salud: [[0.37, 0.12], [0.46, 0.26], [0.33, 0.44], [0.235, 0.30]], // torres (arriba-izq)
  trabajo: [[0.28, 0.47], [0.36, 0.60], [0.26, 0.75], [0.185, 0.60]], // torre marrón (abajo-izq)
  economia: [[0.70, 0.52], [0.805, 0.64], [0.675, 0.78], [0.585, 0.65]], // edificio clásico (abajo-der)
  seguridad: [[0.17, 0.37], [0.235, 0.46], [0.14, 0.55], [0.075, 0.46]], // POLICÍA (izq)
};

/** Centroide (promedio de vértices) de un polígono, en fracciones. */
export function polygonCentroid(poly: Polygon): { x: number; y: number } {
  const n = poly.length;
  let sx = 0;
  let sy = 0;
  for (const [x, y] of poly) {
    sx += x;
    sy += y;
  }
  return { x: sx / n, y: sy / n };
}

/** String `polygon(...)` para clip-path CSS a partir de un polígono en fracciones. */
export function polygonClipPath(poly: Polygon): string {
  const pts = poly.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`);
  return `polygon(${pts.join(', ')})`;
}

// ── 3. Sprites de rotación 360° de temáticas (ThemeCard / ThemeOverlay) ──────
// Hojas 256×128 con 5 frames dibujados (0°,45°,90°,135°,180°) de ancho variable.
// Los frames 225°/270°/315° se generan por flip en buildRotationSheet.

const THEMES_DIR = `${ASSET_BASE}/design_system/themes`;
const ROTATION_DIR = `${THEMES_DIR}/Animación`;

/** Dimensiones nativas de las hojas de rotación. */
export const ROTATION_SHEET_SIZE = {
  width: 256,
  height: 128,
  drawnFrames: 5, // 0°–180° dibujados
  totalFrames: 8, // +3 generados por flip → 360°
} as const;

/** Variante con color y sin color de cada rotación. */
export interface RotationVariant {
  color: string;
  nocolor: string;
}

/**
 * Rotaciones por temática (nombres exactos en disco).
 * NOTA: educación solo tiene versión sin color en disco — se reutiliza para
 * `color` hasta que exista la variante coloreada.
 */
export const ROTATION_SPRITES: Record<Tematica, RotationVariant> = {
  educacion: {
    color: `${ROTATION_DIR}/Animacion Estudiante.png`, // no existe versión color aún
    nocolor: `${ROTATION_DIR}/Animacion Estudiante.png`,
  },
  trabajo: {
    // OJO: esta hoja de color tiene los 5 frames pegados sin gaps transparentes
    // → detectFrames no encuentra separadores y buildRotationSheet cae al
    // fallback de división uniforme (256/5). Aceptable, revisar al armar ThemeCard.
    color: `${ROTATION_DIR}/Animación Trabajador Color.png`,
    nocolor: `${ROTATION_DIR}/Animacion Trabajador.png`, // detecta 5 frames OK
  },
  salud: {
    color: `${ROTATION_DIR}/Animacion Doctor Color.png`,
    nocolor: `${ROTATION_DIR}/Animacion Doctor.png`,
  },
  economia: {
    color: `${ROTATION_DIR}/Animación Economica Color.png`,
    nocolor: `${ROTATION_DIR}/Animación Economica.png`,
  },
  seguridad: {
    color: `${ROTATION_DIR}/Animación Policia Color.png`,
    nocolor: `${ROTATION_DIR}/Animación Policia.png`,
  },
};

/** Personaje estático (frontal) de cada temática. */
export const THEME_STATIC: Record<Tematica, string> = {
  educacion: `${THEMES_DIR}/Estudiante.png`,
  trabajo: `${THEMES_DIR}/Trabajador.png`,
  salud: `${THEMES_DIR}/Doctor.png`,
  economia: `${THEMES_DIR}/Economista.png`,
  seguridad: `${THEMES_DIR}/Policia.png`,
};

// ── 4. Logos ─────────────────────────────────────────────────────────────────
// Todas las variantes existen en SVG (logos_svg) y PNG (logos_png).
// Estructura: Logo (símbolo+texto) · Isotipo (solo símbolo) · Animación (ojos
// separados, para animar) — cada uno en Original/Navbar/favicon × Dark/Light.

const LOGO_SVG_DIR = `${ASSET_BASE}/design_system/logos_svg`;
const LOGO_PNG_DIR = `${ASSET_BASE}/design_system/logos_png`;

export const LOGOS = {
  // Logo completo (símbolo + texto "PICA")
  original: {
    dark: `${LOGO_SVG_DIR}/Logo - Original - Dark.svg`,
    light: `${LOGO_SVG_DIR}/Logo - Original - Light.svg`,
  },
  navbar: {
    dark: `${LOGO_SVG_DIR}/Logo - Navbar - Dark.svg`,
    light: `${LOGO_SVG_DIR}/Logo - Navbar - Light.svg`,
  },
  favicon: {
    dark: `${LOGO_SVG_DIR}/Logo - favicon - Dark.svg`,
    light: `${LOGO_SVG_DIR}/Logo - favicon - Light.svg`,
  },
  // Isotipo (solo el símbolo, sin texto)
  isotipo: {
    original: {
      dark: `${LOGO_SVG_DIR}/Isotipo - Original - Dark.svg`,
      light: `${LOGO_SVG_DIR}/Isotipo - Original - Light.svg`,
    },
    navbar: {
      dark: `${LOGO_SVG_DIR}/Isotipo - Navbar - Dark.svg`,
      light: `${LOGO_SVG_DIR}/Isotipo - Navbar - Light.svg`,
    },
    favicon: {
      dark: `${LOGO_SVG_DIR}/Isotipo - favicon - Dark.svg`,
      light: `${LOGO_SVG_DIR}/Isotipo - favicon - Light.svg`,
    },
  },
  // Versiones animables (capas eye-left / eye-right separadas)
  animacion: {
    original: {
      // solo existe Dark del logo completo animado en Original
      dark: `${LOGO_SVG_DIR}/Animación - Original - Dark.svg`,
      light: `${LOGO_SVG_DIR}/Logo Animación - Original - Light.svg`,
    },
    navbar: {
      dark: `${LOGO_SVG_DIR}/Animación - Navbar - Dark.svg`,
      light: `${LOGO_SVG_DIR}/Animación - Navbar - Light.svg`,
    },
    isotipo: {
      navbar: {
        dark: `${LOGO_SVG_DIR}/Isotipo Animación - Navbar - Dark.svg`,
        light: `${LOGO_SVG_DIR}/Isotipo Animación - Navbar - Light.svg`,
      },
      original: {
        dark: `${LOGO_SVG_DIR}/Isotipo Animación - Original - Dark.svg`,
        light: `${LOGO_SVG_DIR}/Isotipo Animación - Original - Light.svg`,
      },
    },
  },
  // Fallbacks PNG del favicon (para <link rel="icon">)
  faviconPng: {
    dark: `${LOGO_PNG_DIR}/Logo - favicon - Dark.png`,
    light: `${LOGO_PNG_DIR}/Logo - favicon - Light.png`,
  },
} as const;

// ── 5. Fuentes locales (fallback de next/font/google) ────────────────────────
// El proyecto carga VT323 y Handjet vía next/font/google, pero las TTF también
// están en disco por si se necesita un fallback local o uso en Canvas.

const FONTS_DIR = `${ASSET_BASE}/design_system/tipography/Handjet,VT323`;

export const FONT_FILES = {
  vt323: `${FONTS_DIR}/VT323/VT323-Regular.ttf`,
  handjetVariable: `${FONTS_DIR}/Handjet/Handjet-VariableFont_ELGR,ELSH,wght.ttf`,
} as const;
