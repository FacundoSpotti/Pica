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
export const CITY_LAMPS: ReadonlyArray<readonly [number, number]> = [
  [0.6849, 0.8108], [0.7366, 0.8108], [0.7758, 0.7687], [0.8135, 0.7267], [0.8283, 0.6623],
  [0.6464, 0.7648], [0.6087, 0.7214], [0.5887, 0.6623], [0.6952, 0.4179], [0.7226, 0.4113],
  [0.7462, 0.3798], [0.778, 0.3482], [0.8032, 0.318], [0.8313, 0.2878], [0.6804, 0.3982],
  [0.6627, 0.3837], [0.6035, 0.3127], [0.5836, 0.2904], [0.5695, 0.2694], [0.568, 0.2418],
  [0.5917, 0.2221], [0.3432, 0.8095], [0.375, 0.7753], [0.4105, 0.7332], [0.4379, 0.7043],
  [0.4216, 0.6386], [0.3883, 0.6058], [0.2264, 0.7214], [0.1983, 0.6702], [0.2212, 0.636],
  [0.2538, 0.6045], [0.2685, 0.7674], [0.2996, 0.8042], [0.2323, 0.4862], [0.2552, 0.4534],
  [0.2412, 0.4087], [0.1746, 0.544], [0.1473, 0.5742], [0.1155, 0.5887], [0.0792, 0.3495],
  [0.0216, 0.4862], [0.3721, 0.3403], [0.4053, 0.3022], [0.4297, 0.2773], [0.4416, 0.2418],
  [0.3454, 0.364], [0.3307, 0.3863], [0.2974, 0.3771], [0.2412, 0.3127], [0.202, 0.2628],
];

/**
 * Chimeneas / respiraderos de donde sale humo, en fracciones del stage.
 * Calibradas con el LampCalibrator (tecla L, capa chimeneas).
 */
export const CITY_CHIMNEYS: ReadonlyArray<readonly [number, number]> = [
  [0.3262, 0.0118], [0.6827, 0.2076], [0.6331, 0.1459], [0.7292, 0.2576], [0.8002, 0.1827],
  [0.6982, 0.0788],
];

/**
 * Manzanas vacías: los huecos que dejan las calles donde TODAVÍA no hay
 * temática. Se marcan con un rombo punteado y un cartel de "próximamente" para
 * contar que Pica sigue creciendo. Centro del rombo, en fracciones del stage.
 * Calibrados con el LampCalibrator (tecla L, modo manzanas) — no editar a mano.
 */
export const FUTURE_BLOCKS: ReadonlyArray<readonly [number, number]> = [
  [0.8912, 0.4954], [1.079, 0.2681], [1.0975, 0.724], [0.9112, 0.9501], [0.52, 0.9146],
  [0.1125, 0.9304], [-0.0975, 0.7148], [-0.0805, 0.2326], [0.1236, 0.0381], [0.5141, 0.0578],
  [0.889, 0.0762],
];

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
  educacion: [[0.558, 0.281], [0.656, 0.398], [0.695, 0.443], [0.704, 0.449], [0.709, 0.449], [0.842, 0.3], [0.843, 0.286], [0.837, 0.271], [0.834, 0.259], [0.828, 0.261], [0.821, 0.243], [0.821, 0.214], [0.754, 0.142], [0.754, 0.124], [0.751, 0.117], [0.751, 0.097], [0.745, 0.081], [0.741, 0.058], [0.737, 0.079], [0.732, 0.091], [0.731, 0.117], [0.73, 0.121], [0.701, 0.091], [0.698, 0.088], [0.609, 0.18], [0.607, 0.209], [0.56, 0.263], [0.556, 0.275]],
  salud: [[0.195, 0.292], [0.311, 0.43], [0.315, 0.432], [0.321, 0.431], [0.329, 0.428], [0.461, 0.28], [0.459, 0.268], [0.418, 0.225], [0.416, 0.075], [0.394, 0.051], [0.392, 0.035], [0.377, 0.025], [0.359, 0.043], [0.35, 0.034], [0.34, 0.022], [0.334, 0.028], [0.328, 0.012], [0.321, 0.039], [0.308, 0.051], [0.31, 0.079], [0.286, 0.105], [0.273, 0.097], [0.257, 0.117], [0.256, 0.213], [0.23, 0.242], [0.22, 0.238], [0.215, 0.255], [0.203, 0.269], [0.195, 0.279]],
  trabajo: [[0.181, 0.704], [0.314, 0.859], [0.323, 0.865], [0.326, 0.862], [0.465, 0.708], [0.465, 0.698], [0.46, 0.689], [0.359, 0.58], [0.357, 0.552], [0.348, 0.543], [0.345, 0.523], [0.329, 0.506], [0.323, 0.389], [0.32, 0.388], [0.314, 0.505], [0.297, 0.524], [0.293, 0.54], [0.285, 0.551], [0.283, 0.582], [0.226, 0.639], [0.183, 0.689], [0.18, 0.7]],
  economia: [[0.569, 0.711], [0.705, 0.873], [0.712, 0.873], [0.847, 0.723], [0.85, 0.712], [0.809, 0.663], [0.808, 0.614], [0.807, 0.601], [0.795, 0.585], [0.79, 0.593], [0.71, 0.508], [0.645, 0.569], [0.639, 0.563], [0.623, 0.576], [0.623, 0.589], [0.619, 0.596], [0.615, 0.622], [0.618, 0.626], [0.618, 0.648], [0.57, 0.697]],
  seguridad: [[-0.013, 0.489], [0.053, 0.565], [0.11, 0.633], [0.12, 0.641], [0.126, 0.644], [0.267, 0.489], [0.268, 0.474], [0.265, 0.461], [0.24, 0.43], [0.238, 0.415], [0.229, 0.409], [0.228, 0.361], [0.145, 0.273], [0.097, 0.322], [0.095, 0.36], [0.059, 0.393], [0.047, 0.377], [0.039, 0.402], [0.039, 0.414], [0.036, 0.418], [0.027, 0.398], [0.019, 0.417], [0.016, 0.44], [0.013, 0.44], [0.004, 0.428], [-0.006, 0.46], [-0.015, 0.473]],
};

