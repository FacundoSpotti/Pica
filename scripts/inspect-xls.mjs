// Inspector rápido de cuadros del Anuario: hojas + filas crudas.
// Uso: node scripts/inspect-xls.mjs <archivo> [hoja] [filas]
import xlsx from 'xlsx';

const [file, sheetArg, rowsArg] = process.argv.slice(2);
const wb = xlsx.readFile(file);
console.log('HOJAS:', wb.SheetNames.join(' | '));
const name = sheetArg ?? wb.SheetNames[0];
const ws = wb.Sheets[name];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
const n = Number(rowsArg ?? 40);
console.log(`--- ${name} (${rows.length} filas) ---`);
rows.slice(0, n).forEach((r, i) => {
  const compact = r.slice(0, 14).map((c) => (typeof c === 'number' ? c : c === null ? '·' : String(c).slice(0, 28)));
  if (compact.some((c) => c !== '·')) console.log(String(i).padStart(3), JSON.stringify(compact));
});
