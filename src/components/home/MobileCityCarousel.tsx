'use client';

/* eslint-disable @next/next/no-img-element */
// Los edificios son PNGs de pixel art (4096×2305): <img> sin optimizar,
// recortado a su bounding-box para mostrar solo el edificio.

// ─────────────────────────────────────────────────────────────────────────────
// PICA — MobileCityCarousel (Fase 2)
// En mobile la ciudad se explora como un CARRUSEL a pantalla completa: cada
// tarjeta es un edificio recortado + una caja con el color de la temática.
// 6 tarjetas: las 5 temáticas + el Palacio (dato al azar, no sale del Home).
// Swipe horizontal (Framer, solo eje X) + flechas + teclado. Los puntos de
// color siguen de fondo. No escribe la URL hasta entrar a una temática.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  assetUrl,
  BUILDING_HITBOX_POLYGONS,
  BUILDING_LAYERS,
  LANDSCAPE_PALACIO,
  LANDSCAPE_SIZE,
  PALACIO_HITBOX_POLYGON,
  type Polygon,
} from '@/lib/assets';
import { TEMA_COLOR, TEMA_LABEL, TEMA_ORDER } from '@/lib/colors';
import { getEntidades } from '@/lib/datasets';
import { slugify } from '@/lib/slug';
import UruguayFlag from '@/components/shared/UruguayFlag';
import RandomOverlay from './RandomOverlay';
import type { Tematica } from '@/types/sprites';

const NEUTRAL = '#EBEBEB';

type Slide = { kind: 'tema'; tema: Tematica } | { kind: 'palacio' };
const SLIDES: Slide[] = [
  ...TEMA_ORDER.map((tema) => ({ kind: 'tema' as const, tema })),
  { kind: 'palacio' as const },
];

/** Bounding-box (0–1) del polígono, con un margen para no cortar el arte. */
function bbox(poly: Polygon, pad = 0.05) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x0 = Math.max(0, Math.min(...xs) - pad);
  const y0 = Math.max(0, Math.min(...ys) - pad);
  const x1 = Math.min(1, Math.max(...xs) + pad);
  const y1 = Math.min(1, Math.max(...ys) + pad);
  return { x0, y0, bw: x1 - x0, bh: y1 - y0 };
}

