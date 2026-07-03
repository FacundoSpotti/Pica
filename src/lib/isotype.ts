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
 * Escala de figuras: apunta a ~200 figuras en total (densidad tipo Pudding).
 * Porcentajes → 1 figura = 0,5 puntos porcentuales.
 * Valores absolutos → redondeo a 1/2/5 × 10^k.
 */
export function figureScale(total: number, unidad?: string): FigureScale {
  if (unidad === '%') return { per: 0.5, label: '1 figura = 0,5%' };
  const raw = total / 200;
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
