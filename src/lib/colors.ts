// ─────────────────────────────────────────────────────────────────────────────
// PICA — colores derivados del design system
// Deriva todo desde config/tailwind.colors.ts (única fuente de los 64 tonos)
// para no duplicar hex sueltos por el código.
// ─────────────────────────────────────────────────────────────────────────────

import { picaColors } from '../../config/tailwind.colors';
import type { Tematica } from '@/types/sprites';

/**
 * Colores disponibles para los puntos: SOLO el tono 400 (saturado e intenso)
 * de cada una de las 8 paletas. Se descartan los tonos 100 (pasteles claros).
 */
export const SPRITE_COLORS: readonly string[] = [
  picaColors.blue[400],
  picaColors.pink[400],
  picaColors.purple[400],
  picaColors.red[400],
  picaColors.yellow[400],
  picaColors.green[400],
  picaColors.cyan[400],
  picaColors.orange[400],
] as const;

/** Color pleno (tono 400) de cada temática — directo de picaColors. */
export const TEMA_COLOR: Record<Tematica, string> = {
  educacion: picaColors.blue[400], // #2B49DD
  trabajo: picaColors.yellow[400], // #FFC300
  salud: picaColors.green[400], // #A8DD2B
  economia: picaColors.orange[400], // #FF7A27
  seguridad: picaColors.red[400], // #FF4A4D
};

/** Etiqueta legible de cada temática. */
export const TEMA_LABEL: Record<Tematica, string> = {
  educacion: 'Educación',
  trabajo: 'Trabajo',
  salud: 'Salud',
  economia: 'Economía',
  seguridad: 'Seguridad',
};

/** Descripción editorial de cada temática (ThemeOverlay). */
export const TEMA_DESCRIPTION: Record<Tematica, string> = {
  educacion:
    'Del IAVA a cada aula del país: matrícula, nivel educativo alcanzado y deserción. Los datos de cómo aprende Uruguay.',
  trabajo:
    'Empleo, desempleo, salarios e informalidad. Los números detrás de cada jornada de trabajo en Uruguay.',
  salud:
    'Cobertura, vacunación y mortalidad infantil. El estado de la salud de los uruguayos, medido en datos.',
  economia:
    'Precios, ingresos y cuentas públicas. La economía uruguaya explicada con datos.',
  seguridad:
    'Delitos, denuncias y convivencia. Los datos de la seguridad en Uruguay.',
};

/**
 * Paleta de categorías para isotype charts (ref. The Pudding): tonos 400 de
 * DISTINTAS familias, curados por tema para máximo contraste entre grupos
 * vecinos (alternando matiz y luminosidad). El primer color es siempre el del
 * tema. Las tonalidades de una sola familia no contrastaban lo suficiente.
 */
export const TEMA_PALETTE: Record<Tematica, string[]> = {
  educacion: [
    picaColors.blue[400], picaColors.yellow[400], picaColors.cyan[400],
    picaColors.pink[400], picaColors.green[400], picaColors.purple[400],
    picaColors.orange[400], picaColors.blue[100],
  ],
  trabajo: [
    picaColors.yellow[400], picaColors.blue[400], picaColors.pink[400],
    picaColors.green[400], picaColors.purple[400], picaColors.cyan[400],
    picaColors.red[400], picaColors.yellow[100],
  ],
  salud: [
    picaColors.green[400], picaColors.purple[400], picaColors.cyan[400],
    picaColors.pink[400], picaColors.yellow[400], picaColors.blue[400],
    picaColors.orange[400], picaColors.green[100],
  ],
  economia: [
    picaColors.orange[400], picaColors.blue[400], picaColors.green[400],
    picaColors.pink[400], picaColors.cyan[400], picaColors.purple[400],
    picaColors.yellow[400], picaColors.orange[100],
  ],
  seguridad: [
    picaColors.red[400], picaColors.cyan[400], picaColors.yellow[400],
    picaColors.purple[400], picaColors.green[400], picaColors.pink[400],
    picaColors.blue[400], picaColors.red[100],
  ],
};

/**
 * Paleta SIN repeticiones para un visor con `n` categorías. Arranca con la
 * curada del tema (TEMA_PALETTE) y, si hacen falta más, se extiende con tonos
 * 600 (profundos), 300 (claros) y 200/500 de las 8 familias — hasta 40+
 * colores distintos que combinan entre sí. REGLA: dentro de un visor no puede
 * repetirse un color entre categorías.
 */
const FAMILIAS = ['blue', 'pink', 'purple', 'red', 'yellow', 'green', 'cyan', 'orange'] as const;
export function paletteFor(tema: Tematica, n: number): string[] {
  const base = TEMA_PALETTE[tema];
  if (n <= base.length) return [...base];
  const out = [...base];
  const seen = new Set(out.map((c) => c.toLowerCase()));
  for (const tono of [600, 300, 200, 500] as const) {
    for (const fam of FAMILIAS) {
      const c = picaColors[fam][tono];
      if (!seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
        out.push(c);
        if (out.length >= n) return out;
      }
    }
  }
  return out;
}

/**
 * Extremos de la escala de color para visualizaciones de intensidad
 * (mapa coroplético, heatmap): tono 100 (valores bajos) → 600 (valores altos).
 */
export const TEMA_SCALE: Record<Tematica, [string, string]> = {
  educacion: [picaColors.blue[100], picaColors.blue[600]],
  trabajo: [picaColors.yellow[100], picaColors.yellow[600]],
  salud: [picaColors.green[100], picaColors.green[600]],
  economia: [picaColors.orange[100], picaColors.orange[600]],
  seguridad: [picaColors.red[100], picaColors.red[600]],
};

/**
 * Color de texto legible SOBRE el tono 400 de cada temática (botón EXPLORAR).
 * El azul 400 es oscuro → texto blanco; el resto son claros → texto casi negro.
 */
export const TEMA_TEXT_ON_COLOR: Record<Tematica, string> = {
  educacion: '#FFFFFF',
  trabajo: '#0A0A0A',
  salud: '#0A0A0A',
  economia: '#0A0A0A',
  seguridad: '#0A0A0A',
};

/** Temáticas disponibles (clickeables). Las 5 están activas con datos reales. */
export const ACTIVE_TEMAS: readonly Tematica[] = [
  'educacion', 'trabajo', 'salud', 'economia', 'seguridad',
] as const;

/** Orden de las temáticas para la UI general. */
export const TEMA_ORDER: readonly Tematica[] = [
  'educacion', 'trabajo', 'salud', 'economia', 'seguridad',
] as const;

/**
 * Orden específico de la ColorBar (izquierda → derecha):
 * azul (educación) → verde (salud) → amarillo (trabajo) → rojo (seguridad, V2)
 * → naranja (economía, V2).
 */
export const COLORBAR_ORDER: readonly Tematica[] = [
  'educacion', 'salud', 'trabajo', 'seguridad', 'economia',
] as const;

/** true si la temática está activa en V1. */
export function isTemaActive(tema: Tematica): boolean {
  return ACTIVE_TEMAS.includes(tema);
}

/** Texto legible (casi negro o casi blanco) sobre un color de fondo dado. */
export function textOnColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? '#0A0A0A' : '#EBEBEB';
}
