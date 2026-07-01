// ─────────────────────────────────────────────────────────────────────────────
// PICA — Tipos del sistema de sprites e interacción del Home
// Fuente de rutas: src/lib/assets.ts (nunca hardcodear rutas fuera de ahí).
// ─────────────────────────────────────────────────────────────────────────────

/** Las 5 temáticas del proyecto. V1: educación, trabajo, salud. V2: economía, seguridad. */
export type Tematica =
  | 'educacion'
  | 'trabajo'
  | 'salud'
  | 'economia'
  | 'seguridad';

// ── Sprites de personas (Home Canvas) ────────────────────────────────────────

/**
 * Configuración de un spritesheet de persona (68×172px).
 * Grilla 4×4: 4 columnas (frames) × 4 filas (idle-frente, walk-frente,
 * idle-espalda, walk-espalda). Ver pica-home.
 */
export interface SpriteConfig {
  /** id único, ej: 'm-01', 'w-03', 'cm-02' */
  id: string;
  /** ruta al PNG (desde assets.ts, ya lista para usar) */
  src: string;
  /** ancho de un frame en px (17) */
  frameWidth: number;
  /** alto de un frame en px (43) */
  frameHeight: number;
  /** cantidad de frames de la animación de caminar (4) */
  walkFrames: number;
  /** cantidad de frames de la animación idle (2) */
  idleFrames: number;
}

/** Dirección hacia la que mira/camina una persona. */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** Estado de animación de una persona. */
export type PersonaAnimState = 'idle' | 'walk';

/**
 * Instancia viva de una persona dentro del Canvas del Home.
 * Es el "entity" que la simulación actualiza en cada tick.
 */
export interface PersonaEntity {
  /** id del SpriteConfig que usa */
  spriteId: string;
  /** posición actual en el canvas */
  x: number;
  y: number;
  /** velocidad por tick */
  vx: number;
  vy: number;
  /** color aplicado por palette swap (uno de los 16 de la paleta) */
  color: string;
  /** dirección actual */
  direction: Direction;
  /** idle o walk */
  animState: PersonaAnimState;
  /** frame actual dentro de la animación */
  frame: number;
  /** acumulador de tiempo para avanzar de frame */
  frameTimer: number;
  /** temática asignada (para el reagrupamiento), si corresponde */
  tema?: Tematica;
  /** destino de lerp durante el reagrupamiento */
  targetX?: number;
  targetY?: number;
}

// ── Puntos de colores (Home — reemplaza walking sprites) ─────────────────────

/**
 * Fase de un punto de color.
 * - moving:     recorre su calle normalmente
 * - converging: camina por su calle hacia el punto más cercano al edificio
 * - arriving:   salto final corto desde la calle hacia el edificio
 * - arrived:    llegó
 */
export type DotPhase = 'moving' | 'converging' | 'arriving' | 'arrived';

/** Punto de color (2-3px) que recorre las calles del landscape. */
export interface ColorDot {
  x: number;
  y: number;
  /** índice del path de calle que sigue */
  pathIndex: number;
  /** progreso 0-1 dentro del path */
  progress: number;
  /** px por tick */
  speed: number;
  /** uno de los 16 colores de la paleta de sprites */
  color: string;
  /** radio en px (2 o 3) */
  radius: number;
  /** fase de movimiento/convergencia */
  phase: DotPhase;
  /** progreso objetivo en el path durante la convergencia (punto más cercano al edificio) */
  convergeProgress?: number;
}

// ── Landscape / edificios ────────────────────────────────────────────────────

/** Rectángulo clickeable, en píxeles del canvas original (4096×2305). */
export interface PixelHitbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Zona clickeable de un edificio sobre el landscape. */
export interface BuildingZone {
  tema: Tematica;
  label: string;
  /** capa PNG del edificio (color) que se muestra al seleccionar */
  layerSrc: string;
  /** color de la temática (tono 400) */
  color: string;
  /** hitbox en px del canvas 4096×2305 */
  hitbox: PixelHitbox;
  /** true en V1 (educación, trabajo, salud); false en V2 */
  active: boolean;
}

// ── Sprites de rotación 360° (ThemeCard / ThemeOverlay) ──────────────────────

/**
 * Resultado de buildRotationSheet: una hoja normalizada con celdas uniformes
 * lista para animar por backgroundPosition o drawImage.
 */
export interface RotationSheet {
  /** canvas con `frameCount` celdas de `frameWidth`×`frameHeight` en una fila */
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /** ancho de cada celda uniforme */
  frameWidth: number;
  /** alto de cada celda uniforme */
  frameHeight: number;
  /** total de frames (8 para una rotación 360° completa) */
  frameCount: number;
}