// Hitbox del Palacio Legislativo ("dato al azar") — CALIBRADA por Facundo con
// el HitboxCalibrator (tecla H): no editar a mano, recalibrar con la herramienta.
export const PALACIO_HITBOX_POLYGON: Polygon = [
  [0.374, 0.498],
  [0.504, 0.643],
  [0.514, 0.653],
  [0.521, 0.653],
  [0.656, 0.503],
  [0.659, 0.494],
  [0.643, 0.481],
  [0.644, 0.409],
  [0.606, 0.368],
  [0.59, 0.352],
  [0.585, 0.352],
  [0.569, 0.338],
  [0.561, 0.327],
  [0.515, 0.277],
  [0.467, 0.332],
  [0.462, 0.346],
  [0.445, 0.331],
  [0.418, 0.359],
  [0.419, 0.368],
  [0.388, 0.402],
  [0.386, 0.472],
  [0.377, 0.482],
  [0.374, 0.491],
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

/**
 * Faroles y chimeneas de un edificio, en coordenadas LOCALES de su sprite
 * (0–1 sobre el propio recorte) en vez de coordenadas del stage.
 *
 * Se derivan de la misma calibración que usa el desktop: se toman los puntos que
 * caen dentro del emplazamiento del edificio y se los reproyecta. Así el
 * carrusel mobile —donde el sprite se muestra suelto, a otra escala y en otra
 * posición— hereda las luces y el humo sin calibrar nada aparte.
 */
function toLocal(
  pts: ReadonlyArray<readonly [number, number]>,
  key: Tematica | 'palacio',
): Array<readonly [number, number]> {
  const p = BUILDING_PLACEMENT[key];
  return pts
    .filter(
      ([x, y]) =>
        x >= p.left && x <= p.left + p.width && y >= p.top && y <= p.top + p.height,
    )
    .map(([x, y]) => [(x - p.left) / p.width, (y - p.top) / p.height] as const);
}

/**
 * Faroles del edificio. NO alcanza con filtrar por el rectángulo del sprite: los
 * edificios altos (la torre de Trabajo) tienen un bbox que se estira hacia
 * arriba y se come faroles de las manzanas vecinas, que después aparecen
 * flotando en el cielo. Los faroles están sobre el PLINTO, así que el filtro
 * correcto es el rombo de base.
 */
/**
 * Ventanas de cada edificio, en fracciones (0–1) de su propio sprite.
 *
 * DETECTADAS DEL ARTE, no puestas a mano: se buscan los vidrios (teal oscuro) y
 * los huecos oscuros sobre fachada clara —lo que distingue una ventana de una
 * sombra cualquiera—, se descarta el anillo exterior del rombo de base (ahí está
 * la reja, no ventanas) y se submuestrea. Regenerable con el bloque de detección
 * de scripts/pixelate-buildings.py.
 *
 * WindowTwinkles las usa para encender lucecitas cálidas en ventanas REALES; antes
 * dispersaba puntos al azar dentro de la hitbox y caían en techos y jardines.
 */
export const BUILDING_WINDOWS: Record<Tematica | 'palacio', ReadonlyArray<readonly [number, number]>> = {
  educacion: [[0.4981, 0.2379], [0.4607, 0.2718], [0.5206, 0.2864], [0.5543, 0.3107], [0.5955, 0.3447], [0.6479, 0.3495], [0.3558, 0.3592], [0.4682, 0.3835], [0.5468, 0.3883], [0.3408, 0.3932], [0.2996, 0.4078], [0.2921, 0.4272], [0.5543, 0.4272], [0.3296, 0.432], [0.5318, 0.4466], [0.3371, 0.466], [0.5094, 0.466], [0.6742, 0.4709], [0.2509, 0.4806], [0.2996, 0.5049], [0.4195, 0.5049], [0.6292, 0.5049], [0.7266, 0.5146], [0.8727, 0.5388], [0.3633, 0.5437], [0.794, 0.5437], [0.2434, 0.5534], [0.2697, 0.568], [0.4382, 0.5825], [0.5843, 0.5825], [0.8165, 0.5825], [0.6217, 0.5971], [0.382, 0.6165], [0.3146, 0.6214], [0.5094, 0.6214], [0.7715, 0.6214], [0.6217, 0.6311], [0.2322, 0.6602], [0.397, 0.6602], [0.5393, 0.6602], [0.6404, 0.665], [0.2996, 0.699], [0.5468, 0.699], [0.3146, 0.7379]],
  trabajo: [[0.4717, 0.4073], [0.4528, 0.4194], [0.4377, 0.4234], [0.4189, 0.4516], [0.4528, 0.4516], [0.3925, 0.4839], [0.4642, 0.4839], [0.6604, 0.5], [0.4491, 0.5161], [0.6226, 0.5242], [0.3774, 0.5323], [0.7321, 0.5444], [0.3925, 0.5484], [0.4491, 0.5524], [0.2226, 0.5726], [0.2189, 0.5806], [0.4491, 0.5806], [0.5698, 0.5806], [0.7849, 0.5806], [0.6075, 0.5847], [0.6566, 0.5927], [0.2755, 0.6089], [0.2491, 0.6129], [0.4642, 0.6129], [0.7547, 0.6129], [0.2226, 0.621], [0.5925, 0.625], [0.6642, 0.625], [0.2981, 0.6452], [0.3321, 0.6452], [0.5925, 0.6452], [0.7094, 0.6452], [0.2679, 0.6532], [0.5547, 0.6573], [0.3623, 0.6653], [0.2528, 0.6774], [0.3774, 0.6774], [0.6377, 0.6774], [0.5132, 0.6815], [0.3925, 0.6855], [0.4226, 0.7056], [0.3925, 0.7097], [0.5736, 0.7097], [0.5698, 0.7137]],
  salud: [[0.4829, 0.3574], [0.5133, 0.3787], [0.4373, 0.4085], [0.3916, 0.4128], [0.4373, 0.4426], [0.4829, 0.4511], [0.3118, 0.4638], [0.4525, 0.4766], [0.5894, 0.4766], [0.6464, 0.4851], [0.251, 0.5106], [0.3916, 0.5106], [0.4943, 0.5106], [0.6464, 0.5106], [0.2319, 0.5447], [0.3384, 0.5447], [0.5551, 0.5447], [0.635, 0.5489], [0.4563, 0.566], [0.2357, 0.5787], [0.3422, 0.5787], [0.4829, 0.5787], [0.692, 0.5787], [0.5399, 0.5872], [0.1521, 0.6128], [0.2852, 0.6128], [0.3954, 0.6128], [0.5437, 0.6128], [0.7985, 0.6128], [0.2129, 0.6468], [0.3916, 0.6468], [0.5095, 0.6468], [0.6654, 0.6511], [0.5932, 0.6766], [0.346, 0.6809], [0.597, 0.6809], [0.308, 0.6851], [0.2091, 0.7149], [0.327, 0.7149], [0.4335, 0.7149], [0.5399, 0.7191], [0.27, 0.7489], [0.3764, 0.7489], [0.4753, 0.7617]],
  economia: [[0.4361, 0.2974], [0.4549, 0.3128], [0.594, 0.3282], [0.3647, 0.3436], [0.3271, 0.359], [0.3271, 0.3692], [0.3947, 0.3692], [0.5451, 0.3692], [0.2932, 0.3897], [0.3308, 0.4103], [0.4286, 0.4103], [0.2857, 0.4308], [0.5789, 0.4359], [0.5113, 0.4462], [0.2857, 0.4513], [0.4398, 0.4513], [0.5414, 0.4513], [0.5752, 0.4564], [0.7895, 0.4821], [0.2444, 0.4923], [0.4135, 0.4923], [0.5075, 0.4923], [0.3571, 0.4974], [0.1767, 0.5128], [0.1955, 0.5333], [0.4173, 0.5333], [0.4925, 0.5333], [0.2932, 0.559], [0.1391, 0.5744], [0.2782, 0.5744], [0.4549, 0.5795], [0.4962, 0.5846], [0.3722, 0.6051], [0.2707, 0.6154], [0.4135, 0.6154], [0.5301, 0.6154], [0.2744, 0.6564], [0.3722, 0.6564], [0.4549, 0.6564], [0.2744, 0.6974], [0.3647, 0.6974], [0.4549, 0.6974], [0.5414, 0.7333], [0.4323, 0.7385]],
  seguridad: [[0.4813, 0.2132], [0.4776, 0.2437], [0.5672, 0.2741], [0.5075, 0.2843], [0.597, 0.2995], [0.4888, 0.3249], [0.597, 0.3249], [0.3507, 0.3604], [0.4179, 0.3655], [0.5373, 0.3655], [0.6567, 0.3655], [0.7164, 0.401], [0.4216, 0.4061], [0.5373, 0.4061], [0.2799, 0.4112], [0.2537, 0.4467], [0.5, 0.4467], [0.7313, 0.4467], [0.4104, 0.4772], [0.2799, 0.4873], [0.4291, 0.4873], [0.5933, 0.4873], [0.7761, 0.4873], [0.3582, 0.5076], [0.1455, 0.5228], [0.2799, 0.5279], [0.5075, 0.5279], [0.7463, 0.5279], [0.6493, 0.533], [0.4216, 0.5533], [0.2537, 0.5685], [0.3582, 0.5685], [0.4963, 0.5685], [0.6157, 0.5685], [0.7761, 0.5685], [0.2463, 0.6091], [0.3582, 0.6091], [0.4776, 0.6091], [0.597, 0.6091], [0.2948, 0.6497], [0.4179, 0.6497], [0.5373, 0.6497], [0.6866, 0.6497], [0.3582, 0.6904]],
  palacio: [[0.4983, 0.2533], [0.505, 0.28], [0.4114, 0.32], [0.5753, 0.32], [0.5351, 0.3511], [0.5117, 0.36], [0.6589, 0.3733], [0.4983, 0.4], [0.5151, 0.4044], [0.3211, 0.44], [0.3445, 0.4444], [0.7224, 0.4489], [0.5886, 0.4533], [0.2475, 0.48], [0.4615, 0.48], [0.7057, 0.48], [0.3478, 0.4844], [0.8127, 0.5067], [0.3378, 0.52], [0.1672, 0.5244], [0.8328, 0.5244], [0.1371, 0.5467], [0.2943, 0.56], [0.4247, 0.56], [0.2542, 0.5644], [0.1237, 0.5822], [0.7793, 0.5911], [0.2542, 0.6], [0.4214, 0.6], [0.6589, 0.6], [0.3779, 0.6089], [0.3144, 0.6311], [0.214, 0.64], [0.3344, 0.64], [0.4849, 0.64], [0.6054, 0.64], [0.7793, 0.6444], [0.2843, 0.68], [0.4214, 0.68], [0.5418, 0.68], [0.301, 0.6933], [0.3512, 0.72], [0.5151, 0.72], [0.5552, 0.7289]],
};

export function lampsForBuilding(key: Tematica | 'palacio') {
  const f = BUILDING_FOOTPRINT[key];
  const hh = f.bottomY - f.groundY;
  return toLocal(CITY_LAMPS, key).filter(([u, v]) => {
    // Punto dentro del rombo: |Δu|/semiancho + |Δv|/semialto ≤ 1. Se deja un
    // poco de holgura (1.06) porque las farolas van justo sobre el borde.
    const du = Math.abs(u - f.bottomX) / 0.5;
    const dv = Math.abs(v - f.groundY) / hh;
    return du + dv <= 1.06;
  });
}

/** Chimeneas: van en los TECHOS, o sea por encima del rombo — filtro por el
 *  rectángulo del sprite, que para ellas sí alcanza. */
export function chimneysForBuilding(key: Tematica | 'palacio') {
  return toLocal(CITY_CHIMNEYS, key);
}

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
