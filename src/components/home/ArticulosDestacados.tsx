'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Artículos destacados (Home)
// Sección clara debajo del landscape: espacio para futuras LECTURAS narrativas
// sobre los datos (tipo The Pudding). Tarjetas PLACEHOLDER con estética
// editorial contemporánea: portada con gradient del color de la temática +
// trama de puntos pixel + ícono grande, chip "Próximamente", jerarquía
// tipográfica y elevación al hover con sombra pixel.
// ─────────────────────────────────────────────────────────────────────────────

import PixelIcon, { type PixelIconName } from '@/components/shared/PixelIcon';
import { TEMA_COLOR, TEMA_LABEL, textOnColor } from '@/lib/colors';
import type { Tematica } from '@/types/sprites';

// Temáticas de muestra para variar los colores de acento de las tarjetas.
const CARDS: Tematica[] = ['educacion', 'economia', 'salud', 'trabajo'];

/** Ícono de portada por temática (mismo lenguaje que las entidades). */
const COVER_ICON: Record<string, PixelIconName> = {
  educacion: 'book',
  economia: 'priceTag',
  salud: 'medkit',
  trabajo: 'briefcase',
};

export default function ArticulosDestacados() {
  return (
    <section className="w-full bg-gradient-to-b from-[#F2F2EE] via-[#ECECE8] to-[#E3E3DD] px-6 py-20 text-bg-base md:px-12">
      <div className="mx-auto max-w-[1600px]">
        {/* Encabezado editorial: kicker + título grandes a la izquierda,
            bajada a la derecha */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-x-12 gap-y-4">
          <div>
            <p className="font-sans text-pica-subtitle uppercase tracking-[0.3em] text-neutral-500">
              Lecturas
            </p>
            <h2 className="mt-1 font-display text-pica-heading-2 font-bold uppercase leading-none tracking-wide">
              Artículos destacados
            </h2>
          </div>
          <p className="max-w-sm font-sans text-pica-subtitle leading-snug text-neutral-500">
            Próximamente: lecturas que narran la historia detrás de cada dato.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((tema, i) => {
            const color = TEMA_COLOR[tema];
            const onColor = textOnColor(color);
            return (
              <li key={i}>
                <article className="group flex h-full flex-col overflow-hidden rounded-lg border-2 border-bg-base/10 bg-white/70 shadow-[6px_8px_0_rgba(10,10,10,0.08)] transition-all duration-300 hover:-translate-y-2 hover:border-bg-base/25 hover:shadow-[10px_14px_0_rgba(10,10,10,0.14)]">
                  {/* Portada: gradient del color + trama de puntos + ícono */}
                  <div
                    className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 62%, #0A0A0A) 100%)`,
                    }}
                  >
                    {/* Trama pixel sutil sobre el gradient */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px)',
                        backgroundSize: '8px 8px',
                      }}
                    />
                    <PixelIcon
                      name={COVER_ICON[tema] ?? 'book'}
                      size={88}
                      color={onColor}
                      className="relative transition-transform duration-300 group-hover:scale-110"
                    />
                    <span
                      className="absolute right-3 top-3 bg-bg-base/85 px-2 py-0.5 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-text-primary"
                    >
                      Próximamente
                    </span>
                  </div>

                  {/* Cuerpo */}
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <p
                      className="font-display text-pica-subtitle font-bold uppercase"
                      style={{ color: `color-mix(in srgb, ${color} 80%, #0A0A0A)`, letterSpacing: '0.14em' }}
                    >
                      {TEMA_LABEL[tema]}
                    </p>
                    <h3 className="font-display text-pica-title font-bold uppercase leading-none">
                      Título
                    </h3>
                    <p className="font-sans text-pica-subtitle leading-snug text-neutral-600">
                      Breve descripción de la lectura: qué historia cuentan estos datos.
                    </p>
                    <span
                      className="mt-auto flex items-center gap-2 pt-3 font-display text-pica-button font-bold uppercase tracking-wide text-neutral-400"
                      title="Próximamente"
                    >
                      Saber más
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 group-hover:translate-x-1.5"
                      >
                        →
                      </span>
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
