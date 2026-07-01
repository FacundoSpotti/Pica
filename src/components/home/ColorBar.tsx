'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — ColorBar
// Barra fina en el borde inferior: un segmento por temática. Las temáticas V1
// (educación, trabajo, salud) van con su color; las V2 (economía, seguridad)
// van en gris con patrón dashed y marcadas como "Próximamente".
// ─────────────────────────────────────────────────────────────────────────────

import { isTemaActive, TEMA_COLOR, TEMA_LABEL, TEMA_ORDER } from '@/lib/colors';

export default function ColorBar() {
  return (
    <ul
      className="absolute bottom-0 left-0 z-20 flex h-1 w-full list-none"
      aria-label="Temáticas disponibles"
    >
      {TEMA_ORDER.map((tema) => {
        const active = isTemaActive(tema);
        return (
          <li
            key={tema}
            className="h-full flex-1"
            title={active ? TEMA_LABEL[tema] : `${TEMA_LABEL[tema]} — Próximamente`}
            style={{
              backgroundColor: active ? TEMA_COLOR[tema] : '#3A3A38',
              opacity: active ? 1 : 0.5,
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
  );
}
