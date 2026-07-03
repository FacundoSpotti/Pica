// ─────────────────────────────────────────────────────────────────────────────
// PICA — tipos de la capa de datos
// Re-exporta los tipos inferidos de los schemas Zod (src/schemas/base.ts),
// que son la única fuente de verdad de la forma de los datasets.
// ─────────────────────────────────────────────────────────────────────────────

export type {
  Dataset,
  DatasetEscalar,
  DatasetDistribucion,
  DatasetSerie,
  DatasetMatriz,
  DatasetEspacial,
  DepartamentoId,
  TipoResultado,
} from '@/schemas/base';
