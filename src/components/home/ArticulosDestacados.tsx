'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Artículos destacados (Home)
// Sección clara debajo del landscape: espacio para futuras LECTURAS narrativas
// sobre los datos (tipo The Pudding). Por ahora son tarjetas PLACEHOLDER, sin
// contenido real — solo la maqueta visual acorde a la estética de Pica.
// ─────────────────────────────────────────────────────────────────────────────

import { TEMA_COLOR, TEMA_LABEL, textOnColor } from '@/lib/colors';
import type { Tematica } from '@/types/sprites';

// Temáticas de muestra para variar los colores de acento de las tarjetas.
const CARDS: Tematica[] = ['educacion', 'economia', 'salud', 'trabajo'];

export default function ArticulosDestacados() {
  return (
    <section className="w-full bg-gradient-to-b from-[#F2F2EE] via-[#ECECE8] to-[#E3E3DD] px-6 py-16 text-bg-base md:px-12">
      <h2 className="mb-12 text-center font-display text-pica-heading-2 font-bold uppercase tracking-wide">
        Artículos destacados
      </h2>

      <ul className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((tema, i) => {
          const color = TEMA_COLOR[tema];
          return (
            <li key={i} className="flex flex-col">
              {/* Portada (placeholder) */}
              <div
                className="aspect-square w-full bg-gradient-to-br from-[#1A1A18] to-[#0A0A0A] shadow-[6px_8px_0_rgba(10,10,10,0.12)]"
                aria-hidden="true"
              />
              <h3 className="mt-4 font-display text-pica-title font-bold uppercase leading-none">
                Título
              </h3>
              <p
                className="mt-1 font-display text-pica-button font-bold uppercase"
                style={{ color }}
              >
                {TEMA_LABEL[tema]}
              </p>
              <p className="mt-1 font-sans text-pica-subtitle text-neutral-600">
                Breve descripción
              </p>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="mt-4 w-fit cursor-not-allowed px-5 py-2 font-display text-pica-button font-bold uppercase tracking-wide"
                style={{ backgroundColor: color, color: textOnColor(color) }}
                title="Próximamente"
              >
                Saber más
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 text-center font-sans text-pica-subtitle text-neutral-500">
        Próximamente: lecturas que narran la historia detrás de cada dato.
      </p>
    </section>
  );
}
