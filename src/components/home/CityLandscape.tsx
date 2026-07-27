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

import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  assetUrl,
  BUILDING_HITBOX_POLYGONS,
  BUILDING_FOOTPRINT,
  BUILDING_LAYER_ORDER_ABOVE_PALACIO,
  BUILDING_LAYER_ORDER_BELOW_PALACIO,
  BUILDING_LAYERS,
  BUILDING_PLACEMENT,
  LANDSCAPE_PALACIO,
  PALACIO_FLAG_ANCHOR,
  PALACIO_HITBOX_POLYGON,
  polygonCentroid,
  polygonClipPath,
  type Placement,
} from '@/lib/assets';
import PalacioFlag from '@/components/home/PalacioFlag';
import WindowTwinkles from '@/components/home/WindowTwinkles';
import { ACTIVE_TEMAS, isTemaActive, TEMA_COLOR, TEMA_LABEL, TEMA_ORDER } from '@/lib/colors';
import { STREET_PATHS } from '@/hooks/useColorDots';
import {
  CALIBRATION_EVENT,
  calibration,
  type CalibrationMode,
} from './calibrationState';
import type { Tematica } from '@/types/sprites';

// Debug temporal (poner en true para ver hitboxes y paths sobre el landscape).
const DEBUG_HITBOXES = false;
const DEBUG_PATHS = false;

/** Lo clickeable del mapa: las 5 temáticas o el Palacio ("dato al azar"). */
export type Seleccionable = Tematica | 'palacio';

interface CityLandscapeProps {
  selectedTema: Seleccionable | null;
  onSelect: (tema: Seleccionable, centerPct: { x: number; y: number }) => void;
  /** Canvas de puntos (se inserta entre el fondo y las capas de edificios). */
  children?: React.ReactNode;
  /** Notifica qué temática está en hover (para expandir su color en la ColorBar).
   *  El Palacio no es temática → null. */
  onHoverTema?: (t: Tematica | null) => void;
}

// Cada edificio es un SPRITE RECORTADO posicionado en el stage (antes era un
// lienzo completo 4096×2305 con la posición horneada en los píxeles). La
// posición/tamaño sale de BUILDING_PLACEMENT, en fracciones del stage.
const layerClass = 'pointer-events-none absolute';
const pixelated = { imageRendering: 'pixelated' as const };

/** Posición del sprite en el stage, en % — la comparten el edificio y su muro. */
function placementStyle(p: Placement): React.CSSProperties {
  return {
    left: `${p.left * 100}%`,
    top: `${p.top * 100}%`,
    width: `${p.width * 100}%`,
    height: `${p.height * 100}%`,
  };
}
const GRAYSCALE = 'grayscale(100%) brightness(0.5)';

// Relieve: al hover/click el edificio se ELEVA y del basamento sube un MURO que
// rellena el hueco — igual que en mobile. Fracciones del alto del sprite.
const LIFT_HOVER = 0.028;
const LIFT_SELECTED = 0.055;
/** Caras del muro: izquierda en sombra, derecha recibiendo luz. */
const WALL_LEFT = '#242424';
const WALL_RIGHT = '#333333';
const WALL_EDGE = '#3C3C3C';

/**
 * Muro/basamento en SVG: extruye las dos caras frontales del rombo de base del
 * arte (BUILDING_FOOTPRINT) desde el piso hasta la base elevada. Misma técnica
 * que el canvas de mobile, pero en coordenadas del stage. Reemplaza al truco
 * viejo (duplicar el sprite oscurecido detrás), que era una aproximación.
 *
 * El viewBox 0–100 con preserveAspectRatio="none" hace que x/y sean porcentajes
 * del stage, el mismo sistema que BUILDING_PLACEMENT — así el muro calza con el
 * borde del arte por construcción.
 */
function BuildingWall({ tema, lift }: { tema: Tematica | 'palacio'; lift: number }) {
  if (lift <= 0) return null;
  const p = BUILDING_PLACEMENT[tema];
  const f = BUILDING_FOOTPRINT[tema];
  const h = lift * p.height * 100; // altura del muro, en % del stage
  const gy = (p.top + f.groundY * p.height) * 100; // plano del piso
  const by = (p.top + f.bottomY * p.height) * 100; // vértice frontal
  const lx = p.left * 100;
  const rx = (p.left + p.width) * 100;
  const bx = (p.left + f.bottomX * p.width) * 100;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* cara izquierda (sombra) */}
      <polygon points={`${lx},${gy} ${bx},${by} ${bx},${by - h} ${lx},${gy - h}`} fill={WALL_LEFT} />
      {/* cara derecha (luz) */}
      <polygon points={`${bx},${by} ${rx},${gy} ${rx},${gy - h} ${bx},${by - h}`} fill={WALL_RIGHT} />
      {/* aristas verticales, para definir el volumen */}
      <g stroke={WALL_EDGE} strokeWidth={0.12}>
        <line x1={lx} y1={gy} x2={lx} y2={gy - h} />
        <line x1={bx} y1={by} x2={bx} y2={by - h} />
        <line x1={rx} y1={gy} x2={rx} y2={gy - h} />
      </g>
    </svg>
  );
}

