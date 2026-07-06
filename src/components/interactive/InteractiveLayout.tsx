'use client';

/* eslint-disable @next/next/no-img-element */
// Logo y personajes son pixel art — <img> sin optimización (ver pica-ui).

// ─────────────────────────────────────────────────────────────────────────────
// PICA — InteractiveLayout (/interactivo)
// El estado vive SIEMPRE en la URL para que sea compartible (pica-interactive):
//   /interactivo                     → selector de temática
//   ?tema=educacion                  → scroll vertical de entidades
//   ?tema=…&entidad=…                → entidad bloqueada, explorador horizontal
//   ?tema=…&entidad=…&caracteristica=… → visualización activa
// Los cambios usan router.replace (sin recargar).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import EntityScroller from './EntityScroller';
import CharacteristicExplorer from './CharacteristicExplorer';
import PixelIcon from '@/components/shared/PixelIcon';
import PicaLogo from '@/components/shared/PicaLogo';
import { assetUrl, LOGOS, THEME_STATIC } from '@/lib/assets';
import {
  ACTIVE_TEMAS,
  isTemaActive,
  TEMA_COLOR,
  TEMA_DESCRIPTION,
  TEMA_LABEL,
} from '@/lib/colors';
import { getCaracteristicas, getEntidades } from '@/lib/datasets';
import { findBySlug, slugify } from '@/lib/slug';
import type { Tematica } from '@/types/sprites';

export default function InteractiveLayout() {
  const router = useRouter();
  const params = useSearchParams();
  const shouldReduce = useReducedMotion();

  // Vuelo del logo: durante el desplazamiento se muestra la versión DIAGONAL
  // (asset "Animación" — la inclinada es para transición, ver pica-ui)
  const [logoFlying, setLogoFlying] = useState(false);
  // Al llegar con ?tema= ya seteado (ej. desde el Home), el logo arranca a la
  // izquierda y vuela al centro tras el mount — nunca aparece de repente.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Parseo defensivo de la URL
  const temaParam = params.get('tema');
  const tema: Tematica | null =
    temaParam && isTemaActive(temaParam as Tematica) ? (temaParam as Tematica) : null;
  const entidades = tema ? getEntidades(tema) : [];
  const entidad = tema ? findBySlug(entidades, params.get('entidad') ?? '') ?? null : null;
  const datasets = tema && entidad ? getCaracteristicas(tema, entidad) : [];
  const caracteristica =
    datasets.find((d) => d.id === params.get('caracteristica'))?.id ?? datasets[0]?.id ?? '';

  // Actualiza los query params sin recargar
  const setParams = useCallback(
    (next: { tema?: string; entidad?: string; caracteristica?: string }) => {
      const q = new URLSearchParams();
      if (next.tema) q.set('tema', next.tema);
      if (next.entidad) q.set('entidad', next.entidad);
      if (next.caracteristica) q.set('caracteristica', next.caracteristica);
      router.replace(`/interactivo${q.size ? `?${q}` : ''}`);
    },
    [router],
  );

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-bg-base">
      {/* Nav superior: al elegir temática el logo viaja al CENTRO (animación
          de layout con spring, ver pica-ui) y "Nosotros" desaparece — dentro
          de los datos no importa nada más que los datos. */}
      <header className="z-10 grid grid-cols-3 items-center p-6">
        {/* Breadcrumb (izquierda) cuando hay temática */}
        {tema && (
          <nav
            aria-label="Ubicación"
            className="flex items-center gap-2 justify-self-start font-sans text-pica-paragraph"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            <button
              type="button"
              onClick={() => setParams({})}
              className="underline-offset-4 hover:underline"
              style={{ color: TEMA_COLOR[tema] }}
            >
              {TEMA_LABEL[tema]}
            </button>
            {entidad && (
              <>
                <span aria-hidden="true" className="text-text-muted">/</span>
                <button
                  type="button"
                  onClick={() => setParams({ tema })}
                  aria-label="Volver a la lista de entidades"
                  className="text-text-secondary underline-offset-4 hover:underline"
                >
                  {entidad}
                </button>
              </>
            )}
          </nav>
        )}

        {/* Logo: izquierda en el selector, centro dentro de una temática.
            Mientras vuela se muestra la versión diagonal (swap de asset). */}
        {(() => {
          const centered = Boolean(tema) && mounted;
          return (
            <motion.div
              layout
              onLayoutAnimationStart={() => setLogoFlying(true)}
              onLayoutAnimationComplete={() => setLogoFlying(false)}
              transition={
                shouldReduce
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 110, damping: 20 } // vuelo pausado
              }
              className={centered ? 'justify-self-center' : 'justify-self-start'}
              style={{ gridColumn: centered ? 2 : 1, gridRow: 1 }}
            >
              <Link href="/" aria-label="Pica — inicio">
                {logoFlying && !shouldReduce ? (
                  // En vuelo: versión diagonal del logo
                  <img
                    src={assetUrl(LOGOS.animacion.navbar.light)}
                    alt="Pica"
                    className="h-10 w-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  // En reposo: logo inline con ojos vivos (mirada + parpadeo)
                  <PicaLogo className="h-10 w-auto text-text-primary" />
                )}
              </Link>
            </motion.div>
          );
        })()}

        {/* Nosotros: solo en el selector de temáticas */}
        {!tema && (
          <Link
            href="/nosotros"
            className="flex items-center gap-2 justify-self-end font-display text-pica-button text-text-primary underline-offset-4 hover:underline"
            style={{ gridColumn: 3, gridRow: 1 }}
          >
            <PixelIcon name="users" size={20} />
            Nosotros
          </Link>
        )}
      </header>

      <div className="min-h-0 flex-1">
        {/* Estado 1 — sin temática: selector */}
        {!tema && (
          <div className="flex h-full flex-col items-center justify-center gap-10 px-8">
            <h1 className="font-display text-pica-heading-2 font-bold text-text-primary">
              ¿Qué querés explorar?
            </h1>
            <div className="flex flex-wrap justify-center gap-6">
              {ACTIVE_TEMAS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setParams({ tema: t })}
                  className="flex w-44 flex-col items-center gap-3 rounded-lg border-2 px-6 py-6 transition-transform hover:scale-105"
                  style={{ borderColor: TEMA_COLOR[t] }}
                >
                  <img
                    src={assetUrl(THEME_STATIC[t])}
                    alt=""
                    className="h-24 w-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span
                    className="font-display text-pica-button font-bold uppercase"
                    style={{ color: TEMA_COLOR[t], letterSpacing: '0.12em' }}
                  >
                    {TEMA_LABEL[t]}
                  </span>
                  <span className="sr-only">{TEMA_DESCRIPTION[t]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estado 2 — temática elegida: scroll vertical de entidades */}
        {tema && !entidad && (
          <EntityScroller
            tema={tema}
            entidades={entidades}
            onSelect={(e) => setParams({ tema, entidad: slugify(e) })}
          />
        )}

        {/* Estado 3 — entidad bloqueada: explorador horizontal + viz */}
        {tema && entidad && (
          <CharacteristicExplorer
            tema={tema}
            entidad={entidad}
            datasets={datasets}
            activeId={caracteristica}
            onChangeCaracteristica={(id) =>
              setParams({ tema, entidad: slugify(entidad), caracteristica: id })
            }
            onUnlockEntidad={() => setParams({ tema })}
          />
        )}
      </div>
    </main>
  );
}
