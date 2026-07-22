// ─────────────────────────────────────────────────────────────────────────────
// PICA — feature flags
// Interruptores simples para activar/desactivar funcionalidades sin borrar
// código. Para reactivar una feature, poné su flag en `true` (o seteá la env
// var correspondiente) — no hace falta revertir el ocultamiento a mano.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sección "Artículos destacados" (lecturas narrativas del Home).
 * Desactivada hasta tener los copys reales: hoy son tarjetas placeholder, así
 * que no se muestran en ningún lado. Reactivar poniendo esto en `true` o con
 * NEXT_PUBLIC_ARTICLES_ENABLED=true.
 */
export const ARTICLES_ENABLED =
  process.env.NEXT_PUBLIC_ARTICLES_ENABLED === 'true';