export default function CityLandscape({ selectedTema, onSelect, children, onHoverTema }: CityLandscapeProps) {
  // Hover sobre un edificio: cartel con la temática + elevación intermedia
  const [hoveredTema, setHoveredTema] = useState<Seleccionable | null>(null);
  const hoveredRef = useRef<Seleccionable | null>(null);
  hoveredRef.current = hoveredTema;

  // Avisar al padre qué temática está en hover (el Palacio no es temática).
  useEffect(() => {
    onHoverTema?.(hoveredTema && hoveredTema !== 'palacio' ? hoveredTema : null);
  }, [hoveredTema, onHoverTema]);

  // Con el PlacementCalibrator (tecla E) activo, los edificios reales quedan en
  // FANTASMA: así se ve dónde estaban mientras se arrastran los de la herramienta.
  const [calMode, setCalMode] = useState<CalibrationMode>(calibration.mode);
  useEffect(() => {
    const onMode = (e: Event) => setCalMode((e as CustomEvent<CalibrationMode>).detail);
    window.addEventListener(CALIBRATION_EVENT, onMode);
    return () => window.removeEventListener(CALIBRATION_EVENT, onMode);
  }, []);
  const ghost = calMode === 'placement' ? 0.16 : undefined;

  // Modo "atract": sin interacción, cada tanto un edificio destella con su
  // color rotando entre las temáticas activas — invita a clickear.
  // Se pausa mientras hay hover (para no confundir con otro edificio).
  const [pulseTema, setPulseTema] = useState<Tematica | null>(null);
  useEffect(() => {
    if (selectedTema || hoveredTema) {
      setPulseTema(null);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    const interval = setInterval(() => {
      if (hoveredRef.current) return; // no destellar mientras se explora con hover
      setPulseTema(ACTIVE_TEMAS[i % ACTIVE_TEMAS.length]!);
      i++;
      setTimeout(() => setPulseTema(null), 1900);
    }, 4200);
    return () => clearInterval(interval);
  }, [selectedTema, hoveredTema]);

  // Palacio ("dato al azar"): mismo lenguaje de hover/selección que los
  // edificios de temática, en BLANCO (no es una temática).
  const palacioSel = selectedTema === 'palacio';
  const palacioHov = hoveredTema === 'palacio';
  const pS = palacioHov && !palacioSel ? 1 : 0; // glow solo en hover, no al seleccionar
  const palacioGrayed = Boolean(selectedTema) && !palacioSel;
  // Relieve: al hover/click el edificio se ELEVA del suelo. La sombra proyectada
  // abajo (drop-shadow oscuro con offset) lo ancla al piso → sube, no flota.
  const palacioLift = palacioGrayed ? 0 : palacioSel ? 2 : palacioHov ? 1 : 0;
  const palacioLiftF = palacioLift === 2 ? LIFT_SELECTED : palacioLift === 1 ? LIFT_HOVER : 0;
  const palacioGsA = palacioLift === 2 ? 0.6 : palacioLift === 1 ? 0.4 : 0;
  const palacioStyle: React.CSSProperties = {
    ...pixelated,
    ...placementStyle(BUILDING_PLACEMENT.palacio),
    opacity: ghost,
    filter: palacioGrayed
      ? GRAYSCALE
      : `drop-shadow(0 0 3px color-mix(in srgb, #EBEBEB ${pS * 100}%, transparent)) drop-shadow(0 0 8px color-mix(in srgb, #EBEBEB ${pS * 40}%, transparent)) drop-shadow(0 18px 14px rgba(0,0,0,${palacioGsA}))`,
    transform: `translateY(-${(palacioLiftF * 100).toFixed(2)}%)`,
    transition: 'filter 350ms ease, transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  /** Una temática: su muro (basamento) + la capa real, compartiendo emplazamiento. */
  const renderBuilding = (tema: Tematica) => {
    const isSelected = selectedTema === tema;
    const isHovered = hoveredTema === tema;
    const isPulsing = pulseTema === tema && !selectedTema && !isHovered;
    const glow = TEMA_COLOR[tema];
    const grayed = Boolean(selectedTema) && !isSelected;
    // Relieve: el edificio se ELEVA al hover (leve) y al click (más alto). La
    // sombra proyectada abajo lo ancla al suelo → sube del piso, no flota.
    const lvl = grayed ? 0 : isSelected ? 2 : isHovered ? 1 : 0;
    const liftF = lvl === 2 ? LIFT_SELECTED : lvl === 1 ? LIFT_HOVER : 0;
    const lift = `-${(liftF * 100).toFixed(2)}%`;
    const gsA = lvl === 2 ? 0.6 : lvl === 1 ? 0.4 : 0; // alpha de la sombra al piso
    // Destello SOSTENIDO en hover (sutil); el pulso periódico va por la clase.
    // El drop-shadow está SIEMPRE presente (mismos radios) y solo varía la
    // intensidad del color/alpha — CSS no interpola desde `filter: none`, así
    // que mantenerlo permite que la transición de 350ms sea gradual, no un salto.
    // Al SELECCIONAR el glow se apaga: ahí la lectura la dan el relieve (muro)
    // y el cartel, y el color ya lo aporta el contraste contra el grayscale.
    const s = isHovered && !isSelected ? 1 : 0; // fuerza del destello (0→1)
    const filter = grayed
      ? GRAYSCALE
      : `drop-shadow(0 0 3px color-mix(in srgb, ${glow} ${s * 100}%, transparent)) drop-shadow(0 0 8px color-mix(in srgb, ${glow} ${s * 40}%, transparent)) drop-shadow(0 18px 14px rgba(0,0,0,${gsA}))`;
    const place = placementStyle(BUILDING_PLACEMENT[tema]);
    return (
      <Fragment key={tema}>
        {/* Muro que sube del basamento y rellena el hueco al elevarse. */}
        <BuildingWall tema={tema} lift={liftF} />
        <img
          src={assetUrl(BUILDING_LAYERS[tema])}
          alt=""
          className={`${layerClass}${isPulsing ? ' pica-attract' : ''}`}
          style={{
            ...pixelated,
            ...place,
            '--glow': glow,
            opacity: ghost,
            filter,
            transform: `translateY(${lift})`,
            transition: 'filter 350ms ease, transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
          } as React.CSSProperties}
        />
      </Fragment>
    );
  };

  return (
    <div
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="Ciudad de Montevideo en pixel art isométrico — clickeá un edificio para descubrir su temática"
    >
      {/* La ciudad son los EDIFICIOS sobre las calles generadas (StreetGrid),
          no una foto de fondo: la imagen completa (Landscape_complete) ya no se
          usa en ningún lado, así que no se carga. */}

      {/* Canvas de puntos de colores (debajo de los edificios) */}
      {children}

      {/* 3. Capas de edificios por encima — ocultan los puntos que pasan detrás.
             Orden (abajo → arriba): las cuatro que no se solapan, el PALACIO, y
             ECONOMÍA arriba de todo. Al seleccionar, todas se desaturan menos la
             elegida. Con este orden el Palacio ya no necesita renderizarse dos
             veces (antes iba detrás y delante para tapar el sangrado del glow). */}
      {BUILDING_LAYER_ORDER_BELOW_PALACIO.map(renderBuilding)}

      {/* Muro del Palacio: sube del basamento al elevarse. */}
      <BuildingWall tema="palacio" lift={palacioLiftF} />
      <img src={assetUrl(LANDSCAPE_PALACIO)} alt="" className={layerClass} style={palacioStyle} />

      {/* Economía va ARRIBA de todo (incluido el Palacio). */}
      {BUILDING_LAYER_ORDER_ABOVE_PALACIO.map(renderBuilding)}

      {/* Bandera de Uruguay: se IZA al clickear el Palacio. Va ENCIMA de todas
          las capas — el ancla está sobre el techo y, si se renderiza antes, el
          propio Palacio la tapa y no se ve. */}
      <AnimatePresence>
        {palacioSel && <PalacioFlag anchor={PALACIO_FLAG_ANCHOR} />}
      </AnimatePresence>

      {/* 3c. Microvida: ventanas encendiéndose y apagándose en los edificios */}
      <WindowTwinkles selectedTema={selectedTema} />

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

      {/* 4b-pre. Hitbox del PALACIO (dato al azar) — va ANTES que las temáticas
          para que, en zonas de solape, ganen los edificios de temática. */}
      {(() => {
        const poly = PALACIO_HITBOX_POLYGON;
        const center = polygonCentroid(poly);
        return (
          <div className="contents">
            <button
              type="button"
              onClick={() => onSelect('palacio', center)}
              onMouseEnter={() => setHoveredTema('palacio')}
              onMouseLeave={() => setHoveredTema(null)}
              onFocus={() => setHoveredTema('palacio')}
              onBlur={() => setHoveredTema(null)}
              aria-label="¡Pica! — descubrir una estadística al azar (Palacio Legislativo)"
              aria-pressed={palacioSel}
              className="absolute inset-0 cursor-pointer"
              style={{ clipPath: polygonClipPath(poly) }}
            />
            {/* Sin cartel de hover: el destello del edificio alcanza (y al
                clickear, la bandera cuenta la historia). */}
          </div>
        );
      })()}

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

        // Vértice MÁS ALTO de la hitbox (menor y): el cartel se cuelga ahí, no
        // sobre el centroide — así queda justo encima de la parte más alta del
        // edificio (la torre, la antena) y no flotando sobre el medio.
        const apex = poly.reduce((a, b) => (b[1] < a[1] ? b : a));

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
                style={{ left: `${apex[0] * 100}%`, top: `${apex[1] * 100}%` }}
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
