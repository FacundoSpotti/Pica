// ─────────────────────────────────────────────────────────────────────────────
// PICA — schemas Zod de la capa de datos (ver pica-data)
// Taxonomía: Entidad × Característica → Tipo de Resultado (A-E).
// Cada schema se exporta como valor (Zod) y como tipo (z.infer) con el mismo
// nombre, así se puede importar de las dos formas.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import type { Tematica as TematicaType } from '@/types/sprites';

export const TipoResultado = z.enum(['A', 'B', 'C', 'D', 'E']);
export type TipoResultado = z.infer<typeof TipoResultado>;

export const Tematica = z.enum(['educacion', 'trabajo', 'salud', 'economia', 'seguridad']);
export type Tematica = z.infer<typeof Tematica>;

// Chequeo estático: el enum Zod debe coincidir con el tipo de types/sprites.ts
const _tematicaCheck: TematicaType extends Tematica ? true : never = true;
void _tematicaCheck;

/** Campos que todo dataset debe cumplir. */
export const DatasetBase = z.object({
  /** kebab-case, ej: 'nivel-educativo' */
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id debe ser kebab-case'),
  tematica: Tematica,
  /** ej: 'Personas', 'Departamentos' */
  entidad: z.string().min(1),
  /** ej: 'Máximo nivel educativo alcanzado' */
  caracteristica: z.string().min(1),
  tipoResultado: TipoResultado,
  /** ej: 'INE — ECH 2024' (organismo + año del dato, siempre) */
  fuente: z.string().min(1),
  /** URL exacta de la fuente (publicación oficial, PDF o página del organismo) */
  fuenteUrl: z.string().url().optional(),
  anio: z.number().int().min(1900).max(2100),
  descripcion: z.string().min(1),
  /** ej: '%', 'personas', '$UYU' */
  unidad: z.string().optional(),
  /**
   * Población de referencia para convertir porcentajes/tasas a números
   * absolutos (ej: 8,2% de 1.760.000 activos ≈ 144.000 desocupados).
   * `label` es el sustantivo del RESULTADO ('personas desocupadas').
   */
  base: z
    .object({
      valor: z.number().positive(),
      label: z.string().min(1),
      fuente: z.string().optional(),
    })
    .optional(),
});

// ── Tipo A — Resultado Escalar ───────────────────────────────────────────────
export const DatasetEscalar = DatasetBase.extend({
  tipoResultado: z.literal('A'),
  valor: z.number(),
  /** cambio respecto al período anterior */
  variacion: z
    .object({
      valor: z.number(),
      periodo: z.string(),
    })
    .optional(),
  /** texto breve de interpretación */
  contexto: z.string().optional(),
});
export type DatasetEscalar = z.infer<typeof DatasetEscalar>;

// ── Tipo B — Distribución Categórica ─────────────────────────────────────────
export const DatasetDistribucion = DatasetBase.extend({
  tipoResultado: z.literal('B'),
  categorias: z
    .array(
      z.object({
        label: z.string().min(1),
        valor: z.number(),
        color: z.string().optional(),
      }),
    )
    .min(2),
});
export type DatasetDistribucion = z.infer<typeof DatasetDistribucion>;

// ── Tipo C — Serie Temporal ──────────────────────────────────────────────────
export const DatasetSerie = DatasetBase.extend({
  tipoResultado: z.literal('C'),
  puntos: z
    .array(
      z.object({
        /** ej: '2010', '2023-Q1' */
        periodo: z.string().min(1),
        valor: z.number(),
        label: z.string().optional(),
      }),
    )
    .min(2),
});
export type DatasetSerie = z.infer<typeof DatasetSerie>;

// ── Tipo D — Matriz Comparativa ──────────────────────────────────────────────
export const DatasetMatriz = DatasetBase.extend({
  tipoResultado: z.literal('D'),
  filas: z.array(z.string().min(1)).min(1),
  columnas: z.array(z.string().min(1)).min(1),
  /** matriz[fila][columna] — la consistencia filas×columnas se valida en checkMatriz */
  valores: z.array(z.array(z.number())),
});
export type DatasetMatriz = z.infer<typeof DatasetMatriz>;

/**
 * Chequeo extra para Tipo D (no entra en la unión discriminada porque
 * discriminatedUnion exige objetos Zod puros): valores debe medir filas × columnas.
 */
export function checkMatriz(d: DatasetMatriz): void {
  const ok =
    d.valores.length === d.filas.length &&
    d.valores.every((fila) => fila.length === d.columnas.length);
  if (!ok) {
    throw new Error(
      `Dataset '${d.id}': valores debe ser una matriz de ${d.filas.length}×${d.columnas.length}`,
    );
  }
}

// ── Tipo E — Datos Espaciales ────────────────────────────────────────────────

/** Códigos ISO 3166-2 de los 19 departamentos de Uruguay. */
export const DepartamentoId = z.enum([
  'UY-AR', 'UY-CA', 'UY-CL', 'UY-CO', 'UY-DU', 'UY-FS', 'UY-FD', 'UY-LA',
  'UY-MA', 'UY-MO', 'UY-PA', 'UY-RN', 'UY-RV', 'UY-RO', 'UY-SA', 'UY-SJ',
  'UY-SO', 'UY-TA', 'UY-TT',
]);
export type DepartamentoId = z.infer<typeof DepartamentoId>;

export const DatasetEspacial = DatasetBase.extend({
  tipoResultado: z.literal('E'),
  departamentos: z
    .array(
      z.object({
        id: DepartamentoId,
        nombre: z.string().min(1),
        valor: z.number(),
      }),
    )
    .min(1),
});
export type DatasetEspacial = z.infer<typeof DatasetEspacial>;

// ── Unión discriminada — cualquier dataset válido ────────────────────────────
export const DatasetSchema = z.discriminatedUnion('tipoResultado', [
  DatasetEscalar,
  DatasetDistribucion,
  DatasetSerie,
  DatasetMatriz,
  DatasetEspacial,
]);
export type Dataset = z.infer<typeof DatasetSchema>;

/** Valida un dato crudo contra el schema + chequeos extra por tipo. */
export function parseDataset(raw: unknown): Dataset {
  const d = DatasetSchema.parse(raw);
  if (d.tipoResultado === 'D') checkMatriz(d);
  return d;
}
