// ─────────────────────────────────────────────────────────────────────────────
// PICA — Generador de datasets FASE 2 (18 datasets desde 13 cuadros del
// Anuario Estadístico Nacional 2025 del INE).
// REGLA DE ORO: cada número sale de una CELDA REAL del cuadro (lookup por
// etiqueta, no por índice frágil) o de una suma aritmética de celdas reales
// declarada en la descripción. Aserciones de consistencia donde el cuadro
// trae totales. Uso: node scripts/gen-datos-fase2.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import xlsx from 'xlsx';

const SRC = 'anexos/datos-fuente/datos_INE_2025';
const OUT = 'src/data';

// ── Helpers ──────────────────────────────────────────────────────────────────

function rows(file, sheetName) {
  const wb = xlsx.readFile(join(SRC, file));
  const name = sheetName ?? wb.SheetNames[0];
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`${file}: no existe la hoja '${name}' (hay: ${wb.SheetNames})`);
  return xlsx.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
}

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Fila cuyo label (col 0 por defecto) empieza con `prefix` (normalizado). */
function findRow(rs, prefix, col = 0, from = 0) {
  const p = norm(prefix);
  const idx = rs.findIndex((r, i) => i >= from && norm(r?.[col]).startsWith(p));
  if (idx === -1) throw new Error(`no encontré la fila '${prefix}'`);
  return { row: rs[idx], idx };
}

/** Columna del header `hr` cuyo valor es el año buscado. */
function colOfYear(hr, year) {
  const c = hr.findIndex((v) => v === year || norm(v) === String(year));
  if (c === -1) throw new Error(`no encontré el año ${year} en el header`);
  return c;
}

function num(v, ctx) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`valor no numérico en ${ctx}: ${v}`);
  return v;
}

const int = (v, ctx) => Math.round(num(v, ctx));
const dec1 = (v, ctx) => Math.round(num(v, ctx) * 10) / 10;

function assertClose(a, b, tolPct, ctx) {
  const tol = Math.abs(b) * tolPct;
  if (Math.abs(a - b) > tol) throw new Error(`ASERCIÓN FALLÓ (${ctx}): ${a} vs ${b}`);
}

function save(tema, data) {
  mkdirSync(join(OUT, tema), { recursive: true });
  const path = join(OUT, tema, `${data.id}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  ✓ ${path}`);
}

/** nombre de departamento → ISO 3166-2 (mismo orden que el enum Zod). */
const DEPTS = {
  'artigas': 'UY-AR', 'canelones': 'UY-CA', 'cerro largo': 'UY-CL', 'colonia': 'UY-CO',
  'durazno': 'UY-DU', 'flores': 'UY-FS', 'florida': 'UY-FD', 'lavalleja': 'UY-LA',
  'maldonado': 'UY-MA', 'montevideo': 'UY-MO', 'paysandú': 'UY-PA', 'río negro': 'UY-RN',
  'rivera': 'UY-RV', 'rocha': 'UY-RO', 'salto': 'UY-SA', 'san josé': 'UY-SJ',
  'soriano': 'UY-SO', 'tacuarembó': 'UY-TA', 'treinta y tres': 'UY-TT',
};

/** Extrae los 19 departamentos de un cuadro (col label + col valor). */
function extractDepts(rs, valueCol, from = 0) {
  const out = [];
  for (let i = from; i < rs.length; i++) {
    const label = norm(rs[i]?.[0]);
    const iso = DEPTS[label];
    if (iso && !out.some((d) => d.id === iso)) {
      out.push({ id: iso, nombre: String(rs[i][0]).trim(), valor: int(rs[i][valueCol], `${label}`) });
    }
  }
  if (out.length !== 19) throw new Error(`esperaba 19 departamentos, hay ${out.length}`);
  return out;
}

const FUENTE = (cuadro, org) => `INE — Anuario Estadístico Nacional 2025, cuadro ${cuadro} (fuente ${org})`;

// ═══ SALUD ═══════════════════════════════════════════════════════════════════

