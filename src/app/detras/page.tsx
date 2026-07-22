'use client';

/* eslint-disable @next/next/no-img-element */
// La foto es un retrato real (no pixel art): <img> plano, sin optimización, para
// no arrastrar config de next/image (el resto del sitio usa <img> por el pixel art).

// ─────────────────────────────────────────────────────────────────────────────
// PICA — /detras ("Detrás de Pica")
// Identidad del creador: quién hizo Pica y por qué, con sus datos de contacto.
// Proyecto propio (sin marcas institucionales). Enlazada desde /nosotros y el Home.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import PixelSparkles from '@/components/shared/PixelSparkles';

/** Datos de contacto — clickeables (mailto / tel / perfiles). */
const CONTACTOS: { label: string; value: string; href: string }[] = [
  { label: 'Correo', value: 'facuspotti@gmail.com', href: 'mailto:facuspotti@gmail.com' },
  { label: 'Teléfono', value: '095 275 964', href: 'tel:+59895275964' },
  {
    label: 'LinkedIn',
    value: '/in/facundo-spotti-rossi',
    href: 'https://www.linkedin.com/in/facundo-spotti-rossi',
  },
  { label: 'Instagram', value: '@facundo_spotti', href: 'https://instagram.com/facundo_spotti' },
  { label: 'YouTube', value: '@iamspotti', href: 'https://youtube.com/@iamspotti' },
];

export default function DetrasPage() {
  return (
    <main className="pica-bg relative min-h-dvh w-full bg-bg-base">
      <PixelSparkles count={16} seed={41} className="pointer-events-none absolute inset-0 hidden md:block" />

      <div className="relative mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-12">
        {/* Nav */}
        <header className="mb-10 flex items-center gap-6">
          <Link
            href="/"
            className="font-display text-pica-button text-text-primary underline-offset-4 hover:underline"
          >
            ← Home
          </Link>
          <Link
            href="/nosotros"
            className="font-display text-pica-button text-text-secondary underline-offset-4 hover:underline"
          >
            Nosotros
          </Link>
        </header>

        {/* Título */}
        <h1 className="font-display text-pica-heading font-bold leading-[0.95] text-text-primary max-md:text-5xl">
          Detrás
          <br />
          de Pica
        </h1>
        <hr className="mt-6 border-white/15" />

        {/* Cuerpo: bio + contactos (izq) · foto (der) */}
        <div className="mt-10 grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_340px] md:gap-14">
          {/* Columna izquierda */}
          <div className="min-w-0 max-w-xl">
            <h2 className="font-display text-pica-title font-bold text-text-primary">Facundo Spotti</h2>
            <p className="mt-4 font-sans text-pica-paragraph text-text-secondary">
              Diseñador interactivo. Pica nació de una pregunta simple: por qué la información que
              describe a un país circula solo entre quienes ya saben buscarla. El proyecto es mi
              intento de responderla con las herramientas del diseño — concepto, dirección de arte,
              sistema visual y desarrollo.
            </p>

            <h3 className="mt-10 font-display text-pica-button font-bold uppercase tracking-[0.18em] text-text-primary">
              Dónde encontrarme
            </h3>
            <dl className="mt-4">
              {CONTACTOS.map((c) => {
                const externo = c.href.startsWith('http');
                return (
                  <a
                    key={c.label}
                    href={c.href}
                    target={externo ? '_blank' : undefined}
                    rel={externo ? 'noopener noreferrer' : undefined}
                    className="group grid grid-cols-[minmax(5.5rem,10rem)_1fr] items-baseline gap-4 border-b border-white/10 py-3 transition-colors hover:border-white/30"
                  >
                    <dt className="font-sans text-pica-subtitle uppercase tracking-wide text-text-muted">
                      {c.label}
                    </dt>
                    <dd className="truncate font-sans text-pica-paragraph text-text-primary underline-offset-4 group-hover:underline">
                      {c.value}
                    </dd>
                  </a>
                );
              })}
            </dl>
          </div>

          {/* Columna derecha — foto */}
          <figure className="mx-auto w-full max-w-xs md:mx-0 md:max-w-none">
            <img
              src="/assets/facundo_spotti.jpg"
              alt="Retrato de Facundo Spotti"
              className="w-full border border-white/10"
            />
            <figcaption className="mt-3 text-center font-sans text-pica-subtitle uppercase tracking-[0.3em] text-text-muted">
              Facundo Spotti
            </figcaption>
          </figure>
        </div>
      </div>
    </main>
  );
}
