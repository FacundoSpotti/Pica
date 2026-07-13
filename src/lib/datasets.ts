// ─────────────────────────────────────────────────────────────────────────────
// PICA — catálogo de datasets (índice AUTO-GENERADO)
// Generado escaneando src/data/**/*.json. Para regenerar tras agregar datasets:
//   node scripts/gen-datasets-index.mjs
// Valida todo con Zod al cargar el módulo (falla en dev/build si algo no cumple).
// ─────────────────────────────────────────────────────────────────────────────

import { parseDataset, type Dataset } from "@/schemas/base";
import type { Tematica } from "@/types/sprites";

import economia_consumo_electrico_por_region from "@/data/economia/consumo-electrico-por-region.json";
import economia_inflacion_anual from "@/data/economia/inflacion-anual.json";
import economia_ipc_por_division from "@/data/economia/ipc-por-division.json";
import educacion_aprobacion_media_basica_por_departamento from "@/data/educacion/aprobacion-media-basica-por-departamento.json";
import educacion_aprobacion_media_superior_por_departamento from "@/data/educacion/aprobacion-media-superior-por-departamento.json";
import educacion_egresados_terciaria_por_area from "@/data/educacion/egresados-terciaria-por-area.json";
import educacion_egreso_media_superior from "@/data/educacion/egreso-media-superior.json";
import educacion_egreso_por_nivel_socioeconomico from "@/data/educacion/egreso-por-nivel-socioeconomico.json";
import educacion_matriculados_terciaria_por_area from "@/data/educacion/matriculados-terciaria-por-area.json";
import educacion_nivel_educativo from "@/data/educacion/nivel-educativo.json";
import educacion_nivel_por_generacion from "@/data/educacion/nivel-por-generacion.json";
import educacion_nivel_por_sexo from "@/data/educacion/nivel-por-sexo.json";
import educacion_sin_ciclo_basico_por_departamento from "@/data/educacion/sin-ciclo-basico-por-departamento.json";
import educacion_terciaria_por_departamento from "@/data/educacion/terciaria-por-departamento.json";
import salud_camas_por_prestador from "@/data/salud/camas-por-prestador.json";
import salud_cobertura_asse_por_departamento from "@/data/salud/cobertura-asse-por-departamento.json";
import salud_cobertura_iamc_por_departamento from "@/data/salud/cobertura-iamc-por-departamento.json";
import salud_cobertura_por_edad from "@/data/salud/cobertura-por-edad.json";
import salud_cobertura_salud from "@/data/salud/cobertura-salud.json";
import salud_consultas_por_afiliado from "@/data/salud/consultas-por-afiliado.json";
import salud_egresos_hospitalarios from "@/data/salud/egresos-hospitalarios.json";
import salud_financiamiento_salud from "@/data/salud/financiamiento-salud.json";
import salud_gasto_salud_por_habitante from "@/data/salud/gasto-salud-por-habitante.json";
import salud_medicos_por_departamento from "@/data/salud/medicos-por-departamento.json";
import salud_mortalidad_infantil from "@/data/salud/mortalidad-infantil.json";
import salud_profesionales_por_profesion from "@/data/salud/profesionales-por-profesion.json";
import salud_vacunacion from "@/data/salud/vacunacion.json";
import seguridad_fallecidos_transito_por_departamento from "@/data/seguridad/fallecidos-transito-por-departamento.json";
import seguridad_femicidios from "@/data/seguridad/femicidios.json";
import seguridad_feminicidio_arma from "@/data/seguridad/feminicidio-arma.json";
import seguridad_feminicidio_edad_victimas from "@/data/seguridad/feminicidio-edad-victimas.json";
import seguridad_feminicidio_relacion from "@/data/seguridad/feminicidio-relacion.json";
import seguridad_feminicidios_por_anio from "@/data/seguridad/feminicidios-por-anio.json";
import seguridad_feminicidios_tasa_departamento from "@/data/seguridad/feminicidios-tasa-departamento.json";
import seguridad_hurtos_por_departamento from "@/data/seguridad/hurtos-por-departamento.json";
import seguridad_procesamientos_por_delito from "@/data/seguridad/procesamientos-por-delito.json";
import seguridad_siniestros_transito from "@/data/seguridad/siniestros-transito.json";
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
import trabajo_ocupados_por_sector from "@/data/trabajo/ocupados-por-sector.json";
import trabajo_ocupados_por_tipo_ocupacion from "@/data/trabajo/ocupados-por-tipo-ocupacion.json";
import trabajo_salarios from "@/data/trabajo/salarios.json";
import trabajo_subempleo_por_categoria from "@/data/trabajo/subempleo-por-categoria.json";
import trabajo_subempleo_por_departamento from "@/data/trabajo/subempleo-por-departamento.json";
import trabajo_subempleo_por_edad from "@/data/trabajo/subempleo-por-edad.json";
import trabajo_subempleo_por_nivel_educativo from "@/data/trabajo/subempleo-por-nivel-educativo.json";
import trabajo_subempleo_por_sexo from "@/data/trabajo/subempleo-por-sexo.json";

const RAW_DATASETS: unknown[] = [
  economia_consumo_electrico_por_region,
  economia_inflacion_anual,
  economia_ipc_por_division,
  educacion_aprobacion_media_basica_por_departamento,
  educacion_aprobacion_media_superior_por_departamento,
  educacion_egresados_terciaria_por_area,
  educacion_egreso_media_superior,
  educacion_egreso_por_nivel_socioeconomico,
  educacion_matriculados_terciaria_por_area,
  educacion_nivel_educativo,
  educacion_nivel_por_generacion,
  educacion_nivel_por_sexo,
  educacion_sin_ciclo_basico_por_departamento,
  educacion_terciaria_por_departamento,
  salud_camas_por_prestador,
  salud_cobertura_asse_por_departamento,
  salud_cobertura_iamc_por_departamento,
  salud_cobertura_por_edad,
  salud_cobertura_salud,
  salud_consultas_por_afiliado,
  salud_egresos_hospitalarios,
  salud_financiamiento_salud,
  salud_gasto_salud_por_habitante,
  salud_medicos_por_departamento,
  salud_mortalidad_infantil,
  salud_profesionales_por_profesion,
  salud_vacunacion,
  seguridad_fallecidos_transito_por_departamento,
  seguridad_femicidios,
  seguridad_feminicidio_arma,
  seguridad_feminicidio_edad_victimas,
  seguridad_feminicidio_relacion,
  seguridad_feminicidios_por_anio,
  seguridad_feminicidios_tasa_departamento,
  seguridad_hurtos_por_departamento,
  seguridad_procesamientos_por_delito,
  seguridad_siniestros_transito,
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
  trabajo_ocupados_por_sector,
  trabajo_ocupados_por_tipo_ocupacion,
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