function vih() {
  const serie = rows('cap3_aspectos_sociales/3.2.6ok.xls', 'Serie histórica');
  const hr = serie[2];
  const total = findRow(serie, 'total').row;
  const puntos = [];
  for (let y = 2016; y <= 2024; y++) puntos.push({ periodo: String(y), valor: int(total[colOfYear(hr, y)], `vih ${y}`) });
  save('salud', {
    id: 'vih-diagnosticos-por-anio', tematica: 'salud', entidad: 'Personas',
    caracteristica: 'Nuevos diagnósticos de VIH', tipoResultado: 'C', personas: true,
    fuente: FUENTE('3.2.6', 'MSP'), anio: 2024, unidad: 'personas',
    descripcion: 'Personas con nuevo diagnóstico de VIH notificado por año, total país. Un diagnóstico temprano permite tratamiento oportuno: hoy una persona con VIH en tratamiento puede tener carga viral indetectable e intransmisible.',
    puntos,
  });

  const cuadro = rows('cap3_aspectos_sociales/3.2.6ok.xls', '3.2.6');
  const col = colOfYear(cuadro[3], 2024);
  const departamentos = extractDepts(cuadro, col);
  const suma = departamentos.reduce((a, d) => a + d.valor, 0);
  assertClose(suma, int(findRow(cuadro, 'total').row[col], 'vih total'), 0.001, 'VIH deptos vs total');
  save('salud', {
    id: 'vih-por-departamento', tematica: 'salud', entidad: 'Departamentos',
    caracteristica: 'Nuevos diagnósticos de VIH', tipoResultado: 'E', personas: true,
    fuente: FUENTE('3.2.6', 'MSP'), anio: 2024, unidad: 'personas',
    descripcion: 'Personas con nuevo diagnóstico de VIH notificado durante 2024, por departamento de residencia.',
    departamentos,
  });
}

function suicidios() {
  const DESC_LINEA = 'Si vos o alguien que conocés está pasando un momento difícil, la Línea de Prevención del Suicidio atiende las 24 horas: 0800 0767 (*0767 desde el celular).';
  const serie = rows('cap3_aspectos_sociales/3.2.7ok.xls', 'Serie histórica');
  const hr = serie[2];
  const total = findRow(serie, 'total').row;
  const puntos = [];
  for (let y = 2016; y <= 2024; y++) puntos.push({ periodo: String(y), valor: int(total[colOfYear(hr, y)], `suicidios ${y}`) });
  save('salud', {
    id: 'suicidios-por-anio', tematica: 'salud', entidad: 'Personas',
    caracteristica: 'Muertes por suicidio', tipoResultado: 'C', personas: true,
    fuente: FUENTE('3.2.7', 'MSP'), anio: 2024, unidad: 'personas',
    descripcion: `Personas fallecidas por suicidio por año, total país. ${DESC_LINEA}`,
    puntos,
  });

  const cuadro = rows('cap3_aspectos_sociales/3.2.7ok.xls', '3.2.7');
  const col = colOfYear(cuadro[3], 2024);
  const departamentos = extractDepts(cuadro, col);
  save('salud', {
    id: 'suicidios-por-departamento', tematica: 'salud', entidad: 'Departamentos',
    caracteristica: 'Muertes por suicidio', tipoResultado: 'E', personas: true,
    fuente: FUENTE('3.2.7', 'MSP'), anio: 2024, unidad: 'personas',
    descripcion: `Personas fallecidas por suicidio durante 2024, por departamento de residencia. ${DESC_LINEA}`,
    departamentos,
  });
}

// ═══ EDUCACIÓN ═══════════════════════════════════════════════════════════════

