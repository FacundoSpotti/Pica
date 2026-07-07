// Auditoría de integridad de los datos (TAREA 8).
// Chequea, sobre TODOS los datasets: fuente/URL/año, unidades, sumas coherentes,
// completitud espacial, rangos plausibles y consistencia. Imprime un reporte.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/data';
const DEPTS = 19;
// Dominios oficiales: INE, portal del Estado (gub.uy cubre MSP, Min. Interior,
// MIDES, BCU…) e INEEd (evaluación educativa).
const OK_HOSTS = ['ine.gub.uy', 'gub.uy', 'ineed.edu.uy'];

const findings = []; // {sev: 'ERROR'|'WARN'|'INFO', id, msg}
const add = (sev, id, msg) => findings.push({ sev, id, msg });

function loadAll() {
  const out = [];
  for (const tema of readdirSync(ROOT)) {
    const dir = join(ROOT, tema);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      out.push({ file: `${tema}/${f}`, d: JSON.parse(readFileSync(join(dir, f), 'utf8')) });
    }
  }
  return out;
}

const datasets = loadAll();

for (const { d } of datasets) {
  const id = d.id;

  // ── Fuente / URL / año ──────────────────────────────────────────────────
  if (!d.fuente || d.fuente.trim().length < 8) add('ERROR', id, 'fuente ausente o muy corta');
  if (!d.fuenteUrl) add('WARN', id, 'sin fuenteUrl');
  else {
    try {
      const host = new URL(d.fuenteUrl).hostname.replace(/^www\./, '');
      if (!OK_HOSTS.some((h) => host === h || host.endsWith('.' + h) || host.endsWith(h)))
        add('WARN', id, `fuenteUrl no es de un dominio oficial conocido: ${host}`);
    } catch {
      add('ERROR', id, `fuenteUrl inválida: ${d.fuenteUrl}`);
    }
  }
  if (!Number.isInteger(d.anio) || d.anio < 2000 || d.anio > 2026)
    add('ERROR', id, `anio fuera de rango: ${d.anio}`);
  if (!d.descripcion || d.descripcion.length < 15) add('WARN', id, 'descripción muy corta');
  // Paréntesis sin cerrar / descripción truncada
  if ((d.descripcion.match(/\(/g) || []).length !== (d.descripcion.match(/\)/g) || []).length)
    add('WARN', id, 'descripción con paréntesis sin cerrar (posible truncado)');

  // ── Marcas de dato provisorio/inventado (términos específicos) ──────────
  if (/inventad|provisori|placeholder|estimado a ojo|\bFIXME\b/i.test(JSON.stringify(d)))
    add('ERROR', id, 'contiene marca de dato provisorio/inventado');

  // ── Por tipo ────────────────────────────────────────────────────────────
  const pct = d.unidad === '%';
  if (d.tipoResultado === 'A') {
    if (typeof d.valor !== 'number') add('ERROR', id, 'A sin valor numérico');
    if (pct && (d.valor < 0 || d.valor > 100)) add('WARN', id, `A % fuera de 0-100: ${d.valor}`);
  }
  if (d.tipoResultado === 'B') {
    const vals = d.categorias.map((c) => c.valor);
    if (vals.some((v) => typeof v !== 'number')) add('ERROR', id, 'B con valor no numérico');
    const sum = vals.reduce((a, b) => a + b, 0);
    // Distribución (parte de un todo) → debería sumar ~100. Se excluyen las
    // TASAS y los índices/precios (cada categoría es un valor independiente).
    const esTasaOIndice = /tasa|por sexo|por edad|por nivel|informalidad|desempleo|subempleo|actividad|empleo|inflaci|ipc|precio|rubro|variaci/i.test(
      `${d.entidad} ${d.caracteristica} ${id}`,
    );
    if (pct && !esTasaOIndice && Math.abs(sum - 100) > 3)
      add('WARN', id, `distribución % no suma 100 (suma ${sum.toFixed(1)})`);
    if (pct && vals.some((v) => v < -50 || v > 100)) add('WARN', id, 'B % con valor extremo');
  }
  if (d.tipoResultado === 'C') {
    if (!Array.isArray(d.puntos) || d.puntos.length < 2) add('ERROR', id, 'C con menos de 2 puntos');
    const per = d.puntos.map((p) => p.periodo);
    if (new Set(per).size !== per.length) add('WARN', id, 'C con períodos repetidos');
  }
  if (d.tipoResultado === 'D' && pct) {
    // Solo si la matriz ES una distribución (la primera fila suma ~100); si es
    // una matriz de TASAS (filas no suman 100), no aplica el chequeo.
    const firstSum = d.valores[0].reduce((a, b) => a + b, 0);
    const esDistribucion = Math.abs(firstSum - 100) <= 5;
    if (esDistribucion)
      d.valores.forEach((fila, i) => {
        const s = fila.reduce((a, b) => a + b, 0);
        if (Math.abs(s - 100) > 3) add('WARN', id, `D fila "${d.filas[i]}" suma ${s.toFixed(1)}% (no 100)`);
      });
  }
  if (d.tipoResultado === 'E') {
    const ids = d.departamentos.map((x) => x.id);
    if (ids.length !== DEPTS) add('ERROR', id, `E con ${ids.length} departamentos (esperados ${DEPTS})`);
    if (new Set(ids).size !== ids.length) add('ERROR', id, 'E con departamentos repetidos');
    const vals = d.departamentos.map((x) => x.valor);
    if (vals.some((v) => typeof v !== 'number' || v < 0)) add('WARN', id, 'E con valor negativo o no numérico');
    if (pct && vals.some((v) => v > 100)) add('WARN', id, 'E % > 100');
  }
}

// ── Consistencia entre datasets: mismo id no puede repetirse ──────────────
const byId = {};
for (const { file, d } of datasets) (byId[d.id] ??= []).push(file);
for (const [id, files] of Object.entries(byId))
  if (files.length > 1) add('ERROR', id, `id duplicado en: ${files.join(', ')}`);

// ── Reporte ───────────────────────────────────────────────────────────────
const bySev = (s) => findings.filter((f) => f.sev === s);
const order = { ERROR: 0, WARN: 1, INFO: 2 };
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.id.localeCompare(b.id));
console.log(`\nAuditoría de datos — ${datasets.length} datasets\n${'='.repeat(50)}`);
console.log(`ERROR: ${bySev('ERROR').length} · WARN: ${bySev('WARN').length} · INFO: ${bySev('INFO').length}\n`);
for (const f of findings) console.log(`[${f.sev}] ${f.id}: ${f.msg}`);
if (!findings.length) console.log('Sin observaciones. ✓');
process.exit(bySev('ERROR').length ? 1 : 0);
