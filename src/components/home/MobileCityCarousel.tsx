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

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { SPRITE_COLORS, TEMA_COLOR, TEMA_LABEL, TEMA_ORDER } from '@/lib/colors';
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

/**
 * Calle propia de cada edificio (mobile): una elipse "de calzada" alrededor de
 * la base con PÍXELES de color circulando. No usa las calles de desktop.
 */
function BuildingRoad({ w, h }: { w: number; h: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || w < 4 || h < 4) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = w;
    canvas.height = h;
    const cx = w / 2;
    const cy = h * 0.84; // a la altura de la base del edificio
    const rx = w * 0.45;
    const ry = Math.max(9, w * 0.11); // aplastada (perspectiva isométrica)
    const roadW = Math.max(6, w * 0.045);
    const dots = Array.from({ length: 18 }, (_, i) => ({
      a: (i / 18) * Math.PI * 2,
      spd: (0.3 + Math.random() * 0.4) * (Math.random() < 0.5 ? 1 : -1),
      col: SPRITE_COLORS[Math.floor(Math.random() * SPRITE_COLORS.length)]!,
      s: Math.random() < 0.5 ? 2 : 3,
    }));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();
    const ellipse = () => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    };
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#1E1E1E'; // vereda
      ctx.lineWidth = roadW + 3;
      ellipse();
      ctx.stroke();
      ctx.strokeStyle = '#161616'; // calzada
      ctx.lineWidth = roadW;
      ellipse();
      ctx.stroke();
      ctx.strokeStyle = '#242424'; // eje punteado
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ellipse();
      ctx.stroke();
      ctx.setLineDash([]);
      for (const d of dots) {
        if (!reduced) d.a += d.spd * dt;
        const x = cx + Math.cos(d.a) * rx;
        const y = cy + Math.sin(d.a) * ry;
        ctx.fillStyle = d.col;
        ctx.fillRect(Math.round(x - d.s / 2), Math.round(y - d.s / 2), d.s, d.s);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [w, h]);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ imageRendering: 'pixelated', width: w, height: h }}
    />
  );
}

/** Edificio recortado a su bbox + su calle alrededor (con píxeles circulando).
 *  Se mide el área útil y se contiene el conjunto (edificio + calle). */
function BuildingCrop({ layer, poly }: { layer: string; poly: Polygon }) {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const { x0, y0, bw, bh } = bbox(poly);
  const aspect = (bw * LANDSCAPE_SIZE.width) / (bh * LANDSCAPE_SIZE.height);
  useEffect(() => {
    const update = () => {
      // Área útil ≈ viewport menos header, caja, indicador y aire. El edificio
      // se achica (0.72) para dejar lugar a la calle que lo rodea.
      const availW = window.innerWidth - 40;
      const availH = window.innerHeight - 230;
      const margin = 0.72;
      let w = availW * margin;
      let h = w / aspect;
      const maxH = availH * margin;
      if (h > maxH) {
        h = maxH;
        w = h * aspect;
      }
      setSize({ w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [aspect]);
  // Caja de la calle: rodea al edificio (más ancha y con lugar abajo).
  const rbW = Math.round(size.w * 1.34);
  const rbH = Math.round(size.h * 1.28);
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: rbW || undefined, height: rbH || undefined }}
    >
      {rbW > 4 && <BuildingRoad w={rbW} h={rbH} />}
      <div
        className="relative overflow-hidden"
        style={{ width: size.w || undefined, height: size.h || undefined }}
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
  // Punto donde bajó el puntero: si al soltar casi no se movió → es un TAP
  // (selecciona); si se movió → fue un swipe (cambia de slide, no selecciona).
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null);
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
      {/* Suelo propio de mobile (manzanas + textura) — NO usa las calles de
          desktop; cada edificio trae su calle alrededor (ver Building). */}
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
            // Tap vs swipe por distancia real del puntero: arrastrar NO selecciona,
            // solo un tap (casi sin movimiento) entra a la temática. Se usan los
            // handlers de CAPTURA porque Framer (drag) corta la propagación en
            // burbuja y los onPointer* normales no llegarían.
            onPointerDownCapture={(e) => {
              downRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
            }}
            onPointerUpCapture={(e) => {
              const d = downRef.current;
              downRef.current = null;
              if (
                d &&
                Math.abs(e.clientX - d.x) < 12 &&
                Math.abs(e.clientY - d.y) < 12 &&
                Date.now() - d.t < 500
              ) {
                enter(slide);
              }
            }}
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
