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

/**
 * ARTE DEL LANDSCAPE — 'original' es la imagen fuente; 'c4'/'c6' son el
 * MOSAICO PIXEL REAL generado por scripts/pixelate-landscape.py (celda de
 * 4/6 px con color predominante por zona + paleta global de 64 colores,
 * misma grilla en todas las capas → hitboxes, paths, twinkles y bandera
 * quedan intactos porque todo se posiciona en %).
 * · 'c4': pixelado fino (en desktop casi no se percibe la grilla)
 * · 'c6': pixel art visible conservando la identidad de los edificios
 * Default 'c6'; para alternar sin tocar código: NEXT_PUBLIC_LANDSCAPE_ART
 * en .env.local ('original' | 'c4' | 'c6'). Para regenerar con otros
 * parámetros: `python scripts/pixelate-landscape.py --cell N`.
 */
export type LandscapeVariant = 'original' | 'c4' | 'c6';
export const LANDSCAPE_VARIANT: LandscapeVariant =
  (process.env.NEXT_PUBLIC_LANDSCAPE_ART as LandscapeVariant) || 'c6';

const LANDSCAPE_ART_DIR =
  LANDSCAPE_VARIANT === 'original'
    ? LANDSCAPE_DIR
    : `${LANDSCAPE_DIR}/pixel/${LANDSCAPE_VARIANT}`;

/** Dimensiones nativas del landscape (todas las capas, en el arte ORIGINAL).
 * Solo se usa para la RELACIÓN DE ASPECTO — válida para todas las variantes. */
export const LANDSCAPE_SIZE = { width: 4096, height: 2305 } as const;

/**
 * Ciudad COMPLETA en una sola imagen (background + edificios compuestos).
 * Es la imagen default del Home. Las capas individuales de edificios se usan
 * solo al seleccionar una temática (mostrar ese edificio en color).
 */
export const LANDSCAPE_COMPLETE = `${LANDSCAPE_ART_DIR}/Landscape_complete.png`;

/** Capa base: ciudad con el centro (edificios temáticos) vaciado. */
export const LANDSCAPE_BACKGROUND = `${LANDSCAPE_ART_DIR}/Landscape_background.png`;

/** Edificios rediseñados: sprites recortados a su rombo de base, mosaico pixel
 *  art (celda 4, paleta global de 96). Generados por scripts/pixelate-buildings.py. */
const BUILDINGS_DIR = '/assets/design_system/nuevos_edificios/pixel';

/** Palacio Legislativo: decorativo central, NO clickeable. */
export const LANDSCAPE_PALACIO = `${BUILDINGS_DIR}/palacio.png`;

/** Capa de color de cada temática (se muestra al seleccionar el edificio). */
export const BUILDING_LAYERS: Record<Tematica, string> = {
  educacion: `${BUILDINGS_DIR}/educacion.png`, // IAVA
  trabajo: `${BUILDINGS_DIR}/trabajo.png`, // Intendencia
  salud: `${BUILDINGS_DIR}/salud.png`, // Hospital de Clínicas
  economia: `${BUILDINGS_DIR}/economia.png`, // BROU
  seguridad: `${BUILDINGS_DIR}/seguridad.png`, // Comisaría
};

/**
 * Emplazamiento de cada sprite en el stage, en fracciones (0–1).
 *
 * A diferencia del arte viejo (lienzo completo 4096×2305 con la posición
 * horneada en los píxeles), los edificios rediseñados vienen RECORTADOS a su
 * propio rombo de base, así que la posición se declara acá.
 *
 * CALIBRADO, NO TOCAR A MANO salvo ajuste fino: se derivó midiendo el punto de
 * apoyo (vértice inferior del rombo) de cada edificio viejo y colocando el
 * sprite nuevo de forma que su propio vértice inferior caiga en el mismo punto,
 * igualando el ancho de base. Escala 0.90 sobre ese punto de apoyo, para
 * recuperar el aire de calle entre manzanas (el arte nuevo tiene más masa de
 * edificio por manzana que el viejo).
 *
 * Para recalcular: `python scripts/pixelate-buildings.py` regenera los sprites
 * y footprint.json con la geometría de base medida del propio arte.
 */
