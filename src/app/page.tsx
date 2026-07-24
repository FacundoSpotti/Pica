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
import { AnimatePresence } from 'framer-motion';
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
import MobileCityCarousel from '@/components/home/MobileCityCarousel';
import ArticulosDestacados from '@/components/home/ArticulosDestacados';
import { ARTICLES_ENABLED } from '@/lib/flags';
import PixelSparkles from '@/components/shared/PixelSparkles';
import PixelIcon from '@/components/shared/PixelIcon';
import PicaLogo from '@/components/shared/PicaLogo';
import { LANDSCAPE_SIZE } from '@/lib/assets';
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
  // Temática en hover: su color se expande en la ColorBar de abajo.
  const [hoveredTema, setHoveredTema] = useState<Tematica | null>(null);
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
      {/* Suelo (manzanas) + calles generadas + puntos, a todo el viewport,
          detrás de todo — SOLO DESKTOP. En mobile la ciudad es el carrusel, con
          su propia calle alrededor de cada edificio (no la grilla de desktop). */}
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
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 max-md:hidden"
        style={{
          width: `min(93vw, calc((100vh - 150px) * ${ASPECT}))`,
          height: `min(100vh - 150px, calc(93vw / ${ASPECT}))`,
        }}
      >
        {/* Los puntos ya no van dentro del stage: viven en el canvas a viewport
            completo (arriba), debajo de los edificios. El overlay tampoco va
            acá: se monta a PANTALLA COMPLETA (ya no hay marco de mapa). */}
        <CityLandscape
          selectedTema={selected?.tema ?? null}
          onSelect={handleSelect}
          onHoverTema={setHoveredTema}
        />

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

      {/* MOBILE — carrusel de edificios a pantalla completa (Fase 2): reemplaza
          el mapa + botones + notas. Cubre el viewport (fixed) debajo del header. */}
      <div className="md:hidden">
        <MobileCityCarousel />
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

      {/* Barra de temáticas en el borde inferior — el color del edificio en
          hover se expande a toda la barra */}
      <ColorBar hovered={hoveredTema} />
      </section>

      {/* Sección de lecturas — oculta tras flag hasta tener los copys reales
          (hoy son tarjetas placeholder). Reactivar con ARTICLES_ENABLED. */}
      {ARTICLES_ENABLED && <ArticulosDestacados />}
    </main>
  );
}
