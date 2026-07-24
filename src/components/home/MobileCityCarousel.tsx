'use client';

/* eslint-disable @next/next/no-img-element */
// Los edificios son PNGs de pixel art (4096×2305): <img> sin optimizar,
// recortado a su bounding-box para mostrar solo el edificio.

// ─────────────────────────────────────────────────────────────────────────────
// PICA — MobileCityCarousel (Fase 2)
// En mobile la ciudad se explora como un CARRUSEL a pantalla completa: cada
// tarjeta es un edificio recortado (en B/N) apoyado sobre su "manzana" (rombo
// isométrico con píxeles de color circulando). 6 tarjetas: las 5 temáticas + el
// Palacio (dato al azar, no sale del Home). Swipe horizontal (Framer, eje X) +
// flechas + teclado.
// Al TOCAR un edificio: se pinta a color y los píxeles (personas) ENTRAN al
// edificio mientras la caja del nombre se llena como una barra de progreso; al
// completarse, recién ahí carga la siguiente ventana (/interactivo).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from 'framer-motion';
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
const ENTER_MS = 1800; // duración de la animación de "entrar" antes de navegar

type Slide = { kind: 'tema'; tema: Tematica } | { kind: 'palacio' };
const SLIDES: Slide[] = [
  ...TEMA_ORDER.map((tema) => ({ kind: 'tema' as const, tema })),
  { kind: 'palacio' as const },
];

// Proporciones del rombo (la "manzana") respecto al edificio. Se usan tanto en
// el cálculo de tamaño como al dibujar, así todo queda coherente.
const KHW = 0.5; // medio ancho del rombo = 0.5 × ancho del edificio
const KHH = 0.44; // aplastado isométrico (algo más chato para abrazar la base)
const KBASE = 0.84; // el suelo (centro del rombo) al 84% de la altura del edificio
const KROAD = 0.045; // ancho de la calzada respecto al ancho del edificio

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

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Calle propia de cada edificio (mobile): un ROMBO isométrico de calzada
 * (cuadrado en perspectiva, como la grilla de desktop) con PÍXELES de color
 * circulando por su perímetro. Al ENTRAR, los píxeles convergen hacia el
 * edificio (entran) y se desvanecen. La geometría llega calculada desde arriba
 * para que el edificio quede apoyado sobre el centro del rombo.
 */
function BuildingRoad({
  w,
  h,
  cx,
  cy,
  hw,
  hh,
  entering,
}: {
  w: number;
  h: number;
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  entering: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const enteringRef = useRef(entering);
  useEffect(() => {
    enteringRef.current = entering;
  }, [entering]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || w < 4 || h < 4) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = w;
    canvas.height = h;
    const roadW = Math.max(6, w * KROAD);
    // Vértices del rombo: arriba, derecha, abajo, izquierda.
    const V = [
      { x: cx, y: cy - hh },
      { x: cx + hw, y: cy },
      { x: cx, y: cy + hh },
      { x: cx - hw, y: cy },
    ];
    // Objetivo al "entrar": la base-frente del edificio (centro del rombo, un
    // poco hacia arriba) — ahí es donde los píxeles "entran".
    const target = { x: cx, y: cy - hh * 0.15 };
    const pointAt = (p: number) => {
      const e = Math.floor(p) % 4;
      const t = p - Math.floor(p);
      const a = V[e]!;
      const b = V[(e + 1) % 4]!;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    };
    const dots = Array.from({ length: 20 }, () => ({
      p: Math.random() * 4,
      spd: (0.55 + Math.random() * 0.6) * (Math.random() < 0.5 ? 1 : -1),
      col: SPRITE_COLORS[Math.floor(Math.random() * SPRITE_COLORS.length)]!,
      s: Math.random() < 0.5 ? 2 : 3,
      enterT: 0, // progreso de "entrada" (0→1)
    }));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(V[0]!.x, V[0]!.y);
      ctx.lineTo(V[1]!.x, V[1]!.y);
      ctx.lineTo(V[2]!.x, V[2]!.y);
      ctx.lineTo(V[3]!.x, V[3]!.y);
      ctx.closePath();
    };
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1E1E1E'; // vereda
      ctx.lineWidth = roadW + 3;
      trace();
      ctx.stroke();
      ctx.strokeStyle = '#161616'; // calzada
      ctx.lineWidth = roadW;
      trace();
      ctx.stroke();
      ctx.strokeStyle = '#242424'; // eje punteado
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      trace();
      ctx.stroke();
      ctx.setLineDash([]);
      const ent = enteringRef.current;
      for (const d of dots) {
        const base = pointAt(d.p);
        if (!reduced && !ent) {
          d.p += d.spd * dt;
          d.p = ((d.p % 4) + 4) % 4;
        }
        let x = base.x;
        let y = base.y;
        let alpha = 1;
        if (ent) {
          d.enterT = Math.min(1, d.enterT + dt / 1.1); // entran en ~1.1s
          const e = easeInOut(d.enterT);
          x = base.x + (target.x - base.x) * e;
          y = base.y + (target.y - base.y) * e;
          alpha = 1 - d.enterT;
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = d.col;
        ctx.fillRect(Math.round(x - d.s / 2), Math.round(y - d.s / 2), d.s, d.s);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [w, h, cx, cy, hw, hh]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ imageRendering: 'pixelated', width: w, height: h }}
    />
  );
}

