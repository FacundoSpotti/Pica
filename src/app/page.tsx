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

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import CityLandscape, { type Seleccionable } from '@/components/home/CityLandscape';
import WelcomeScreen from '@/components/home/WelcomeScreen';
import HomeCanvas from '@/components/home/HomeCanvas';
import ColorBar from '@/components/home/ColorBar';
import ThemeOverlay from '@/components/home/ThemeOverlay';
import RandomOverlay from '@/components/home/RandomOverlay';
import PathCalibrator from '@/components/home/PathCalibrator';
import HitboxCalibrator from '@/components/home/HitboxCalibrator';
import FlagCalibrator from '@/components/home/FlagCalibrator';
import StickyNotes from '@/components/home/StickyNotes';
import StreetGrid from '@/components/home/StreetGrid';
import ArticulosDestacados from '@/components/home/ArticulosDestacados';
import { ARTICLES_ENABLED } from '@/lib/flags';
import PixelSparkles from '@/components/shared/PixelSparkles';
import PixelIcon from '@/components/shared/PixelIcon';
import PicaLogo from '@/components/shared/PicaLogo';
import {
  assetUrl,
  BUILDING_HITBOX_POLYGONS,
  LANDSCAPE_SIZE,
  PALACIO_HITBOX_POLYGON,
  LOGOS,
  polygonCentroid,
  THEME_STATIC,
} from '@/lib/assets';
import { TEMA_COLOR, TEMA_LABEL, TEMA_ORDER } from '@/lib/colors';
import type { Tematica } from '@/types/sprites';

const ASPECT = LANDSCAPE_SIZE.width / LANDSCAPE_SIZE.height;

/** Calibradores de dev: off salvo NEXT_PUBLIC_CALIBRATORS=on en .env.local */
const CALIBRATORS_ON = process.env.NEXT_PUBLIC_CALIBRATORS === 'on';

interface Selection {
  tema: Seleccionable; // una temática o 'palacio' (dato al azar)
  center: { x: number; y: number };
}

