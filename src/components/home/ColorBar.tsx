'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — ColorBar
// Barra fina en el borde inferior. Orden: azul (educación) → verde (salud) →
// amarillo (trabajo) → rojo (seguridad, V2) → naranja (economía, V2).
//
// IMPORTANTE: sin opacity sobre los colores. El alpha compositing sobre el
// fondo #0A0A0A oscurecía el rojo/naranja hasta verse marrón. Los 5 segmentos
// usan el hex exacto de picaColors[color][400] a opacidad plena; las temáticas
// V2 se distinguen por altura (media barra) en vez de por transparencia.
// ─────────────────────────────────────────────────────────────────────────────

import { COLORBAR_ORDER, isTemaActive, TEMA_COLOR, TEMA_LABEL } from '@/lib/colors';

export default function ColorBar() {
  // Halo: la misma secuencia de colores, difuminada, "iluminando" apenas el
  // borde inferior. Decorativo — la barra sólida de abajo no cambia.
  const glowGradient = `linear-gradient(90deg, ${COLORBAR_ORDER.map(
    (tema, i) =>
      `${TEMA_COLOR[tema]} ${(i / COLORBAR_ORDER.length) * 100}% ${((i + 1) / COLORBAR_ORDER.length) * 100}%`,
  ).join(', ')})`;

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-2 w-full opacity-35 blur-md"
        style={{ background: glowGradient }}
      />
    <ul
      className="absolute bottom-0 left-0 z-20 flex h-1 w-full list-none items-end"
      aria-label="Temáticas disponibles"
    >
      {COLORBAR_ORDER.map((tema) => {
        const active = isTemaActive(tema);
        return (
          <li
            key={tema}
            className="flex-1"
            title={active ? TEMA_LABEL[tema] : `${TEMA_LABEL[tema]} — Próximamente`}
            style={{
              backgroundColor: TEMA_COLOR[tema],
              height: active ? '100%' : '50%',
            }}
          >
            <span className="sr-only">
              {TEMA_LABEL[tema]}
              {active ? '' : ' (próximamente)'}
            </span>
          </li>
        );
      })}
    </ul>
    </>
  );
}