/**
 * Edificio recortado a su bbox, apoyado sobre su "manzana" (rombo). Se mide el
 * área útil y se dimensiona TODO el conjunto (edificio + calle) para que entre
 * completo — la calle nunca se corta abajo. El edificio arranca en B/N y se
 * pinta a color al entrar.
 */
function BuildingCrop({
  layer,
  poly,
  entering,
}: {
  layer: string;
  poly: Polygon;
  entering: boolean;
}) {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const { x0, y0, bw, bh } = bbox(poly);
  const aspect = (bw * LANDSCAPE_SIZE.width) / (bh * LANDSCAPE_SIZE.height);

  useEffect(() => {
    const update = () => {
      const availW = window.innerWidth - 40;
      const availH = window.innerHeight - 240;
      // Se resuelve el tamaño del edificio (sw×sh) para que el ROAD BOX entero
      // entre: vertical estricto (la calle no se corta abajo) y horizontal con
      // un pelín de sangrado permitido (puede salirse un poco de los lados).
      const MW = 1.04; // horizontal: leve sangrado OK
      const MH = 0.97; // vertical: la calle NO se corta
      const a = aspect; // sw/sh
      const cW = 2 * KHW + 2 * KROAD; // rbW = cW × sw
      const cH = KBASE + (KHH * KHW + KROAD) * a; // rbH = cH × sh
      const shByW = (MW * availW) / (cW * a);
      const shByH = (MH * availH) / cH;
      const sh = Math.max(1, Math.floor(Math.min(shByW, shByH)));
      const sw = Math.max(1, Math.round(sh * a));
      setSize({ w: sw, h: sh });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [aspect]);

  // Geometría del rombo (misma proporción que en el cálculo de tamaño).
  const hw = Math.round(size.w * KHW);
  const hh = Math.round(hw * KHH);
  const roadW = Math.max(6, Math.round(size.w * KROAD));
  const cx = hw + roadW;
  const cy = Math.round(size.h * KBASE); // suelo: el edificio se apoya acá
  const rbW = Math.round(cx * 2);
  const rbH = Math.round(cy + hh + roadW);
  const cropLeft = Math.round(cx - size.w / 2);

  return (
    <div className="relative" style={{ width: rbW || undefined, height: rbH || undefined }}>
      {rbW > 4 && <BuildingRoad w={rbW} h={rbH} cx={cx} cy={cy} hw={hw} hh={hh} entering={entering} />}
      <div
        className="absolute overflow-hidden"
        style={{ width: size.w || undefined, height: size.h || undefined, left: cropLeft, top: 0 }}
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
            // B/N por defecto; se pinta a color al entrar.
            filter: entering ? 'grayscale(0)' : 'grayscale(1) brightness(0.9)',
            transition: 'filter 0.9s ease',
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
  // Animación de "entrar": pinta el edificio + los píxeles entran + la caja se
  // llena como barra de progreso; al completarse, navega.
  const [entering, setEntering] = useState(false);
  const enteringRef = useRef(false);
  const enterP = useMotionValue(0); // 0→1 durante la entrada
  const fillWidth = useTransform(enterP, (v) => `${v * 100}%`);
  const enterAnim = useRef<AnimationPlaybackControls | null>(null);
  // Punto donde bajó el puntero: si al soltar casi no se movió → es un TAP
  // (selecciona); si se movió → fue un swipe (cambia de slide, no selecciona).
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const n = SLIDES.length;
  const idx = ((page % n) + n) % n;
  const slide = SLIDES[idx]!;

  const paginate = useCallback((d: number) => {
    if (enteringRef.current) return; // no cambiar de slide mientras entra
    setPage(([p]) => [p + d, d]);
  }, []);

  const doEnter = useCallback(
    (s: Slide) => {
      if (s.kind === 'palacio') setPalacioOpen(true);
      else router.push(`/interactivo?tema=${slugify(s.tema)}`);
    },
    [router],
  );

  // Entrar a la tarjeta activa: dispara la animación (píxeles entran + barra) y,
  // al terminar, carga la ventana. Con reduced-motion navega directo.
  const enter = useCallback(
    (s: Slide) => {
      if (enteringRef.current) return;
      if (reduce) {
        doEnter(s);
        return;
      }
      enteringRef.current = true;
      setEntering(true);
      enterP.set(0);
      enterAnim.current = animate(enterP, 1, {
        duration: ENTER_MS / 1000,
        ease: [0.42, 0, 0.58, 1],
        onComplete: () => {
          doEnter(s);
          if (s.kind === 'palacio') {
            // El Palacio no navega (abre overlay en el Home): resetear.
            enteringRef.current = false;
            setEntering(false);
            enterP.set(0);
          }
        },
      });
    },
    [reduce, doEnter, enterP],
  );

  useEffect(() => () => enterAnim.current?.stop(), []);

  // Teclado: ←/→ navegan, Enter entra.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (palacioOpen || enteringRef.current) return;
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
            drag={entering ? false : 'x'}
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
            {/* Edificio + su manzana (rombo con píxeles) */}
            <div
              className="flex min-h-0 flex-1 items-center justify-center"
              style={{ imageRendering: 'pixelated' }}
            >
              {slide.kind === 'tema' ? (
                <BuildingCrop
                  layer={BUILDING_LAYERS[slide.tema]}
                  poly={BUILDING_HITBOX_POLYGONS[slide.tema]}
                  entering={entering}
                />
              ) : (
                <BuildingCrop layer={LANDSCAPE_PALACIO} poly={PALACIO_HITBOX_POLYGON} entering={entering} />
              )}
            </div>

            {/* Caja con color de la temática. Al entrar se LLENA como barra de
                progreso (indica que está cargando) hasta abrir la ventana. */}
            <div
              className="relative w-full max-w-md shrink-0 overflow-hidden border-2 px-5 py-3 text-left"
              style={{
                borderColor: color,
                background: `linear-gradient(180deg, ${color}1F, ${color}0A)`,
              }}
            >
              {/* Relleno de progreso (detrás del texto) */}
              <motion.div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 z-0"
                style={{ width: fillWidth, background: `${color}3D` }}
              />
              <div className="relative z-10">
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
                      {entering
                        ? 'Entrando…'
                        : `${getEntidades(slide.tema).length} entidades para explorar`}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="flex items-center gap-2 font-display text-pica-title font-bold uppercase text-text-primary"
                      style={{ letterSpacing: '0.08em' }}
                    >
                      <UruguayFlag height={18} />
                      Dato al azar
                      <span aria-hidden="true" className="ml-auto text-pica-button">
                        ↗
                      </span>
                    </span>
                    <span className="mt-0.5 block font-sans text-pica-subtitle text-text-secondary">
                      {entering
                        ? 'Buscando…'
                        : 'Palacio Legislativo — una estadística al azar de cualquier temática.'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Flechas (a11y: navegación sin gesto) */}
        <button
          type="button"
          onClick={() => paginate(-1)}
          disabled={entering}
          aria-label="Anterior"
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2 border border-white/20 bg-black/50 p-1.5 font-display text-pica-button text-text-primary active:bg-black/70 disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => paginate(1)}
          disabled={entering}
          aria-label="Siguiente"
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2 border border-white/20 bg-black/50 p-1.5 font-display text-pica-button text-text-primary active:bg-black/70 disabled:opacity-30"
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
