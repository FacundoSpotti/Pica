// ─────────────────────────────────────────────────────────────────────────────
// PICA — catálogo de datasets
// Importa todos los JSON de src/data, los valida con Zod al cargar el módulo
// (falla ruidosamente en build/dev si un dataset no cumple el schema) y expone
// el catálogo agrupado por temática. Para agregar un dataset: crear el JSON,
// importarlo acá y sumarlo a RAW_DATASETS (ver checklist en pica-data).
// ─────────────────────────────────────────────────────────────────────────────

import { parseDataset, type Dataset } from '@/schemas/base';
import type { Tematica } from '@/types/sprites';

// Educación
import nivelEducativo from '@/data/educacion/nivel-educativo.json';
import egresoMediaSuperior from '@/data/educacion/egreso-media-superior.json';
import egresoPorNivelSocioeconomico from '@/data/educacion/egreso-por-nivel-socioeconomico.json';
import asistenciaPorDepartamento from '@/data/educacion/asistencia-por-departamento.json';
// Trabajo
import empleoDesempleo from '@/data/trabajo/empleo-desempleo.json';
import salarios from '@/data/trabajo/salarios.json';
import informalidad from '@/data/trabajo/informalidad.json';
// Salud
import mortalidadInfantil from '@/data/salud/mortalidad-infantil.json';
import coberturaSalud from '@/data/salud/cobertura-salud.json';
import vacunacion from '@/data/salud/vacunacion.json';

const RAW_DATASETS: unknown[] = [
  nivelEducativo,
  egresoMediaSuperior,
  egresoPorNivelSocioeconomico,
  asistenciaPorDepartamento,
  empleoDesempleo,
  salarios,
  informalidad,
  mortalidadInfantil,
  coberturaSalud,
  vacunacion,
];

/** Todos los datasets, validados con Zod al importar el módulo. */
export const DATASETS: readonly Dataset[] = RAW_DATASETS.map(parseDataset);

/** Catálogo agrupado por temática (solo temáticas con datos). */
export const CATALOG: Partial<Record<Tematica, Dataset[]>> = DATASETS.reduce(
  (acc, d) => {
    (acc[d.tematica] ??= []).push(d);
    return acc;
  },
  {} as Partial<Record<Tematica, Dataset[]>>,
);

/** Busca un dataset por id. */
export function getDataset(id: string): Dataset | undefined {
  return DATASETS.find((d) => d.id === id);
}

/** Datasets de una temática (vacío si aún no tiene datos, ej. V2). */
export function getDatasetsByTema(tema: Tematica): Dataset[] {
  return CATALOG[tema] ?? [];
}

/** Entidades disponibles dentro de una temática (para el EntityScroller). */
export function getEntidades(tema: Tematica): string[] {
  return [...new Set(getDatasetsByTema(tema).map((d) => d.entidad))];
}

/** Datasets de una entidad dentro de una temática (para el CharacteristicExplorer). */
export function getCaracteristicas(tema: Tematica, entidad: string): Dataset[] {
  return getDatasetsByTema(tema).filter((d) => d.entidad === entidad);
}
