// ─────────────────────────────────────────────────────────────────────────────
// PICA — catálogo de datasets (índice AUTO-GENERADO)
// Generado escaneando src/data/**/*.json. Para regenerar tras agregar datasets:
//   node scripts/gen-datasets-index.mjs
// Valida todo con Zod al cargar el módulo (falla en dev/build si algo no cumple).
// ─────────────────────────────────────────────────────────────────────────────

import { parseDataset, type Dataset } from "@/schemas/base";
import type { Tematica } from "@/types/sprites";

import educacion_asistencia_por_departamento from "@/data/educacion/asistencia-por-departamento.json";
import educacion_egreso_media_superior from "@/data/educacion/egreso-media-superior.json";
import educacion_egreso_por_nivel_socioeconomico from "@/data/educacion/egreso-por-nivel-socioeconomico.json";
import educacion_nivel_educativo from "@/data/educacion/nivel-educativo.json";
import salud_cobertura_salud from "@/data/salud/cobertura-salud.json";
import salud_mortalidad_infantil from "@/data/salud/mortalidad-infantil.json";
import salud_vacunacion from "@/data/salud/vacunacion.json";
import trabajo_actividad_por_departamento from "@/data/trabajo/actividad-por-departamento.json";
import trabajo_actividad_por_edad from "@/data/trabajo/actividad-por-edad.json";
import trabajo_actividad_por_nivel_educativo from "@/data/trabajo/actividad-por-nivel-educativo.json";
import trabajo_actividad_por_sexo from "@/data/trabajo/actividad-por-sexo.json";
import trabajo_desempleo_por_departamento from "@/data/trabajo/desempleo-por-departamento.json";
import trabajo_desempleo_por_edad from "@/data/trabajo/desempleo-por-edad.json";
import trabajo_desempleo_por_nivel_educativo from "@/data/trabajo/desempleo-por-nivel-educativo.json";
import trabajo_desempleo_por_sexo from "@/data/trabajo/desempleo-por-sexo.json";
import trabajo_desempleo_sexo_edad from "@/data/trabajo/desempleo-sexo-edad.json";
import trabajo_empleo_por_departamento from "@/data/trabajo/empleo-por-departamento.json";
import trabajo_empleo_por_edad from "@/data/trabajo/empleo-por-edad.json";
import trabajo_empleo_por_nivel_educativo from "@/data/trabajo/empleo-por-nivel-educativo.json";
import trabajo_empleo_por_sexo from "@/data/trabajo/empleo-por-sexo.json";
import trabajo_informalidad_por_categoria from "@/data/trabajo/informalidad-por-categoria.json";
import trabajo_informalidad_por_departamento from "@/data/trabajo/informalidad-por-departamento.json";
import trabajo_informalidad_por_edad from "@/data/trabajo/informalidad-por-edad.json";
import trabajo_informalidad_por_nivel_educativo from "@/data/trabajo/informalidad-por-nivel-educativo.json";
import trabajo_informalidad_por_sexo from "@/data/trabajo/informalidad-por-sexo.json";
import trabajo_informalidad_sexo_nivel from "@/data/trabajo/informalidad-sexo-nivel.json";
import trabajo_ocupados_por_categoria from "@/data/trabajo/ocupados-por-categoria.json";
import trabajo_salarios from "@/data/trabajo/salarios.json";
import trabajo_subempleo_por_categoria from "@/data/trabajo/subempleo-por-categoria.json";
import trabajo_subempleo_por_departamento from "@/data/trabajo/subempleo-por-departamento.json";
import trabajo_subempleo_por_edad from "@/data/trabajo/subempleo-por-edad.json";
import trabajo_subempleo_por_nivel_educativo from "@/data/trabajo/subempleo-por-nivel-educativo.json";
import trabajo_subempleo_por_sexo from "@/data/trabajo/subempleo-por-sexo.json";

const RAW_DATASETS: unknown[] = [
  educacion_asistencia_por_departamento,
  educacion_egreso_media_superior,
  educacion_egreso_por_nivel_socioeconomico,
  educacion_nivel_educativo,
  salud_cobertura_salud,
  salud_mortalidad_infantil,
  salud_vacunacion,
  trabajo_actividad_por_departamento,
  trabajo_actividad_por_edad,
  trabajo_actividad_por_nivel_educativo,
  trabajo_actividad_por_sexo,
  trabajo_desempleo_por_departamento,
  trabajo_desempleo_por_edad,
  trabajo_desempleo_por_nivel_educativo,
  trabajo_desempleo_por_sexo,
  trabajo_desempleo_sexo_edad,
  trabajo_empleo_por_departamento,
  trabajo_empleo_por_edad,
  trabajo_empleo_por_nivel_educativo,
  trabajo_empleo_por_sexo,
  trabajo_informalidad_por_categoria,
  trabajo_informalidad_por_departamento,
  trabajo_informalidad_por_edad,
  trabajo_informalidad_por_nivel_educativo,
  trabajo_informalidad_por_sexo,
  trabajo_informalidad_sexo_nivel,
  trabajo_ocupados_por_categoria,
  trabajo_salarios,
  trabajo_subempleo_por_categoria,
  trabajo_subempleo_por_departamento,
  trabajo_subempleo_por_edad,
  trabajo_subempleo_por_nivel_educativo,
  trabajo_subempleo_por_sexo,
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

export function getDataset(id: string): Dataset | undefined {
  return DATASETS.find((d) => d.id === id);
}
export function getDatasetsByTema(tema: Tematica): Dataset[] {
  return CATALOG[tema] ?? [];
}
export function getEntidades(tema: Tematica): string[] {
  return [...new Set(getDatasetsByTema(tema).map((d) => d.entidad))];
}
export function getCaracteristicas(tema: Tematica, entidad: string): Dataset[] {
  return getDatasetsByTema(tema).filter((d) => d.entidad === entidad);
}