function estudiantes() {
  // 3.1.1 Inicial (2023): DGEIP púb + DGEIP priv + INAU + Centros Primera Infancia
  const ini = rows('cap3_aspectos_sociales/3.1.1ok.xlsx', '3.1.1');
  const y23 = findRow(ini, '2023').idx;
  const iniTotal = findRow(ini, 'total país', 0, y23).row;
  const inicial = int(iniTotal[2], 'ini púb') + int(iniTotal[5], 'ini priv') + int(iniTotal[8], 'ini inau') + int(iniTotal[11], 'ini cpi');

  // 3.1.2 Primaria (2023): Total País, col Estudiantes del bloque 2023
  const pri = rows('cap3_aspectos_sociales/3.1.2ok.xls', '3.1.2');
  const priTotalRow = findRow(pri, 'total país').row;
  const primaria = int(priTotalRow[3], 'primaria total');
  const primariaPub = int(findRow(pri, 'pública').row[3], 'primaria púb');
  const primariaPriv = int(findRow(pri, 'privada').row[3], 'primaria priv');
  assertClose(primariaPub + primariaPriv, primaria, 0.001, 'primaria púb+priv');

  // 3.1.5 Media básica (2023): General púb/priv + Vocacional púb/priv (Total País)
  const mb = rows('cap3_aspectos_sociales/3.1.5ok.xls', '3.1.5');
  const mb23 = findRow(mb, '2023').idx;
  const mbTotal = findRow(mb, 'total país', 0, mb23).row;
  const mbPub = int(mbTotal[2], 'mb gen púb') + int(mbTotal[8], 'mb voc púb');
  const mbPriv = int(mbTotal[5], 'mb gen priv') + int(mbTotal[11], 'mb voc priv');

  // 3.1.10 Media superior (2023): Hombres+Mujeres × General/Vocacional × púb/priv
  const ms = rows('cap3_aspectos_sociales/3.1.10ok.xls', '3.1.10');
  const ms23 = findRow(ms, '2023').idx;
  const msTotal = findRow(ms, 'total país', 0, ms23).row;
  const msPub = int(msTotal[1], '') + int(msTotal[2], '') + int(msTotal[7], '') + int(msTotal[8], '');
  const msPriv = int(msTotal[4], '') + int(msTotal[5], '') + int(msTotal[10], '') + int(msTotal[11], '');

  save('educacion', {
    id: 'estudiantes-por-nivel', tematica: 'educacion', entidad: 'Estudiantes',
    caracteristica: 'Estudiantes por nivel educativo', tipoResultado: 'B', personas: true,
    fuente: FUENTE('3.1.1, 3.1.2, 3.1.5 y 3.1.10', 'MEC'), anio: 2023, unidad: 'estudiantes',
    descripcion: 'Estudiantes matriculados en 2023 por nivel: Inicial suma DGEIP pública y privada, INAU y Centros de Primera Infancia; Media básica y superior suman modalidad General y Vocacional, públicas y privadas (celdas de los cuadros citados).',
    categorias: [
      { label: 'Educación inicial', valor: inicial },
      { label: 'Primaria', valor: primaria },
      { label: 'Media básica', valor: mbPub + mbPriv },
      { label: 'Media superior', valor: msPub + msPriv },
    ],
  });

  save('educacion', {
    id: 'estudiantes-publico-privado', tematica: 'educacion', entidad: 'Estudiantes',
    caracteristica: 'Educación pública vs privada', tipoResultado: 'D', personas: true,
    fuente: FUENTE('3.1.2, 3.1.5 y 3.1.10', 'MEC'), anio: 2023,
    unidad: 'estudiantes',
    descripcion: 'Estudiantes matriculados en 2023 según forma de administración. Media básica y superior suman las modalidades General y Vocacional de los cuadros citados.',
    filas: ['Primaria', 'Media básica', 'Media superior'],
    columnas: ['Pública', 'Privada'],
    valores: [
      [primariaPub, primariaPriv],
      [mbPub, mbPriv],
      [msPub, msPriv],
    ],
  });
}

// ═══ SEGURIDAD ═══════════════════════════════════════════════════════════════

