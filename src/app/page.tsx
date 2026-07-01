'use client';

/* eslint-disable @next/next/no-img-element */
// El logo es un SVG de pixel art: <img> directo, sin optimización de next/image.

// ─────────────────────────────────────────────────────────────────────────────
// PICA — Home (/)
// Landscape isométrico + puntos de colores + click en edificios.
// El "stage" mantiene la relación de aspecto exacta del landscape (4096×2305)
// y se dimensiona para CUBRIR el viewport con max() de CSS, de modo que las
// capas, el canvas de puntos y las hitboxes compartan el mismo sistema de
// coordenadas en % y queden siempre alineados.
// (Sin ThemeOverlay todavía — eso es la próxima tarea.)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import CityLandscape from '@/components/home/CityLandscape';
import HomeCanvas from '@/components/home/HomeCanvas';
import ColorBar from '@/components/home/ColorBar';
import { assetUrl, LANDSCAPE_SIZE, LOGOS } from '@/lib/assets';
import type { Tematica } from '@/types/sprites';

const ASPECT = LANDSCAPE_SIZE.width / LANDSCAPE_SIZE.height;

interface Selection {
  tema: Tematica;
  center: { x: number; y: number };
}

export default function HomePage() {
  const [selected, setSelected] = useState<Selection | null>(null);

  const handleSelect = (tema: Tematica, center: { x: number; y: number }) => {
    // Toggle: volver a clickear el mismo edificio deselecciona (vía de retorno
    // provisoria hasta que exista el ThemeOverlay con su botón VOLVER).
    setSelected((prev) => (prev?.tema === tema ? null : { tema, center }));
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg-base">
      {/* Stage: landscape CONTENIDO (no full-bleed), centrado con margen oscuro.
          Mantiene la relación de aspecto y entra completo en el viewport dejando
          espacio para la nav (arriba) y la ColorBar (abajo). */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl"
        style={{
          width: `min(90vw, calc((100vh - 170px) * ${ASPECT}))`,
          height: `min(100vh - 170px, calc(90vw / ${ASPECT}))`,
        }}
      >
        <CityLandscape selectedTema={selected?.tema ?? null} onSelect={handleSelect} />
        <HomeCanvas convergeTarget={selected?.center ?? null} />
      </div>

      {/* Navegación — logo a la izquierda + link a Nosotros */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-6">
        <Link href="/" aria-label="Pica — inicio">
          <img
            src={assetUrl(LOGOS.navbar.dark)}
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