/** Edificio recortado a su bbox desde la capa PNG completa. */
function BuildingCrop({ layer, poly }: { layer: string; poly: Polygon }) {
  const { x0, y0, bw, bh } = bbox(poly);
  const aspect = (bw * LANDSCAPE_SIZE.width) / (bh * LANDSCAPE_SIZE.height);
  return (
    <div
      className="relative max-h-full max-w-full overflow-hidden"
      style={{ aspectRatio: `${aspect}`, height: '100%' }}
    >
      <img
        src={assetUrl(layer)}
        alt=""
        aria-hidden="true"
        className="absolute max-w-none"
        style={{
          width: `${100 / bw}%`,
          height: `${100 / bh}%`,
          left: `${(-100 * x0) / bw}%`,
          top: `${(-100 * y0) / bh}%`,
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

export default function MobileCityCarousel() {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const [[page, dir], setPage] = useState<[number, number]>([0, 0]);
  const [palacioOpen, setPalacioOpen] = useState(false);
  const n = SLIDES.length;
  const idx = ((page % n) + n) % n;
  const slide = SLIDES[idx]!;

  const paginate = useCallback((d: number) => setPage(([p]) => [p + d, d]), []);

  // Entrar a la tarjeta activa: temática → /interactivo; Palacio → dato al azar.
  const enter = useCallback(
    (s: Slide) => {
      if (s.kind === 'palacio') setPalacioOpen(true);
      else router.push(`/interactivo?tema=${slugify(s.tema)}`);
    },
    [router],
  );

  // Teclado: ←/→ navegan, Enter entra.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (palacioOpen) return;
      if (e.key === 'ArrowRight') paginate(1);
      else if (e.key === 'ArrowLeft') paginate(-1);
      else if (e.key === 'Enter') enter(SLIDES[((page % n) + n) % n]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paginate, enter, page, n, palacioOpen]);

  const color = slide.kind === 'tema' ? TEMA_COLOR[slide.tema] : NEUTRAL;
  const spring = reduce
    ? { duration: 0 }
    : { x: { type: 'spring' as const, stiffness: 300, damping: 34 }, opacity: { duration: 0.2 } };

  return (
    <div className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-bg-base px-5 pb-8 pt-16">
      {/* Suelo (manzanas) sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundColor: '#0D0D0D',
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 6px)',
        }}
      />

      {/* Región del carrusel */}
      <div
        className="relative z-10 flex flex-1 items-stretch"
        role="group"
        aria-roledescription="carrusel"
        aria-label="Temáticas de Pica"
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={page}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70 || info.velocity.x < -450) paginate(1);
              else if (info.offset.x > 70 || info.velocity.x > 450) paginate(-1);
            }}
            // onTap distingue tap de swipe (un botón hijo dentro del drag se
            // "come" el click). Tocar el edificio o la caja entra a la temática.
            onTap={() => enter(slide)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                enter(slide);
              }
            }}
            aria-label={
              slide.kind === 'tema'
                ? `${TEMA_LABEL[slide.tema]}: ${getEntidades(slide.tema).length} entidades — tocá para explorar`
                : 'Dato al azar del Palacio Legislativo — tocá para descubrir'
            }
            className="absolute inset-0 flex cursor-pointer touch-pan-y flex-col items-center justify-center gap-5"
          >
            {/* Edificio */}
            <div
              className="flex min-h-0 flex-1 items-center justify-center"
              style={{ imageRendering: 'pixelated' }}
            >
              {slide.kind === 'tema' ? (
                <BuildingCrop layer={BUILDING_LAYERS[slide.tema]} poly={BUILDING_HITBOX_POLYGONS[slide.tema]} />
              ) : (
                <BuildingCrop layer={LANDSCAPE_PALACIO} poly={PALACIO_HITBOX_POLYGON} />
              )}
            </div>

            {/* Caja con color de la temática (o neutra en el Palacio) */}
            <div
              className="w-full max-w-md shrink-0 border-2 px-5 py-3 text-left"
              style={{
                borderColor: color,
                background: `linear-gradient(180deg, ${color}1F, ${color}0A)`,
              }}
            >
              {slide.kind === 'tema' ? (
                <>
                  <span
                    className="flex items-center gap-2 font-display text-pica-title font-bold uppercase"
                    style={{ color, letterSpacing: '0.08em' }}
                  >
                    {TEMA_LABEL[slide.tema]}
                    <span aria-hidden="true" className="ml-auto text-pica-button">
                      →
                    </span>
                  </span>
                  <span className="mt-0.5 block font-sans text-pica-subtitle text-text-secondary">
                    {getEntidades(slide.tema).length} entidades para explorar
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-2 font-display text-pica-title font-bold uppercase text-text-primary" style={{ letterSpacing: '0.08em' }}>
                    <UruguayFlag height={18} />
                    Dato al azar
                    <span aria-hidden="true" className="ml-auto text-pica-button">
                      ↗
                    </span>
                  </span>
                  <span className="mt-0.5 block font-sans text-pica-subtitle text-text-secondary">
                    Palacio Legislativo — una estadística al azar de cualquier temática.
                  </span>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Flechas (a11y: navegación sin gesto) */}
        <button
          type="button"
          onClick={() => paginate(-1)}
          aria-label="Anterior"
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2 border border-white/20 bg-black/50 p-1.5 font-display text-pica-button text-text-primary active:bg-black/70"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => paginate(1)}
          aria-label="Siguiente"
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2 border border-white/20 bg-black/50 p-1.5 font-display text-pica-button text-text-primary active:bg-black/70"
        >
          ›
        </button>
      </div>

      {/* Indicador de posición */}
      <div className="relative z-10 mt-4 flex items-center justify-center gap-2" aria-hidden="true">
        {SLIDES.map((s, i) => {
          const c = s.kind === 'tema' ? TEMA_COLOR[s.tema] : NEUTRAL;
          return (
            <span
              key={i}
              className="h-2 w-2 transition-all"
              style={{
                backgroundColor: i === idx ? c : 'rgba(235,235,235,0.25)',
                width: i === idx ? 18 : 8,
              }}
            />
          );
        })}
      </div>

      {/* Palacio: dato al azar (no sale del Home) */}
      <AnimatePresence>
        {palacioOpen && <RandomOverlay onClose={() => setPalacioOpen(false)} fullscreen />}
      </AnimatePresence>
    </div>
  );
}