function denuncias() {
  // D: Total País por tipo × año — serie histórica (2017-2022) + hoja principal (2023-2024)
  const serie = rows('cap3_aspectos_sociales/3.6.13ok.xls', 'Serie Histórica');
  const years = [];
  const hr = serie[3];
  for (let c = 0; c < hr.length; c++) if (typeof hr[c] === 'number' && hr[c] >= 2000) years.push({ y: hr[c], c });
  const totalSerie = findRow(serie, 'total país').row;
  const main = rows('cap3_aspectos_sociales/3.6.13ok.xls', '3.6.13');
  const mainHr = main[2];
  const totalMain = findRow(main, 'total país').row;
  const mainYears = [];
  for (let c = 0; c < mainHr.length; c++) if (typeof mainHr[c] === 'number' && mainHr[c] >= 2000) mainYears.push({ y: mainHr[c], c });

  const cols = [...years.map(({ y, c }) => ({ y, src: totalSerie, c })), ...mainYears.filter(({ y }) => !years.some((x) => x.y === y)).map(({ y, c }) => ({ y, src: totalMain, c }))].sort((a, b) => a.y - b.y);
  const valores = [0, 1, 2].map((off) => cols.map(({ src, c, y }) => int(src[c + off], `denuncias ${y}+${off}`)));

  save('seguridad', {
    id: 'denuncias-propiedad-por-tipo', tematica: 'seguridad', entidad: 'Delitos',
    caracteristica: 'Denuncias contra la propiedad', tipoResultado: 'D',
    fuente: FUENTE('3.6.13', 'Ministerio del Interior'), anio: 2024, unidad: 'denuncias',
    descripcion: 'Denuncias de delitos consumados contra la propiedad por tipo y año, total país.',
    filas: ['Hurtos', 'Rapiñas', 'Daños'],
    columnas: cols.map(({ y }) => String(y)),
    valores,
  });

  // E: rapiñas por departamento, 2024 (col Rapiñas del bloque 2024)
  const c2024 = colOfYear(mainHr, 2024);
  const departamentos = extractDepts(main, c2024 + 1);
  const suma = departamentos.reduce((a, d) => a + d.valor, 0);
  assertClose(suma, int(totalMain[c2024 + 1], 'rapiñas total'), 0.001, 'rapiñas deptos vs total');
  save('seguridad', {
    id: 'rapinas-por-departamento', tematica: 'seguridad', entidad: 'Departamentos',
    caracteristica: 'Denuncias de rapiñas', tipoResultado: 'E',
    fuente: FUENTE('3.6.13', 'Ministerio del Interior'), anio: 2024, unidad: 'denuncias',
    descripcion: 'Denuncias de rapiñas (delitos consumados) durante 2024, por departamento.',
    departamentos,
  });
}

// ═══ ECONOMÍA ════════════════════════════════════════════════════════════════

function visitantes() {
  const rs = rows('cap4_sectores_economicos/4.8.1ok.xls', '4.8.1');
  const labels = ['Uruguayos', 'Argentinos', 'Brasileños', 'Paraguayos', 'Chilenos', 'Norteamericanos', 'Resto de América', 'Europa', 'Otros - sin datos'];
  const categorias = labels.map((l) => ({
    label: l === 'Otros - sin datos' ? 'Otros / sin datos' : l,
    valor: int(findRow(rs, l).row[1], l),
  }));
  const suma = categorias.reduce((a, c) => a + c.valor, 0);
  assertClose(suma, int(findRow(rs, 'total').row[1], 'visitantes total'), 0.001, 'visitantes vs total');
  save('economia', {
    id: 'visitantes-por-nacionalidad', tematica: 'economia', entidad: 'Visitantes',
    caracteristica: 'Visitantes por nacionalidad', tipoResultado: 'B', personas: true,
    fuente: FUENTE('4.8.1', 'Ministerio de Turismo'), anio: 2024, unidad: 'visitantes',
    descripcion: 'Visitantes ingresados a Uruguay durante 2024 según nacionalidad. Incluye a los uruguayos residentes en el exterior que visitan el país.',
    categorias,
  });

  const mot = rows('cap4_sectores_economicos/4.8.2ok.xls', '4.8.2');
  const hr = mot[2];
  const anios = [2022, 2023, 2024];
  const motivos = ['Visita a familiares o amigos', 'Recreativo - paseo', 'Negocios y motivos profesion', 'Congreso, seminario, estudio', 'Salud', 'Tránsito', 'Otros - sin Datos'];
  const filasLabels = ['Familiares o amigos', 'Recreación y paseo', 'Negocios y trabajo', 'Congresos y estudio', 'Salud', 'Tránsito', 'Otros / sin datos'];
  const valores = motivos.map((m) => anios.map((y) => int(findRow(mot, m).row[colOfYear(hr, y)], `${m} ${y}`)));
  save('economia', {
    id: 'visitantes-por-motivo', tematica: 'economia', entidad: 'Visitantes',
    caracteristica: 'Motivo de la visita', tipoResultado: 'D', personas: true,
    fuente: FUENTE('4.8.2', 'Ministerio de Turismo'), anio: 2024, unidad: 'visitantes',
    descripcion: 'Visitantes ingresados a Uruguay por año según el motivo declarado del viaje.',
    filas: filasLabels,
    columnas: anios.map(String),
    valores,
  });
}

