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
import { assetUrl, LANDSCAPE_SIZE, LOGOS } from '@/lib/assets';
import type { Tematica } from '@/types/sprites';

const ASPECT = LANDSCAPE_SIZE.width / LANDSCAPE_SIZE.height;

interface Selection {
  tema: Tematica;
  center: { x: number; y: number };
}

export default function HomePage() {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

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
    <main className="relative h-screen w-screen overflow-hidden bg-bg-base">
      {/* Stage: landscape CONTENIDO (no full-bleed), centrado con margen oscuro */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl"
        style={{
          width: `min(90vw, calc((100vh - 170px) * ${ASPECT}))`,
          height: `min(100vh - 170px, calc(90vw / ${ASPECT}))`,
        }}
      >
        <CityLandscape selectedTema={selected?.tema ?? null} onSelect={handleSelect}>
          {/* El canvas de puntos va DEBAJO de las capas de edificios (ver CityLandscape) */}
          <HomeCanvas
            convergeTarget={selected?.center ?? null}
            onConverged={handleConverged}
          />
        </CityLandscape>

        {/* Overlay de temática — aparece al completarse la convergencia */}
        <AnimatePresence>
          {overlayOpen && selected && (
            <ThemeOverlay tema={selected.tema} onClose={handleClose} />
          )}
        </AnimatePresence>

        {/* Herramientas de calibración (dev) — dentro del stage para que las
            coordenadas % coincidan con el landscape. P = paths, H = hitboxes */}
        <PathCalibrator />
        <HitboxCalibrator />
      </div>

      {/* Navegación — logo a la izquierda + link a Nosotros */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-6">
        <Link href="/" aria-label="Pica — inicio">
          <img
            src={assetUrl(LOGOS.navbar.light)}
            alt="Pica"
            className="h-12 w-auto"
            style={{ imageRendering: 'pixelated' }}
          />
        </Link>
        <Link
          href="/nosotros"
          className="font-display text-pica-button text-text-primary underline-offset-4 hover:underline"
        >
          Nosotros
        </Link>
      </header>

      {/* Barra de temáticas en el borde inferior */}
      <ColorBar />
    </main>
  );
}
