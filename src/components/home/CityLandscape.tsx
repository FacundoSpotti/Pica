'use client';

/* eslint-disable @next/next/no-img-element */
// Se usa <img> a propósito: son PNGs grandes de pixel art (4096×2305) que deben
// renderizarse SIN suavizado (image-rendering: pixelated). next/image optimiza
// y suaviza, lo que rompe la estética. Ver pica-home / pica-ui.

// ─────────────────────────────────────────────────────────────────────────────
// PICA — CityLandscape
// Estado default: la ciudad COMPLETA en una sola imagen (Landscape_complete.png).
// Al seleccionar una temática: la ciudad completa se desatura y encima se dibuja
// la capa del edificio elegido en color.
//
// Hitboxes: polígonos (clip-path) ajustados al contorno de cada edificio, sin
// solaparse. DEBUG_HITBOXES pinta el área en rojo para verificar dónde caen.
// ─────────────────────────────────────────────────────────────────────────────

import {
  assetUrl,
  BUILDING_HITBOX_POLYGONS,
  BUILDING_LAYERS,
  LANDSCAPE_COMPLETE,
  polygonCentroid,
  polygonClipPath,
} from '@/lib/assets';
import { isTemaActive, TEMA_COLOR, TEMA_LABEL, TEMA_ORDER } from '@/lib/colors';
import type { Tematica } from '@/types/sprites';

// Debug temporal: pinta el polígono de cada hitbox para verificar dónde cae.
// Poner en false para ocultarlas.
const DEBUG_HITBOXES = true;

interface CityLandscapeProps {
  selectedTema: Tematica | null;
  onSelect: (tema: Tematica, centerPct: { x: number; y: number }) => void;
}

const layerClass = 'pointer-events-none absolute inset-0 h-full w-full object-fill';
const pixelated = { imageRendering: 'pixelated' as const };

export default function CityLandscape({ selectedTema, onSelect }: CityLandscapeProps) {
  const cityFilter = selectedTema ? 'grayscale(100%) brightness(0.5)' : 'none';

  return (
    <div className="absolute inset-0 h-full w-full">
      {/* Ciudad completa (una sola imagen) — se desatura al seleccionar */}
      <img
        src={assetUrl(LANDSCAPE_COMPLETE)}
        alt="Ciudad de Montevideo en pixel art isométrico"
        className="absolute inset-0 h-full w-full object-fill transition-[filter] duration-500"
        style={{ ...pixelated, filter: cityFilter }}
      />

      {/* Edificio seleccionado — en color, por encima de la ciudad desaturada */}
      {selectedTema && (
        <img
          src={assetUrl(BUILDING_LAYERS[selectedTema])}
          alt=""
          className={layerClass}
          style={pixelated}
        />
      )}

      {/* Hitboxes (polígonos). Clickeables solo V1; debug muestra las 5 */}
      {TEMA_ORDER.map((tema) => {
        const poly = BUILDING_HITBOX_POLYGONS[tema];
        const active = isTemaActive(tema);
        const isSelected = selectedTema === tema;
        const center = polygonCentroid(poly);

        const clipStyle: React.CSSProperties = {
          clipPath: polygonClipPath(poly),
          ...(DEBUG_HITBOXES
            ? { background: isSelected ? 'rgba(0,255,0,0.25)' : 'rgba(255,0,0,0.22)' }
            : {}),
        };

        const debugLabel = DEBUG_HITBOXES ? (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-black/80 px-1 text-[11px] leading-tight text-white"
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

        // V2: no clickeable — en debug se muestra el polígono sin interacción
        if (!active) {
          if (!DEBUG_HITBOXES) return null;
          return (
            <div key={tema} className="contents">
              <div className="pointer-events-none absolute inset-0" style={clipStyle} />
              {debugLabel}
            </div>
          );
        }

        return (
          <div key={tema} className="contents">
            <button
              type="button"
              onClick={() => onSelect(tema, center)}
              aria-label={`Explorar temática ${TEMA_LABEL[tema]}`}
              aria-pressed={isSelected}
              className="absolute inset-0 cursor-pointer"
              style={clipStyle}
            />
            {debugLabel}
          </div>
        );
      })}
    </div>
  );
}
