// ─────────────────────────────────────────────────────────────────────────────
// PICA — colores derivados del design system
// Deriva todo desde config/tailwind.colors.ts (única fuente de los 64 tonos)
// para no duplicar hex sueltos por el código.
// ─────────────────────────────────────────────────────────────────────────────

import { picaColors, tematicas } from '../../config/tailwind.colors';
import type { Tematica } from '@/types/sprites';

/**
 * Los 16 colores disponibles para los sprites y puntos de colores:
 * tono 100 (claro) + 400 (pleno) de cada una de las 8 paletas.
 */
export const SPRITE_COLORS: readonly string[] = [
  picaColors.blue[100], picaColors.blue[400],
  picaColors.pink[100], picaColors.pink[400],
  picaColors.purple[100], picaColors.purple[400],
  picaColors.red[100], picaColors.red[400],
  picaColors.yellow[100], picaColors.yellow[400],
  picaColors.green[100], picaColors.green[400],
  picaColors.cyan[100], picaColors.cyan[400],
  picaColors.orange[100], picaColors.orange[400],
] as const;

/** Color pleno (tono 400) de cada temática. */
export const TEMA_COLOR: Record<Tematica, string> = {
  educacion: tematicas.educacion[400],
  trabajo: tematicas.trabajo[400],
  salud: tematicas.salud[400],
  economia: tematicas.economia[400],
  seguridad: tematicas.seguridad[400],
};

/** Etiqueta legible de cada temática. */
export const TEMA_LABEL: Record<Tematica, string> = {
  educacion: 'Educación',
  trabajo: 'Trabajo',
  salud: 'Salud',
  economia: 'Economía',
  seguridad: 'Seguridad',
};

/** Temáticas disponibles en V1 (clickeables). El resto es V2 (próximamente). */
export const ACTIVE_TEMAS: readonly Tematica[] = ['educacion', 'trabajo', 'salud'] as const;

/** Orden de las temáticas para la barra inferior y la UI. */
export const TEMA_ORDER: readonly Tematica[] = [
  'educacion', 'trabajo', 'salud', 'economia', 'seguridad',
] as const;

/** true si la temática está activa en V1. */
export function isTemaActive(tema: Tematica): boolean {
  return ACTIVE_TEMAS.includes(tema);
}
