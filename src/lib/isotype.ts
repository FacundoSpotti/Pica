// ─────────────────────────────────────────────────────────────────────────────
// PICA — helpers de isotype charts (ver regla en pica: los tipos B/C/D usan
// grillas de sprites de personas cuando el dato involucra personas)
// ─────────────────────────────────────────────────────────────────────────────

/** true si la entidad del dataset representa personas → visualización isotype. */
export function isPersonEntity(entidad: string): boolean {
  return /(persona|j[oó]ven|niñ|adolescente|habitante|poblaci[oó]n)/i.test(entidad);
}

export interface FigureScale {
  /** cuánto representa cada figura, en unidades del dataset */
  per: number;
  /** etiqueta legible, ej: '1 figura = 1%' o '1 figura = 5.000 personas' */
  label: string;
}

/**
 * Escala de figuras: apunta a ~800 figuras en total (multitud densa tipo
 * Pudding). Porcentajes → 8 figuras = 1 punto porcentual.
 * Valores absolutos → redondeo a 1/2/5 × 10^k.
 */
export function figureScale(total: number, unidad?: string): FigureScale {
  if (unidad === '%') return { per: 0.125, label: '8 figuras = 1%' };
  const raw = total / 800;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw))));
  const mult = [1, 2, 5, 10].find((m) => raw <= m * pow) ?? 10;
  const per = mult * pow;
  const unitLabel = unidad ? ` ${unidad}` : '';
  return { per, label: `1 figura = ${per.toLocaleString('es-UY')}${unitLabel}` };
}

/** Cantidad de figuras para un valor (mínimo 1 si el valor no es cero). */
export function figureCount(valor: number, per: number): number {
  if (valor === 0) return 0;
  return Math.max(1, Math.round(valor / per));
}

/** Valor "lindo" (1/2/5 × 10^k) más cercano a raw, en escala logarítmica. */
export function niceClosest(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const k = Math.floor(Math.log10(raw));
  let best = 1;
  let bestDist = Infinity;
  for (const p of [10 ** (k - 1), 10 ** k, 10 ** (k + 1)]) {
    for (const m of [1, 2, 5]) {
      const candidate = m * p;
      const dist = Math.abs(Math.log10(candidate / raw));
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }
  return best;
}

/** Etiqueta legible de una escala ('20 figuras = 1%' o '1 figura = 5.000 personas'). */
export function perLabel(per: number, unidad?: string): string {
  // per = 1 → unidad en singular ("1 figura = 1 caso", no "1 casos")
  const singular =
    per === 1 && unidad && /^[a-záéíóúñ]+s$/i.test(unidad) ? unidad.slice(0, -1) : unidad;
  const u = singular === '%' ? '%' : singular ? ` ${singular}` : '';
  if (per < 1) return `${Math.round(1 / per)} figuras = 1${u}`;
  return `1 figura = ${per.toLocaleString('es-UY')}${u}`;
}

/**
 * Escala para series temporales (Tipo C): la multitud del período de mayor
 * valor apunta a `target` figuras (250 por defecto; la vista de barras
 * "todos los períodos" usa un target más chico).
 */
export function seriesScale(maxValor: number, unidad?: string, target = 250): FigureScale {
  const per = niceClosest(maxValor / target);
  return { per, label: perLabel(per, unidad) };
}

/**
 * Escala para matrices (Tipo D): el total de figuras de todas las celdas
 * apunta a ~800.
 */
export function matrixScale(sumValores: number, unidad?: string): FigureScale {
  const per = niceClosest(sumValores / 800);
  return { per, label: perLabel(per, unidad) };
}