function pib() {
  const rs = rows('cap8_cuentas_nacionales/8.1.3ok.xls', '8.1.3');
  const hr = rs[2];
  const col = hr.findIndex((v) => norm(v).startsWith('2024'));
  if (col === -1) throw new Error('PIB: no encontré 2024');
  const pibTotal = int(findRow(rs, 'producto interno bruto').row[col], 'PIB total');
  // 10 industrias: filas con código CIIU en col 0 y nombre en col 1
  const industrias = [];
  for (const r of rs) {
    if (r?.[1] && typeof r[col] === 'number' && r[0] && norm(r[0]) !== '' && !norm(r[0]).startsWith('producto') && !norm(r[0]).startsWith('fuente') && !norm(r[0]).startsWith('nota') && !norm(r[0]).startsWith('ciiu')) {
      industrias.push({ label: String(r[1]).trim().replace(/\s+/g, ' '), valor: int(r[col], r[1]) });
    }
  }
  if (industrias.length !== 10) throw new Error(`PIB: esperaba 10 industrias, hay ${industrias.length}`);
  const sumaInd = industrias.reduce((a, c) => a + c.valor, 0);
  // Dos filas restantes: una es el VA (≈ suma industrias), la otra impuestos netos
  const resto = rs.filter((r) => r?.[0] && typeof r[col] === 'number' && !r[1] && !norm(r[0]).startsWith('producto'));
  if (resto.length !== 2) throw new Error(`PIB: esperaba 2 filas de cierre, hay ${resto.length}`);
  const [a, b] = resto.map((r) => int(r[col], r[0]));
  const impuestosNetos = Math.abs(sumaInd - a) < Math.abs(sumaInd - b) ? b : a;
  assertClose(sumaInd + impuestosNetos, pibTotal, 0.01, 'PIB = industrias + impuestos netos');
  save('economia', {
    id: 'pib-por-industria', tematica: 'economia', entidad: 'Producción nacional',
    caracteristica: 'PIB por industria', tipoResultado: 'B', presentacion: 'lista',
    fuente: FUENTE('8.1.3', 'BCU'), anio: 2024, unidad: 'millones de pesos',
    descripcion: `Producto Interno Bruto 2024 por industria, a precios corrientes (total: ${pibTotal.toLocaleString('es-UY')} millones de pesos). "Impuestos menos subvenciones" completa el PIB junto al valor agregado de las industrias.`,
    categorias: [...industrias, { label: 'Impuestos menos subvenciones', valor: impuestosNetos }],
  });
}

