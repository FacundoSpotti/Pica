// ─────────────────────────────────────────────────────────────────────────────
// PICA — chatCatalog (SOLO servidor: lo importa /api/chat)
// El proxy estudiantil limita el prompt a 4.000 caracteres → no entra el
// catálogo completo. Estrategia RAG-lite SIN llamadas extra:
//   1. retrieve(pregunta): matching de términos normalizados (sin LLM) elige
//      los datasets más relevantes.
//   2. datasetBlock(d): bloque compacto con los VALORES REALES del dataset
//      (regla de oro: el bot solo puede citar números presentes en el prompt)
//      y su link interno exacto (/interactivo?...).
//   3. TEMARIO: fallback mínimo (temas + entidades) cuando nada matchea.
// ─────────────────────────────────────────────────────────────────────────────

import { DATASETS } from '@/lib/datasets';
import { slugify } from '@/lib/slug';
import { TEMA_LABEL } from '@/lib/colors';
import type { Dataset } from '@/types/data';

const fmt = (n: number): string =>
  n.toLocaleString('es-UY', { maximumFractionDigits: 1 });

/** Normaliza para matching: minúsculas, sin tildes, sin signos. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ');
}

/** Sinónimos frecuentes → término canónico presente en los datasets. */
const SINONIMOS: Record<string, string[]> = {
  trabajo: ['empleo', 'laboral', 'trabajar', 'ocupacion', 'ocupados', 'desempleo', 'desocupacion', 'sueldo', 'sueldos'],
  salario: ['sueldo', 'sueldos', 'ingreso', 'ingresos', 'salarios', 'gana', 'ganan', 'cobra', 'cobran'],
  educacion: ['escuela', 'liceo', 'estudio', 'estudios', 'educativo', 'educativa', 'universidad', 'universitaria', 'terciaria', 'estudiantes', 'matricula', 'egreso', 'egresados'],
  salud: ['medico', 'medicos', 'hospital', 'mutualista', 'prestador', 'enfermedad', 'vacuna', 'vacunas'],
  economia: ['precio', 'precios', 'inflacion', 'ipc', 'pib', 'energia', 'consumo'],
  seguridad: ['delito', 'delitos', 'crimen', 'hurto', 'hurtos', 'rapiña', 'rapina', 'homicidio', 'homicidios', 'violencia'],
  feminicidio: ['femicidio', 'femicidios', 'feminicidios'],
  fallecido: ['muerte', 'muertes', 'muertos', 'mortalidad', 'fallecidos', 'fallecimiento'],
  transito: ['siniestro', 'siniestros', 'accidente', 'accidentes', 'choque', 'choques'],
  departamento: ['departamentos', 'montevideo', 'interior', 'canelones'],
  niño: ['niños', 'ninos', 'nino', 'infantil', 'bebe', 'bebes'],
};

/** Expande la consulta con los canónicos de sus sinónimos. */
function expand(tokens: string[]): Set<string> {
  const out = new Set(tokens);
  for (const t of tokens) {
    for (const [canon, syns] of Object.entries(SINONIMOS)) {
      if (t === canon || syns.includes(t)) {
        out.add(canon);
        out.add(norm(canon).trim());
      }
    }
  }
  return out;
}

const STOPWORDS = new Set(
  'el la los las un una unos unas de del en y o a que cual cuales como cuanto cuanta cuantos cuantas donde quien es son esta estan hay tiene tienen por para con mas menos mayor menor sobre entre año años me te se lo al'.split(' '),
);

interface IndexEntry {
  d: Dataset;
  /** términos del dataset, ya normalizados, con pesos */
  campos: { texto: string; peso: number }[];
}

let index: IndexEntry[] | null = null;

function buildIndex(): IndexEntry[] {
  if (index) return index;
  index = DATASETS.map((d) => {
    const etiquetas =
      d.tipoResultado === 'B'
        ? d.categorias.map((c) => c.label).join(' ')
        : d.tipoResultado === 'E'
          ? d.departamentos.map((x) => x.nombre).join(' ')
          : d.tipoResultado === 'D'
            ? [...d.filas, ...d.columnas].join(' ')
            : '';
    return {
      d,
      campos: [
        { texto: norm(d.caracteristica), peso: 4 },
        { texto: norm(d.entidad), peso: 3 },
        { texto: norm(`${d.tematica} ${TEMA_LABEL[d.tematica]}`), peso: 3 },
        { texto: norm(d.descripcion), peso: 1 },
        { texto: norm(etiquetas), peso: 1 },
      ],
    };
  });
  return index;
}

