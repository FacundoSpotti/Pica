'use client';

/* eslint-disable @next/next/no-img-element */
// El logo es un SVG de pixel art: <img> directo, sin optimización de next/image.

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Home (/)
// Landscape isométrico contenido + puntos de colores + click en edificios.
// Flujo de selección:
//   click edificio → ciudad en grayscale + edificio en color + puntos convergen
//   por las calles (pathfinding) → al llegar ≥70% aparece el ThemeOverlay con
//   el personaje 360° + EXPLORAR / VOLVER.
// El "stage" mantiene la relación de aspecto del landscape (4096×2305) y entra
// completo en el viewport; capas, canvas y hitboxes comparten coordenadas en %.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import CityLandscape from '@/components/home/CityLandscape';
import HomeCanvas from '@/components/home/HomeCanvas';
import ColorBar from '@/components/home/ColorBar';
import ThemeOverlay from '@/components/home/ThemeOverlay';
import PathCalibrator from '@/components/home/PathCalibrator';
import HitboxCalibrator from '@/components/home/HitboxCalibrator';
import StickyNotes from '@/components/home/StickyNotes';
import ArticulosDestacados from '@/components/home/ArticulosDestacados';
import AmbientWalkers from '@/components/shared/AmbientWalkers';
import PixelIcon from '@/components/shared/PixelIcon';
import PicaLogo from '@/components/shared/PicaLogo';
import {
  assetUrl,
  BUILDING_HITBOX_POLYGONS,
  LANDSCAPE_SIZE,
  LOGOS,
  polygonCentroid,
  THEME_STATIC,
} from '@/lib/assets';
import { TEMA_COLOR, TEMA_LABEL, TEMA_ORDER } from '@/lib/colors';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Tematica } from '@/types/sprites';

const ASPECT = LANDSCAPE_SIZE.width / LANDSCAPE_SIZE.height;

/** Calibradores de dev: off salvo NEXT_PUBLIC_CALIBRATORS=on en .env.local */
const CALIBRATORS_ON = process.env.NEXT_PUBLIC_CALIBRATORS === 'on';

interface Selection {
  tema: Tematica;
  center: { x: number; y: number };
}