function ipcRegiones() {
  const mvd = rows('cap9_precios/9.1.3ok.xlsx');
  const intr = rows('cap9_precios/9.1.4ok.xlsx');
  const filas = [];
  const valores = [];
  const hrM = mvd[3];
  const colM = colOfYear(hrM, 2024);
  const colI = colOfYear(intr[3], 2024);
  // Matching por CÓDIGO de división ('01'…'13') — las etiquetas difieren en
  // tildes entre los dos archivos. El código a veces viene como número (13).
  const code = (v) => String(v ?? '').replace(/^0+/, '').trim();
  for (const r of mvd) {
    if (r?.[1] && typeof r[colM] === 'number' && r[0] !== null && code(r[0]) !== '' && !Number.isNaN(Number(code(r[0])))) {
      const division = String(r[1]).trim().replace(/\s+/g, ' ');
      const ri = intr.find((x) => x?.[1] && typeof x[colI] === 'number' && code(x[0]) === code(r[0]));
      if (!ri) throw new Error(`IPC: división código '${code(r[0])}' no está en Interior`);
      filas.push(division);
      valores.push([dec1(r[colM], division), dec1(ri[colI], division)]);
    }
  }
  if (filas.length !== 13) throw new Error(`IPC: esperaba 13 divisiones, hay ${filas.length}`);
  save('economia', {
    id: 'ipc-montevideo-interior', tematica: 'economia', entidad: 'Precios',
    caracteristica: 'Inflación: Montevideo vs Interior', tipoResultado: 'D',
    fuente: FUENTE('9.1.3 y 9.1.4', 'INE'), anio: 2024, unidad: '%',
    descripcion: 'Variación anual 2024 del Índice de Precios del Consumo por división de gasto, comparando Montevideo y el Interior del país. Base octubre 2022 = 100.',
    filas,
    columnas: ['Montevideo', 'Interior'],
    valores,
  });
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

function combustibles() {
  const rs = rows('cap9_precios/9.1.8ok.xls');
  const puntos = [];
  for (const r of rs) {
    if (typeof r?.[0] === 'number' && r[0] > 40000 && typeof r?.[1] === 'number') {
      // serial Excel → fecha (base 1899-12-30)
      const d = new Date(Date.UTC(1899, 11, 30) + r[0] * 86400000);
      puntos.push({
        periodo: `${MESES[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`,
        valor: Math.round(num(r[1], 'super95') * 100) / 100,
      });
    }
  }
  if (puntos.length < 10) throw new Error(`combustibles: solo ${puntos.length} vigencias`);
  save('economia', {
    id: 'precio-nafta-super', tematica: 'economia', entidad: 'Precios',
    caracteristica: 'Precio de la nafta Súper 95', tipoResultado: 'C',
    fuente: FUENTE('9.1.8', 'MIEM'), anio: 2025, unidad: '$ por litro',
    descripcion: 'Precio al público de la nafta Súper 95 30-S en cada fecha de vigencia fijada por el Poder Ejecutivo (pesos por litro). Cada punto es un cambio de precio administrado.',
    puntos,
  });
}

function gastoPublico() {
  // 6.1.8 — por área programática (2024)
  const area = rows('cap6_sector_publico/6.1.8ok.xls', '6.1.8');
  const hrA = area[3];
  const colA = colOfYear(hrA, 2024);
  const totalA = int(findRow(area, 'total').row[colA], 'gasto total');
  const categorias = [];
  const totalIdx = findRow(area, 'total').idx;
  for (let i = totalIdx + 1; i < area.length; i++) {
    const r = area[i];
    if (r?.[0] && typeof r[colA] === 'number') {
      const label = String(r[0]).trim().replace(/\s+/g, ' ');
      if (/^fuente|^nota/i.test(label)) break;
      categorias.push({ label, valor: int(r[colA], label) });
    }
  }
  const sumaA = categorias.reduce((a, c) => a + c.valor, 0);
  assertClose(sumaA, totalA, 0.001, 'áreas vs total');
  save('economia', {
    id: 'gasto-por-area-programatica', tematica: 'economia', entidad: 'Gasto público',
    caracteristica: 'A dónde va el gasto público', tipoResultado: 'B', presentacion: 'lista',
    fuente: FUENTE('6.1.8', 'CGN'), anio: 2024, unidad: 'millones de pesos',
    descripcion: `Gastos del Gobierno Central durante 2024 según área programática, a valores corrientes (total: ${totalA.toLocaleString('es-UY')} millones de pesos).`,
    categorias,
  });

  // 6.1.7 — por clasificación económica (2024)
  const cls = rows('cap6_sector_publico/6.1.7ok.xls', '6.1.7');
  const colC = colOfYear(cls[3], 2024);
  const totalC = int(findRow(cls, 'total de gastos').row[colC], 'clasif total');
  const inversiones = int(findRow(cls, 'total inversiones').row[colC], 'inversiones');
  const sub = ['Servicios personales', 'Bienes de consumo', 'Servicios no personales', 'Bienes de uso', 'Transferencias', 'Intereses y otros gastos', 'Gastos no clasificados', 'Gastos figurativos'];
  const catsC = [
    { label: 'Inversiones', valor: inversiones },
    ...sub.map((s) => ({ label: s, valor: int(findRow(cls, s).row[colC], s) })),
  ];
  const sumaC = catsC.reduce((a, c) => a + c.valor, 0);
  assertClose(sumaC, totalC, 0.001, 'clasificación vs total');
  save('economia', {
    id: 'gasto-por-clasificacion', tematica: 'economia', entidad: 'Gasto público',
    caracteristica: 'En qué se gasta', tipoResultado: 'B', presentacion: 'lista',
    fuente: FUENTE('6.1.7', 'CGN'), anio: 2024, unidad: 'millones de pesos',
    descripcion: `Gastos del Gobierno Central durante 2024 según clasificación económica, a valores corrientes (total: ${totalC.toLocaleString('es-UY')} millones de pesos).`,
    categorias: catsC,
  });

  // 6.1.2 — ingresos vs egresos (2024) + resultado en la descripción
  const fis = rows('cap6_sector_publico/6.1.2ok.xls', '6.1.2');
  const colF = colOfYear(fis[3], 2024);
  const ingresos = int(findRow(fis, 'ingresos').row[colF], 'ingresos');
  const egresos = int(findRow(fis, 'egresos').row[colF], 'egresos');
  const resultado = int(findRow(fis, 'resultado').row[colF], 'resultado');
  assertClose(ingresos - egresos, resultado, 0.01, 'resultado fiscal');
  save('economia', {
    id: 'ingresos-egresos-gobierno', tematica: 'economia', entidad: 'Gasto público',
    caracteristica: 'Ingresos vs egresos del Estado', tipoResultado: 'B',
    fuente: FUENTE('6.1.2', 'MEF'), anio: 2024, unidad: 'millones de pesos',
    descripcion: `Ingresos y egresos del Gobierno Central consolidado durante 2024, a valores corrientes. El resultado fue deficitario: ${resultado.toLocaleString('es-UY')} millones de pesos (criterio caja).`,
    categorias: [
      { label: 'Ingresos', valor: ingresos },
      { label: 'Egresos', valor: egresos },
    ],
  });

  // 6.1.11 — ingresos de las empresas del Estado (2024)
  const emp = rows('cap6_sector_publico/6.1.11ok.xlsx', '6.1.11');
  const hrE = emp[2];
  const ingRow = findRow(emp, 'ingresos').row;
  const catsE = [];
  for (let c = 2; c < hrE.length; c++) {
    if (hrE[c] && typeof ingRow[c] === 'number') {
      catsE.push({ label: String(hrE[c]).replace(/\s*\(\d+\)\s*$/, '').trim(), valor: int(ingRow[c], hrE[c]) });
    }
  }
  if (catsE.length !== 7) throw new Error(`empresas: esperaba 7, hay ${catsE.length}`);
  catsE.sort((x, y) => y.valor - x.valor);
  const sumaE = catsE.reduce((a, c) => a + c.valor, 0);
  assertClose(sumaE, int(ingRow[1], 'empresas total'), 0.001, 'empresas vs total');
  save('economia', {
    id: 'ingresos-empresas-estado', tematica: 'economia', entidad: 'Gasto público',
    caracteristica: 'Ingresos de las empresas del Estado', tipoResultado: 'B', presentacion: 'lista',
    fuente: FUENTE('6.1.11', 'empresas públicas'), anio: 2024, unidad: 'millones de pesos',
    descripcion: 'Ingresos de las empresas del Estado durante 2024, a valores corrientes (ANCAP, UTE, ANTEL, OSE, ANP, ANV y AFE).',
    categorias: catsE,
  });
}

function impuestos() {
  const rs = rows('cap6_sector_publico/6.1.5ok.xls', '6.1.5');
  const col = colOfYear(rs[3], 2024);
  const total = int(findRow(rs, 'ingresos tributarios').row[col], 'tributarios total');
  const pick = (prefix, label) => ({ label, valor: int(findRow(rs, prefix).row[col], prefix) });
  const categorias = [
    pick('sobre ventas', 'IVA (ventas y cifra de negocios)'),
    pick('de las personas', 'IRPF (renta de las personas)'),
    pick('de las empresas', 'IRAE (renta de las empresas)'),
    pick('selectivo sobre', 'IMESI (selectivo sobre bienes)'),
    pick('impuesto sobre la pr', 'Patrimonio y propiedad'),
    pick('impuestos sobre el', 'Comercio exterior'),
  ];
  const suma = categorias.reduce((a, c) => a + c.valor, 0);
  const otros = total - suma;
  if (otros < 0) throw new Error('impuestos: la suma supera el total');
  categorias.push({ label: 'Otros impuestos', valor: otros });
  save('economia', {
    id: 'recaudacion-por-impuesto', tematica: 'economia', entidad: 'Impuestos',
    caracteristica: 'Qué recauda cada impuesto', tipoResultado: 'B', presentacion: 'lista',
    fuente: FUENTE('6.1.5', 'MEF'), anio: 2024, unidad: 'millones de pesos',
    descripcion: `Ingresos tributarios del Gobierno Central durante 2024, a valores corrientes (total: ${total.toLocaleString('es-UY')} millones de pesos). Agrupación propia sobre las líneas del cuadro; "Otros impuestos" completa el total.`,
    categorias,
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('PICA — generando datasets fase 2…');
vih();
suicidios();
estudiantes();
denuncias();
visitantes();
pib();
ipcRegiones();
combustibles();
gastoPublico();
impuestos();
console.log('Listo. Ahora: node scripts/gen-datasets-index.mjs && pnpm validate-data && pnpm audit-data');