/** Los datasets más relevantes para la consulta (score > 0), mejor primero. */
export function retrieve(query: string, n = 3): Dataset[] {
  const tokens = [...expand(norm(query).split(/\s+/).filter((t) => t.length > 2 && !STOPWORDS.has(t)))];
  if (tokens.length === 0) return [];
  const scored = buildIndex()
    .map((e) => {
      let score = 0;
      for (const t of tokens) {
        for (const c of e.campos) {
          if (c.texto.includes(t)) score += c.peso;
        }
      }
      return { d: e.d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((x) => x.d);
}

/** URL interna exacta de un dataset. */
export function datasetUrl(d: Dataset): string {
  return `/interactivo?tema=${d.tematica}&entidad=${slugify(d.entidad)}&caracteristica=${d.id}`;
}

/** Datos del dataset en una línea compacta (capada) según su tipo. */
function datos(d: Dataset): string {
  switch (d.tipoResultado) {
    case 'A': {
      const unidad = d.unidad === '%' ? '%' : d.unidad ? ` ${d.unidad}` : '';
      const variacion = d.variacion
        ? ` · variación: ${d.variacion.valor > 0 ? '+' : ''}${fmt(d.variacion.valor)} vs ${d.variacion.periodo}`
        : '';
      return `valor: ${fmt(d.valor)}${unidad}${variacion}`;
    }
    case 'B':
      return `categorías: ${d.categorias.map((c) => `${c.label} ${fmt(c.valor)}`).join(' · ')}`;
    case 'C': {
      const pts = d.puntos;
      const shown = pts.length > 9 ? [...pts.slice(0, 2), null, ...pts.slice(-6)] : pts;
      const linea = shown.map((p) => (p ? `${p.periodo}: ${fmt(p.valor)}` : '…')).join(' · ');
      return `serie ${pts[0]!.periodo} a ${pts[pts.length - 1]!.periodo}: ${linea}`;
    }
    case 'D': {
      const filas = d.filas.map(
        (f, i) => `${f} → ${d.columnas.map((c, j) => `${c}: ${fmt(d.valores[i]![j]!)}`).join(', ')}`,
      );
      return `matriz: ${filas.join(' | ')}`;
    }
    case 'E': {
      const orden = [...d.departamentos].sort((a, b) => b.valor - a.valor);
      return `por departamento (mayor a menor): ${orden.map((x) => `${x.nombre} ${fmt(x.valor)}`).join(' · ')}`;
    }
  }
}

/** Bloque de contexto de un dataset (≤ ~700 chars) para el prompt. */
export function datasetBlock(d: Dataset): string {
  const bloque = [
    `· ${TEMA_LABEL[d.tematica]} — ${d.entidad} — ${d.caracteristica} (${d.anio}, ${d.fuente}${d.unidad ? `, en ${d.unidad}` : ''})`,
    `  ${datos(d)}`,
    `  link: ${datasetUrl(d)}`,
  ].join('\n');
  return bloque.length > 700 ? `${bloque.slice(0, 680)}…\n  link: ${datasetUrl(d)}` : bloque;
}

/** Fallback cuando nada matchea: qué temas y entidades existen. */
let temarioCache: string | null = null;

export function temario(): string {
  if (temarioCache) return temarioCache;
  const porTema = new Map<string, Set<string>>();
  for (const d of DATASETS) {
    const key = TEMA_LABEL[d.tematica];
    if (!porTema.has(key)) porTema.set(key, new Set());
    porTema.get(key)!.add(d.entidad);
  }
  temarioCache = [...porTema.entries()]
    .map(([tema, entidades]) => `${tema}: ${[...entidades].join(', ')}`)
    .join(' | ');
  return temarioCache;
}