export default function HomePage() {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  // Mobile: el overlay se monta a nivel de pantalla (fixed) y no dentro del
  // stage (que lo recorta); además aparecen los botones de temáticas.
  const isMobile = useIsMobile();

  const handleSelect = (tema: Tematica, center: { x: number; y: number }) => {
    setSelected((prev) => {
      if (prev?.tema === tema) {
        // Click en el mismo edificio → deseleccionar
        setOverlayOpen(false);
        return null;
      }
      setOverlayOpen(false); // el overlay aparece recién cuando los puntos llegan
      return { tema, center };
    });
  };

  const handleConverged = useCallback(() => setOverlayOpen(true), []);

  const handleClose = useCallback(() => {
    setOverlayOpen(false);
    setSelected(null); // los puntos vuelven a sus calles (reset)
  }, []);

  return (
    <main className="relative w-screen bg-bg-base">
      {/* Hero: el landscape ocupa el primer viewport; se scrollea hacia abajo
          para llegar a los artículos. En mobile el hero crece (mapa + botones
          + notas) y deja de recortar. */}
      <section className="relative h-screen w-full overflow-hidden max-md:h-auto max-md:min-h-screen max-md:overflow-visible max-md:pb-10">
      {/* Personas grises caminando por el margen oscuro (como en Nosotros) —
          detrás del stage; mantené el click sobre una y te mira */}
      <AmbientWalkers count={8} className="absolute inset-0 h-full w-full" />

      {/* Stage: landscape CONTENIDO (no full-bleed), centrado con margen oscuro.
          Borde blanco fino con brillo suave (detalle, no protagonista).
          MOBILE: el mapa va ARRIBA (flujo normal bajo el header) y debajo se
          muestran los botones de temáticas — el mapa sigue siendo clickeable. */}
      <div
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl max-md:static max-md:mx-auto max-md:mt-24 max-md:translate-x-0 max-md:translate-y-0"
        style={{
          width: `min(90vw, calc((100vh - 170px) * ${ASPECT}))`,
          height: `min(100vh - 170px, calc(90vw / ${ASPECT}))`,
          boxShadow:
            '0 0 0 2px rgba(235, 235, 235, 0.85), 0 0 22px 3px rgba(235, 235, 235, 0.22)',
        }}
      >
        <CityLandscape selectedTema={selected?.tema ?? null} onSelect={handleSelect}>
          {/* El canvas de puntos va DEBAJO de las capas de edificios (ver CityLandscape) */}
          <HomeCanvas
            convergeTarget={selected?.center ?? null}
            onConverged={handleConverged}
          />
        </CityLandscape>

        {/* Overlay de temática — aparece al completarse la convergencia.
            En mobile NO va acá (el stage lo recorta): se monta fullscreen abajo. */}
        <AnimatePresence>
          {!isMobile && overlayOpen && selected && (
            <ThemeOverlay tema={selected.tema} onClose={handleClose} />
          )}
        </AnimatePresence>

        {/* Herramientas de calibración (dev) — apagadas por defecto. Para
            reactivarlas: crear .env.local con NEXT_PUBLIC_CALIBRATORS=on
            (P = paths, H = hitboxes). Dentro del stage para que las
            coordenadas % coincidan con el landscape. */}
        {CALIBRATORS_ON && (
          <>
            <PathCalibrator />
            <HitboxCalibrator />
          </>
        )}
      </div>

      {/* MOBILE — botones de temáticas debajo del mapa: mismo flujo que el
          click en el edificio (los puntos convergen igual), sin tener que
          apretar el edificio chiquito. Formato de FILAS (como el selector
          del explorador): ícono + nombre, una temática por fila. */}
      <div className="relative z-10 mx-auto mt-5 flex w-full max-w-xs flex-col gap-2 px-1 md:hidden">
        {TEMA_ORDER.map((t) => {
          const isSel = selected?.tema === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => handleSelect(t, polygonCentroid(BUILDING_HITBOX_POLYGONS[t]))}
              aria-pressed={isSel}
              aria-label={`Explorar temática ${TEMA_LABEL[t]}`}
              className="flex min-h-[48px] w-full items-center justify-start gap-4 rounded-lg border-2 px-4 py-2"
              style={{
                borderColor: TEMA_COLOR[t],
                background: isSel ? `${TEMA_COLOR[t]}26` : 'transparent',
              }}
            >
              <img
                src={assetUrl(THEME_STATIC[t])}
                alt=""
                className="h-10 w-auto"
                style={{ imageRendering: 'pixelated' }}
              />
              <span
                className="font-display text-pica-button font-bold uppercase"
                style={{ color: TEMA_COLOR[t], letterSpacing: '0.12em' }}
              >
                {TEMA_LABEL[t]}
              </span>
            </button>
          );
        })}
      </div>

      {/* MOBILE — notas adaptadas: en flujo debajo de los botones (no sobre el
          mapa, que lo taparían). */}
      <div className="relative z-10 mt-6 grid grid-cols-2 items-start gap-4 px-6 md:hidden">
        <StickyNotes flow />
      </div>

      {/* MOBILE — overlay de temática a PANTALLA COMPLETA (no dentro del mapa,
          que lo recortaba y tapaba la animación). */}
      <AnimatePresence>
        {isMobile && overlayOpen && selected && (
          <ThemeOverlay tema={selected.tema} onClose={handleClose} fullscreen />
        )}
      </AnimatePresence>

      {/* Notas "pegadas" alrededor del mapa — misma geometría que el stage pero
          SIN overflow-hidden, así los papeles asoman sobre el margen oscuro.
          pointer-events-none: los clicks pasan a los edificios.
          En mobile se ocultan (decorativas, saturan la pantalla chica). */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 md:block"
        style={{
          width: `min(90vw, calc((100vh - 170px) * ${ASPECT}))`,
          height: `min(100vh - 170px, calc(90vw / ${ASPECT}))`,
        }}
      >
        <StickyNotes />
      </div>

      {/* Navegación — logo a la izquierda + link a Nosotros */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-6">
        <Link href="/" aria-label="Pica — inicio">
          <PicaLogo className="h-12 w-auto text-text-primary" />
        </Link>
        <Link
          href="/nosotros"
          className="flex items-center gap-2 font-display text-pica-button text-text-primary underline-offset-4 hover:underline"
        >
          <PixelIcon name="users" size={20} />
          Nosotros
        </Link>
      </header>

      {/* Barra de temáticas en el borde inferior */}
      <ColorBar />
      </section>

      {/* Sección de lecturas (placeholder por ahora) */}
      <ArticulosDestacados />
    </main>
  );
}
