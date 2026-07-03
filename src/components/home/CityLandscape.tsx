'use client';

/* eslint-disable @next/next/no-img-element */
// Se usa <img> a propósito: son PNGs grandes de pixel art (4096×2305) que deben
// renderizarse SIN suavizado (image-rendering: pixelated). next/image optimiza
// y suaviza, lo que rompe la estética. Ver pica-home / pica-ui.

// ─────────────────────────────────────────────────────────────────────────────
// PICA — CityLandscape
//
// Orden de capas (z, de abajo hacia arriba):
//   1. Landscape_complete.png (ciudad completa)
//   2. Canvas de puntos de colores  ← {children}
//   3. Capas de edificios (palacio + 5) — TAPAN los puntos que pasan por detrás
//   4. Overlay de debug (paths + hitboxes)
//
// Al seleccionar una temática: la ciudad se desatura (grayscale) y solo la capa
// del edificio elegido queda en color.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  assetUrl,
  BUILDING_HITBOX_POLYGONS,
  BUILDING_LAYER_ORDER,
  BUILDING_LAYERS,
  LANDSCAPE_COMPLETE,
  LANDSCAPE_PALACIO,
  polygonCentroid,
  polygonClipPath,
} from '@/lib/assets';
import { isTemaActive, TEMA_COLOR, TEMA_LABEL, TEMA_ORDER } from '@/lib/colors';
import { STREET_PATHS } from '@/hooks/useColorDots';
import type { Tematica } from '@/types/sprites';

// Debug temporal (poner en true para ver hitboxes y paths sobre el landscape).
const DEBUG_HITBOXES = false;
const DEBUG_PATHS = false;

interface CityLandscapeProps {
  selectedTema: Tematica | null;
  onSelect: (tema: Tematica, centerPct: { x: number; y: number }) => void;
  /** Canvas de puntos (se inserta entre el fondo y las capas de edificios). */
  children?: React.ReactNode;
}

const layerClass = 'pointer-events-none absolute inset-0 h-full w-full object-fill';
const pixelated = { imageRendering: 'pixelated' as const };
const GRAYSCALE = 'grayscale(100%) brightness(0.5)';

export default function CityLandscape({ selectedTema, onSelect, children }: CityLandscapeProps) {
  // Hover sobre un edificio: cartel con la temática + elevación intermedia
  const [hoveredTema, setHoveredTema] = useState<Tematica | null>(null);

  return (
    <div className="absolute inset-0 h-full w-full">
      {/* 1. Ciudad completa — se desatura al seleccionar */}
      <img
        src={assetUrl(LANDSCAPE_COMPLETE)}
        alt="Ciudad de Montevideo en pixel art isométrico"
        className={layerClass}
        style={{ ...pixelated, filter: selectedTema ? GRAYSCALE : 'none' }}
      />

      {/* 2. Canvas de puntos de colores (debajo de los edificios) */}
      {children}

      {/* 3. Capas de edificios por encima — ocultan los puntos que pasan detrás.
             Palacio (decorativo) + las 5 temáticas en BUILDING_LAYER_ORDER:
             trabajo va último porque su antena pasa por encima de salud.
             Al seleccionar, todas se desaturan menos la elegida. */}
      <img
        src={assetUrl(LANDSCAPE_PALACIO)}
        alt=""
        className={layerClass}
        style={{ ...pixelated, filter: selectedTema ? GRAYSCALE : 'none' }}
      />
      {BUILDING_LAYER_ORDER.map((tema) => {
        const isSelected = selectedTema === tema;
        const isHovered = hoveredTema === tema;
        // Dos estados de elevación: hover (leve) y click definitivo (más alto)
        const lift = isSelected ? '-0.9%' : isHovered ? '-0.45%' : '0';
        return (
          <img
            key={tema}
            src={assetUrl(BUILDING_LAYERS[tema])}
            alt=""
            className={layerClass}
            style={{
              ...pixelated,
              filter: selectedTema && !isSelected ? GRAYSCALE : 'none',
              transform: `translateY(${lift})`,
              transition:
                'filter 500ms ease, transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        );
      })}

      {/* 4a. Debug de paths — líneas rojas sobre las calles */}
      {DEBUG_PATHS && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {STREET_PATHS.map((path, i) => (
            <polyline
              key={i}
              points={path.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
              fill="none"
              stroke="red"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      )}

      {/* 4b. Hitboxes (polígonos). Clickeables solo V1; debug muestra las 5 */}
      {TEMA_ORDER.map((tema) => {
        const poly = BUILDING_HITBOX_POLYGONS[tema];
        const active = isTemaActive(tema);
        const isSelected = selectedTema === tema;
        const center = polygonCentroid(poly);

        const clipStyle: React.CSSProperties = {
          clipPath: polygonClipPath(poly),
          ...(DEBUG_HITBOXES
            ? { background: isSelected ? 'rgba(0,255,0,0.25)' : 'rgba(0,220,255,0.25)' }
            : {}),
        };

        const debugLabel = DEBUG_HITBOXES ? (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-black/80 px-1 text-[11px] leading-tight"
            style={{
              left: `${center.x * 100}%`,
              top: `${center.y * 100}%`,
              fontFamily: 'monospace',
              color: TEMA_COLOR[tema],
            }}
          >
            {tema}
            {active ? '' : ' (V2)'}
          </span>
        ) : null;

        if (!active) {
          if (!DEBUG_HITBOXES) return null;
          return (
            <div key={tema} className="contents">
              <div className="pointer-events-none absolute inset-0" style={clipStyle} />
              {debugLabel}
            </div>
          );
        }

        // Punto más alto del edificio (para colgar el cartel de hover encima)
        const topY = Math.min(...poly.map(([, y]) => y));

        return (
          <div key={tema} className="contents">
            <button
              type="button"
              onClick={() => onSelect(tema, center)}
              onMouseEnter={() => setHoveredTema(tema)}
              onMouseLeave={() => setHoveredTema(null)}
              onFocus={() => setHoveredTema(tema)}
              onBlur={() => setHoveredTema(null)}
              aria-label={`Explorar temática ${TEMA_LABEL[tema]}`}
              aria-pressed={isSelected}
              className="absolute inset-0 cursor-pointer"
              style={clipStyle}
            />
            {/* Cartel de hover: temática sobre el edificio */}
            {hoveredTema === tema && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
                style={{ left: `${center.x * 100}%`, top: `${topY * 100}%` }}
              >
                <p
                  className="whitespace-nowrap border-2 bg-black/85 px-3 py-1 font-display text-pica-subtitle font-bold uppercase"
                  style={{ borderColor: TEMA_COLOR[tema], color: TEMA_COLOR[tema], letterSpacing: '0.12em' }}
                >
                  {TEMA_LABEL[tema]}
                </p>
                <div
                  aria-hidden="true"
                  className="mx-auto h-2 w-2 -translate-y-1"
                  style={{ backgroundColor: TEMA_COLOR[tema], transform: 'rotate(45deg)' }}
                />
              </div>
            )}
            {debugLabel}
          </div>
        );
      })}
    </div>
  );
}
