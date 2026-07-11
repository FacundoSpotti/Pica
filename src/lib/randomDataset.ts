// ─────────────────────────────────────────────────────────────────────────────
// PICA — dato al azar (feature del Palacio Legislativo)
// Elige una estadística aleatoria del catálogo y devuelve su URL compartible.
// ─────────────────────────────────────────────────────────────────────────────

import { ACTIVE_TEMAS } from '@/lib/colors';
import { getDatasetsByTema } from '@/lib/datasets';
import { slugify } from '@/lib/slug';

/** URL de /interactivo para una estadística elegida al azar (uniforme). */
export function getRandomDatasetUrl(): string {
  const all = ACTIVE_TEMAS.flatMap((t) => getDatasetsByTema(t));
  const d = all[Math.floor(Math.random() * all.length)]!;
  return `/interactivo?tema=${d.tematica}&entidad=${slugify(d.entidad)}&caracteristica=${d.id}`;
}