export interface Placement {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const BUILDING_PLACEMENT: Record<Tematica | 'palacio', Placement> = {
  educacion: { left: 0.55586, top: 0.05791, width: 0.28872, height: 0.39585 },
  trabajo: { left: 0.17834, top: 0.38243, width: 0.28872, height: 0.48014 },
  salud: { left: 0.19234, top: 0.00852, width: 0.26851, height: 0.42634 },
  economia: { left: 0.56681, top: 0.50645, width: 0.28345, height: 0.36924 },
  seguridad: { left: -0.01529, top: 0.27312, width: 0.28309, height: 0.36979 },
  palacio: { left: 0.37244, top: 0.27464, width: 0.28608, height: 0.38255 },
};

/**
 * Pendiente (dy/dx) de las aristas de la base isométrica, medida del propio
 * arte: el plano del piso baja 0.649 px por cada px horizontal. NO es el 2:1
 * clásico (0.5): los edificios rediseñados comparten un punto de fuga más
 * cerrado (~33°). Es la constante que alinea la calle y el muro con la base.
 */
export const GROUND_SLOPE = 0.649;

/**
 * Faroles de la ciudad, en fracciones (0–1) del stage. Sobre cada uno se dibuja
 * un halo cálido que respira y de vez en cuando destella.
 * Calibrados con el LampCalibrator (tecla L) — no editar a mano.
 */
export const CITY_LAMPS: ReadonlyArray<readonly [number, number]> = [];

/**
 * Manzanas vacías: los huecos que dejan las calles donde TODAVÍA no hay
 * temática. Se marcan con un rombo punteado y un cartel de "próximamente" para
 * contar que Pica sigue creciendo. Centro del rombo, en fracciones del stage.
 * Calibrados con el LampCalibrator (tecla L, modo manzanas) — no editar a mano.
 */
export const FUTURE_BLOCKS: ReadonlyArray<readonly [number, number]> = [];

/**
 * Rombo de BASE de cada sprite (el basamento del propio arte), en fracciones
 * (0–1) del sprite. Medido por scripts/pixelate-buildings.py → footprint.json.
 *
 * El recorte del sprite coincide con el rombo: sus vértices izquierdo y derecho
 * están en x=0 y x=1, a la altura `groundY` (el plano del piso), y el vértice
 * frontal en (bottomX, bottomY). Con esto la calle se apoya CONTRA el basamento
 * del arte y el muro se extruye desde sus mismas aristas — sin adivinar.
 */
export interface Footprint {
  /** Vértice frontal (el más bajo) del rombo. */
  bottomX: number;
  bottomY: number;
  /** Altura del plano del piso = y de los vértices izquierdo/derecho. */
  groundY: number;
  /** Pendiente de las aristas de base de ESTE sprite (dy/dx en px del sprite). */
  slope: number;
}

export const BUILDING_FOOTPRINT: Record<Tematica | 'palacio', Footprint> = {
  economia: { bottomX: 0.5038, bottomY: 0.9949, groundY: 0.5551, slope: 0.6471 },
  educacion: { bottomX: 0.5131, bottomY: 0.9951, groundY: 0.5667, slope: 0.6633 },
  palacio: { bottomX: 0.5033, bottomY: 0.9956, groundY: 0.5744, slope: 0.6358 },
  salud: { bottomX: 0.4715, bottomY: 0.9957, groundY: 0.6362, slope: 0.6454 },
  seguridad: { bottomX: 0.4925, bottomY: 0.9949, groundY: 0.5546, slope: 0.6498 },
  trabajo: { bottomX: 0.5, bottomY: 0.996, groundY: 0.6542, slope: 0.642 },
};

/**
 * Hitboxes ajustadas al contorno real de cada edificio, como polígonos (quads
 * isométricos) en fracciones (0–1) del stage. Trazadas a mano sobre
 * Landscape_complete.png para que NO se solapen entre sí y cubran solo el
 * edificio (no la manzana ni las calles). Se usan como clip-path del área
 * clickeable. Orden de vértices: arriba → derecha → abajo → izquierda.
 */
export type Polygon = ReadonlyArray<readonly [number, number]>;

// Calibrados por Facundo con el HitboxCalibrator (tecla H) — no editar a mano:
// recalibrar con la herramienta y pegar el bloque que copia la tecla C.
export const BUILDING_HITBOX_POLYGONS: Record<Tematica, Polygon> = {
  educacion: [[0.566, 0.284], [0.613, 0.344], [0.663, 0.407], [0.695, 0.445], [0.706, 0.457], [0.714, 0.46], [0.74, 0.431], [0.828, 0.336], [0.85, 0.305], [0.851, 0.292], [0.845, 0.281], [0.844, 0.266], [0.841, 0.272], [0.828, 0.253], [0.829, 0.224], [0.812, 0.202], [0.762, 0.151], [0.761, 0.133], [0.757, 0.127], [0.758, 0.106], [0.752, 0.088], [0.749, 0.067], [0.746, 0.087], [0.741, 0.104], [0.738, 0.13], [0.708, 0.106], [0.704, 0.101], [0.615, 0.19], [0.615, 0.217]],
  salud: [[0.31, 0.445], [0.348, 0.404], [0.379, 0.371], [0.421, 0.322], [0.45, 0.289], [0.45, 0.277], [0.409, 0.232], [0.407, 0.085], [0.389, 0.067], [0.384, 0.062], [0.383, 0.044], [0.368, 0.035], [0.348, 0.054], [0.329, 0.033], [0.32, 0.039], [0.317, 0.018], [0.312, 0.027], [0.312, 0.046], [0.3, 0.059], [0.299, 0.089], [0.273, 0.115], [0.264, 0.107], [0.247, 0.125], [0.246, 0.224], [0.222, 0.25], [0.21, 0.247], [0.204, 0.264], [0.185, 0.292], [0.183, 0.298]],
  trabajo: [[0.184, 0.704], [0.325, 0.87], [0.331, 0.867], [0.469, 0.713], [0.471, 0.706], [0.455, 0.682], [0.447, 0.664], [0.441, 0.666], [0.363, 0.585], [0.361, 0.557], [0.352, 0.546], [0.349, 0.529], [0.331, 0.509], [0.327, 0.394], [0.325, 0.393], [0.321, 0.487], [0.319, 0.516], [0.301, 0.533], [0.301, 0.548], [0.289, 0.558], [0.287, 0.589], [0.187, 0.695]],
  economia: [[0.569, 0.711], [0.705, 0.873], [0.712, 0.873], [0.847, 0.723], [0.85, 0.712], [0.809, 0.663], [0.808, 0.614], [0.807, 0.601], [0.795, 0.585], [0.79, 0.593], [0.71, 0.508], [0.645, 0.569], [0.639, 0.563], [0.623, 0.576], [0.623, 0.589], [0.619, 0.596], [0.615, 0.622], [0.618, 0.626], [0.618, 0.648], [0.57, 0.697]],
  seguridad: [[-0.022, 0.479], [0.11, 0.63], [0.115, 0.634], [0.12, 0.634], [0.259, 0.483], [0.262, 0.469], [0.259, 0.46], [0.234, 0.426], [0.23, 0.409], [0.223, 0.4], [0.222, 0.352], [0.137, 0.266], [0.09, 0.319], [0.088, 0.352], [-0.019, 0.464], [-0.021, 0.477]],
};

// Hitbox del Palacio Legislativo ("dato al azar") — CALIBRADA por Facundo con
// el HitboxCalibrator (tecla H): no editar a mano, recalibrar con la herramienta.
export const PALACIO_HITBOX_POLYGON: Polygon = [
  [0.377, 0.505],
  [0.517, 0.664],
  [0.523, 0.664],
  [0.526, 0.663],
  [0.662, 0.512],
  [0.661, 0.505],
  [0.65, 0.491],
  [0.648, 0.42],
  [0.647, 0.408],
  [0.641, 0.407],
  [0.52, 0.292],
  [0.458, 0.347],
  [0.449, 0.336],
  [0.424, 0.366],
  [0.422, 0.381],
  [0.391, 0.404],
  [0.391, 0.483],
];

/**
 * Punta del Palacio donde se iza la bandera de Uruguay al clickearlo.
 * PLACEHOLDER derivado del vértice más alto del hitbox calibrado — la posición
 * FINA se calibra in-app con la tecla B (FlagCalibrator, NEXT_PUBLIC_CALIBRATORS=on)
 * y se pega acá.
 */
export const PALACIO_FLAG_ANCHOR: { x: number; y: number } = { x: 0.5137, y: 0.3353 };

/**
 * Orden de apilado (z) de las capas de edificios, de abajo hacia arriba.
 * Con los edificios rediseñados el apilado importa solo en dos casos:
 *   · ECONOMÍA va arriba de todo.
 *   · el PALACIO va debajo de Economía y encima del resto.
 * Las otras cuatro no se solapan entre sí, así que su orden es indiferente.
 * El Palacio se intercala en CityLandscape entre estos dos grupos.
 */
export const BUILDING_LAYER_ORDER_BELOW_PALACIO: readonly Tematica[] = [
  'educacion',
  'salud',
  'seguridad',
  'trabajo',
] as const;

export const BUILDING_LAYER_ORDER_ABOVE_PALACIO: readonly Tematica[] = ['economia'] as const;

/** Orden completo (abajo → arriba), sin el Palacio. */
export const BUILDING_LAYER_ORDER: readonly Tematica[] = [
  ...BUILDING_LAYER_ORDER_BELOW_PALACIO,
  ...BUILDING_LAYER_ORDER_ABOVE_PALACIO,
] as const;

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
 * Rotaciones por temática (nombres exactos en disco, set corregido 2/jul/2026).
 * Las 10 hojas (color y nocolor) detectan 5 frames limpios.
 * EN USO: las versiones `nocolor` (decisión de Facundo — el ThemeOverlay usa
 * el personaje sin colorear).
 */
export const ROTATION_SPRITES: Record<Tematica, RotationVariant> = {
  educacion: {
    color: `${ROTATION_DIR}/Animación Educación Color.png`,
    nocolor: `${ROTATION_DIR}/Animación Educación.png`,
  },
  trabajo: {
    color: `${ROTATION_DIR}/Animación Trabajador Color.png`,
    nocolor: `${ROTATION_DIR}/Animación Trabajador.png`,
  },
  salud: {
    color: `${ROTATION_DIR}/Animacion Doctor Color.png`, // sin tilde en disco
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
