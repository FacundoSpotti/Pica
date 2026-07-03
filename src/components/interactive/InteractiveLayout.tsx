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

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import EntityScroller from './EntityScroller';
import CharacteristicExplorer from './CharacteristicExplorer';
import PixelIcon from '@/components/shared/PixelIcon';
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
      {/* Nav superior */}
      <header className="z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Pica — inicio">
            <img
              src={assetUrl(LOGOS.navbar.light)}
              alt="Pica"
              className="h-10 w-auto"
              style={{ imageRendering: 'pixelated' }}
            />
          </Link>
          {/* Breadcrumb del estado actual */}
          {tema && (
            <nav aria-label="Ubicación" className="flex items-center gap-2 font-sans text-pica-paragraph">
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
                  <span className="text-text-secondary">{entidad}</span>
                </>
              )}
            </nav>
          )}
        </div>
        <Link
          href="/nosotros"
          className="flex items-center gap-2 font-display text-pica-button text-text-primary underline-offset-4 hover:underline"
        >
          <PixelIcon name="users" size={20} />
          Nosotros
        </Link>
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
