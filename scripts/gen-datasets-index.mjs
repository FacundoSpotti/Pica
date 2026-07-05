// ─────────────────────────────────────────────────────────────────────────────
// PICA — regenera src/lib/datasets.ts escaneando src/data/**/*.json
// Uso: node scripts/gen-datasets-index.mjs
// Correr tras agregar/quitar datasets. Mantiene imports estáticos (bundling Next).
// ─────────────────────────────────────────────────────────────────────────────

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'src/data';
const themes = readdirSync(root).filter((d) => statSync(join(root, d)).isDirectory());
const imports = [];
const names = [];
for (const th of themes) {
  const files = readdirSync(join(root, th)).filter((x) => x.endsWith('.json')).sort();
  for (const f of files) {
    const varName = `${th}_${f.replace('.json', '')}`.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^(\d)/, '_$1');
    imports.push(`import ${varName} from "@/data/${th}/${f}";`);
    names.push(varName);
  }
}

const out = `// ─────────────────────────────────────────────────────────────────────────────
// PICA — catálogo de datasets (índice AUTO-GENERADO)
// Generado escaneando src/data/**/*.json. Para regenerar tras agregar datasets:
//   node scripts/gen-datasets-index.mjs
// Valida todo con Zod al cargar el módulo (falla en dev/build si algo no cumple).
// ─────────────────────────────────────────────────────────────────────────────

import { parseDataset, type Dataset } from "@/schemas/base";
import type { Tematica } from "@/types/sprites";

${imports.join('\n')}

const RAW_DATASETS: unknown[] = [
${names.map((n) => `  ${n},`).join('\n')}
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
`;
writeFileSync('src/lib/datasets.ts', out);
console.log(`datasets.ts regenerado con ${names.length} datasets`);
