// ─────────────────────────────────────────────────────────────────────────────
// PICA — validador de datasets (dev)
// Recorre src/data/**/*.json y valida cada archivo contra los schemas Zod.
// Uso:  node --experimental-strip-types scripts/validate-data.mts
// ─────────────────────────────────────────────────────────────────────────────

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDataset } from '../src/schemas/base.ts';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

const files = walk('src/data');
let errors = 0;
const ids = new Set<string>();

for (const file of files) {
  try {
    const dataset = parseDataset(JSON.parse(readFileSync(file, 'utf8')));
    if (ids.has(dataset.id)) throw new Error(`id duplicado: '${dataset.id}'`);
    ids.add(dataset.id);

    // Aviso (no error): distribuciones en % deberían sumar ~100
    let warn = '';
    if (dataset.tipoResultado === 'B' && dataset.unidad === '%') {
      const sum = dataset.categorias.reduce((a, c) => a + c.valor, 0);
      if (Math.abs(sum - 100) > 0.5) warn = `  ⚠ las categorías suman ${sum.toFixed(1)}%`;
    }
    console.log(`✓ ${file}  [${dataset.tipoResultado}] ${dataset.id}${warn}`);
  } catch (e) {
    errors++;
    console.error(`✗ ${file}\n  ${e instanceof Error ? e.message : String(e)}`);
  }
}

console.log(`\n${files.length} datasets, ${errors} con errores`);
if (errors > 0) process.exit(1);