export default function HomePage() {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  // Área de arrastre de las notas del Home (todo el hero).
  const sectionRef = useRef<HTMLElement>(null);

  const handleSelect = (tema: Seleccionable, center: { x: number; y: number }) => {
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

  // El cartel no espera a que TODOS los puntos lleguen: aparece a los 2s del
  // click (la animación de convergencia sigue de fondo). Si la convergencia
  // termina antes, onConverged lo abre antes.
  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => setOverlayOpen(true), 2000);
    return () => clearTimeout(t);
  }, [selected]);

  const handleClose = useCallback(() => {
    setOverlayOpen(false);
    setSelected(null); // los puntos vuelven a sus calles (reset)
  }, []);

  return (
    // w-full (no w-screen): con la página scrolleando vertical, w-screen incluye
    // el ancho de la barra de scroll y genera un desborde lateral.
    <main className="pica-bg relative w-full overflow-x-hidden bg-bg-base">
      {/* Bienvenida + carga: solo en la primera carga real de la página */}
      <WelcomeScreen />
      {/* Hero: el landscape ocupa el primer viewport; se scrollea hacia abajo
          para llegar a los artículos. En mobile el hero crece (mapa + botones
          + notas) y deja de recortar. */}
      <section
        ref={sectionRef}
        className="relative h-screen w-full overflow-hidden max-md:h-auto max-md:min-h-dvh max-md:overflow-visible max-md:pb-10"
      >
      {/* DESKTOP sin marco: suelo (manzanas) + calles generadas por código, a
          todo el viewport, detrás de todo. La ciudad ya no tiene límite. */}
      <div className="hidden md:block">
        <div aria-hidden="true" className="fixed inset-0 z-0" style={{ backgroundColor: '#0D0D0D' }}>
          {/* Textura pixel diagonal sutil sobre las manzanas (identidad pixel art) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 6px)',
            }}
          />
        </div>
        <StreetGrid />
        {/* Puntos de colores a TODO el viewport (recorren las calles extendidas
            y hacen wrap por los bordes). Debajo de los edificios (z-10). */}
        <HomeCanvas convergeTarget={selected?.center ?? null} onConverged={handleConverged} />
      </div>

      {/* Destellos pixel titilando en el margen oscuro (solo desktop) */}
      <PixelSparkles count={26} className="hidden md:block" />

      {/* Navegación — logo a la izquierda + link a Nosotros. En mobile va en
          FLUJO, por fuera y arriba del mapa (no montado sobre él). */}
      <header className="relative z-30 flex items-center justify-between p-6 md:absolute md:inset-x-0 md:top-0">
        <Link href="/" aria-label="Pica — inicio" className="pica-logo-hover">
          <PicaLogo className="h-16 w-auto text-text-primary" />
        </Link>
        <Link
          href="/nosotros"
          className="flex items-center gap-2 font-display text-pica-button text-text-primary underline-offset-4 hover:underline"
        >
          <PixelIcon name="users" size={20} />
          Nosotros
        </Link>
      </header>

      {/* Stage: landscape CONTENIDO (no full-bleed), centrado con margen oscuro.
          Borde blanco fino con brillo suave que "respira" (pica-stage-glow).
          MOBILE: el mapa va ARRIBA (flujo normal bajo el header) y debajo se
          muestran los botones de temáticas — el mapa sigue siendo clickeable. */}
      <div
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 max-md:static max-md:mx-auto max-md:mt-1 max-md:translate-x-0 max-md:translate-y-0 max-md:overflow-hidden max-md:rounded-2xl"
        style={{
          width: `min(93vw, calc((100vh - 150px) * ${ASPECT}))`,
          height: `min(100vh - 150px, calc(93vw / ${ASPECT}))`,
        }}
      >
        {/* Los puntos ya no van dentro del stage: viven en el canvas a viewport
            completo (arriba), debajo de los edificios. El overlay tampoco va
            acá: se monta a PANTALLA COMPLETA (ya no hay marco de mapa). */}
        <CityLandscape selectedTema={selected?.tema ?? null} onSelect={handleSelect} />

        {/* Herramientas de calibración (dev) — apagadas por defecto. Para
            reactivarlas: crear .env.local con NEXT_PUBLIC_CALIBRATORS=on
            (P = paths, H = hitboxes, B = bandera del Palacio). Dentro del stage para que las
            coordenadas % coincidan con el landscape. */}
        {CALIBRATORS_ON && (
          <>
            <PathCalibrator />
            <HitboxCalibrator />
            <FlagCalibrator />
          </>
        )}
      </div>

      {/* MOBILE — botones de temáticas debajo del mapa: mismo flujo que el
          click en el edificio (los puntos convergen igual), sin tener que
          apretar el edificio chiquito. Formato de FILAS (como el selector
          del explorador): ícono + nombre, una temática por fila. */}
      <div
        className="relative z-10 mx-auto mt-5 flex flex-col gap-2 md:hidden"
        style={{ width: `min(93vw, calc((100vh - 150px) * ${ASPECT}))` }}
      >
        {TEMA_ORDER.map((t) => {
          const isSel = selected?.tema === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => handleSelect(t, polygonCentroid(BUILDING_HITBOX_POLYGONS[t]))}
              aria-pressed={isSel}
              aria-label={`Explorar temática ${TEMA_LABEL[t]}`}
              className="relative flex min-h-[48px] w-full items-center justify-start gap-4 overflow-hidden rounded-lg border-2 bg-gradient-to-b from-white/[0.06] to-white/[0.015] px-4 py-2"
              style={{
                borderColor: isSel ? TEMA_COLOR[t] : `${TEMA_COLOR[t]}88`,
                // Mismo destello que las cards de entidades cuando está activa
                boxShadow: isSel
                  ? `0 0 0 1px ${TEMA_COLOR[t]}, 0 8px 30px -8px ${TEMA_COLOR[t]}80`
                  : 'none',
              }}
            >
              {/* Barra de carga: el fondo se llena de izquierda a derecha durante
                  la animación de convergencia (2s) — señal de "esperá, viene". */}
              {isSel && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 origin-left"
                  style={{ background: `${TEMA_COLOR[t]}40` }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 2, ease: 'linear' }}
                />
              )}
              <span className="relative flex h-10 w-12 shrink-0 items-center justify-center">
                <img
                  src={assetUrl(THEME_STATIC[t])}
                  alt=""
                  className="h-10 w-12 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </span>
              <span
                className="relative font-display text-pica-button font-bold uppercase"
                style={{ color: TEMA_COLOR[t], letterSpacing: '0.12em' }}
              >
                {TEMA_LABEL[t]}
              </span>
            </button>
          );
        })}
        {/* Palacio: estadística al azar — mismo flujo (los puntos convergen) */}
        <button
          type="button"
          onClick={() => handleSelect('palacio', polygonCentroid(PALACIO_HITBOX_POLYGON))}
          aria-pressed={selected?.tema === 'palacio'}
          aria-label="Explorar una estadística al azar (Palacio Legislativo)"
          className="relative flex min-h-[48px] w-full items-center justify-start gap-4 overflow-hidden rounded-lg border-2 bg-gradient-to-b from-white/[0.06] to-white/[0.015] px-4 py-2"
          style={{
            borderColor:
              selected?.tema === 'palacio' ? '#EBEBEB' : 'rgba(235,235,235,0.5)',
            boxShadow:
              selected?.tema === 'palacio'
                ? '0 0 0 1px #EBEBEB, 0 8px 30px -8px rgba(235,235,235,0.5)'
                : 'none',
          }}
        >
          {selected?.tema === 'palacio' && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 origin-left"
              style={{ background: 'rgba(235,235,235,0.22)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 2, ease: 'linear' }}
            />
          )}
          <span className="relative flex w-12 shrink-0 justify-center">
            <PixelIcon name="ticket" size={28} color="#EBEBEB" />
          </span>
          <span
            className="relative font-display text-pica-button font-bold uppercase text-text-primary"
            style={{ letterSpacing: '0.12em' }}
          >
            Dato al azar
          </span>
        </button>
      </div>

      {/* MOBILE — notas adaptadas: en flujo debajo de los botones (no sobre el
          mapa, que lo taparían). */}
      <div
        className="relative z-10 mx-auto mt-6 grid grid-cols-2 items-start gap-4 md:hidden"
        style={{ width: `min(93vw, calc((100vh - 150px) * ${ASPECT}))` }}
      >
        <StickyNotes flow />
      </div>

      {/* Overlay de temática a PANTALLA COMPLETA (desktop y mobile): ya no hay
          marco de mapa, así que el fondo oscuro cubre TODO el viewport. Va fuera
          del stage (que está transformado) para que `fixed inset-0` sea la
          ventana completa. */}
      <AnimatePresence>
        {overlayOpen && selected && (
          selected.tema === 'palacio' ? (
            <RandomOverlay onClose={handleClose} fullscreen />
          ) : (
            <ThemeOverlay tema={selected.tema} onClose={handleClose} fullscreen />
          )
        )}
      </AnimatePresence>

      {/* Notas "pegadas" alrededor del mapa — misma geometría que el stage pero
          SIN overflow-hidden, así los papeles asoman sobre el margen oscuro.
          pointer-events-none: los clicks pasan a los edificios.
          En mobile se ocultan (decorativas, saturan la pantalla chica). */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 md:block"
        style={{
          width: `min(93vw, calc((100vh - 150px) * ${ASPECT}))`,
          height: `min(100vh - 150px, calc(93vw / ${ASPECT}))`,
        }}
      >
        <StickyNotes constraintsRef={sectionRef} />
      </div>

      {/* Barra de temáticas en el borde inferior */}
      <ColorBar />
      </section>

      {/* Sección de lecturas — oculta tras flag hasta tener los copys reales
          (hoy son tarjetas placeholder). Reactivar con ARTICLES_ENABLED. */}
      {ARTICLES_ENABLED && <ArticulosDestacados />}
    </main>
  );
}
