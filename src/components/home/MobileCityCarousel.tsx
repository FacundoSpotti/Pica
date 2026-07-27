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
  type MotionValue,
} from 'framer-motion';
import {
  assetUrl,
  BUILDING_FOOTPRINT,
  BUILDING_LAYERS,
  BUILDING_PLACEMENT,
  LANDSCAPE_PALACIO,
  LANDSCAPE_SIZE,
  type Footprint,
} from '@/lib/assets';
import { SPRITE_COLORS, TEMA_COLOR, TEMA_LABEL, TEMA_ORDER } from '@/lib/colors';
import { getEntidades } from '@/lib/datasets';
import { slugify } from '@/lib/slug';
import UruguayFlag from '@/components/shared/UruguayFlag';
import RandomOverlay from './RandomOverlay';
import type { Tematica } from '@/types/sprites';

const NEUTRAL = '#EBEBEB';
const ENTER_MS = 2200; // duración de la animación de "entrar" antes de navegar
const CONV_SPD = 0.95; // velocidad de convergencia por la calle (u/s, calmo como desktop)

type Slide = { kind: 'tema'; tema: Tematica } | { kind: 'palacio' };
const SLIDES: Slide[] = [
  ...TEMA_ORDER.map((tema) => ({ kind: 'tema' as const, tema })),
  { kind: 'palacio' as const },
];

// La "manzana" ya NO se inventa con proporciones fijas: el rombo sale del
// BASAMENTO DEL PROPIO ARTE (BUILDING_FOOTPRINT), así la calle se apoya contra
// él y el muro se extruye de sus mismas aristas — coinciden por construcción.
const KGAP = 0.045; // separación calle↔basamento (fracción del ancho del sprite)
const KROAD = 0.05; // ancho de la calzada (fracción del ancho del sprite)
const KLIFT = 0.11; // cuánto se eleva el edificio al entrar (fracción de su alto)

/** Fracción del lift (0→1) según el progreso de entrada: sube en el primer 35%. */
const liftFrac = (v: number) => Math.min(1, v / 0.35);

/** Relación de aspecto real del sprite, derivada de su emplazamiento en el stage
 *  (las fracciones left/top/width/height son sobre 4096×2305, no cuadradas). */
function spriteAspect(key: Tematica | 'palacio'): number {
  const p = BUILDING_PLACEMENT[key];
  return (p.width * LANDSCAPE_SIZE.width) / (p.height * LANDSCAPE_SIZE.height);
}

/**
 * Calle propia de cada edificio (mobile): un ROMBO isométrico de calzada que
 * rodea el BASAMENTO DEL ARTE, con PÍXELES de color circulando por su perímetro.
 * Al ENTRAR, los píxeles convergen por la calle al vértice de atrás y se
 * desvanecen, y del basamento sube un MURO.
 *
 * Toda la geometría llega ya resuelta desde BuildingCrop a partir de
 * BUILDING_FOOTPRINT (el rombo real del arte):
 *   · (cx, cy) centro del plano de piso, común a la calle y al basamento
 *   · (hw, hh) semiejes del rombo de la CALLE
 *   · (bhw, bhh) semiejes del rombo del BASAMENTO (de donde sale el muro)
 */
function BuildingRoad({
  w,
  h,
  cx,
  cy,
  hw,
  hh,
  bhw,
  bhh,
  entering,
  enterP,
  maxLift,
}: {
  w: number;
  h: number;
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  bhw: number;
  bhh: number;
  entering: boolean;
  enterP: MotionValue<number>;
  maxLift: number;
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
    // Vértices del rombo: arriba (atrás), derecha, abajo (frente), izquierda.
    // El vértice 0 (arriba) queda DETRÁS del edificio: es el punto común al que
    // convergen todos los píxeles al entrar.
    const V = [
      { x: cx, y: cy - hh },
      { x: cx + hw, y: cy },
      { x: cx, y: cy + hh },
      { x: cx - hw, y: cy },
    ];
    const pointAt = (p: number) => {
      const e = Math.floor(p) % 4;
      const t = p - Math.floor(p);
      const a = V[e]!;
      const b = V[(e + 1) % 4]!;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    };
    const dots = Array.from({ length: 20 }, () => ({
      p: Math.random() * 4,
      // Velocidad calma (como en desktop), no la anterior (muy rápida).
      spd: (0.24 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1),
      col: SPRITE_COLORS[Math.floor(Math.random() * SPRITE_COLORS.length)]!,
      s: Math.random() < 0.5 ? 2 : 3,
      arrived: 0, // tiempo acumulado tras llegar al punto de atrás (para el fade)
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
        let alpha = 1;
        if (ent) {
          // Al entrar, cada píxel se mueve POR LA CALLE (el perímetro del rombo)
          // hasta el vértice de atrás (p=0), común a todos, que está detrás del
          // edificio — ahí "entra". Toma el arco más corto, a velocidad calma.
          const dist = d.p <= 2 ? d.p : d.p - 4; // distancia con signo a 0 en [-2,2]
          const step = CONV_SPD * dt;
          if (Math.abs(dist) <= step) {
            d.p = 0;
            d.arrived += dt;
          } else {
            d.p += (dist > 0 ? -1 : 1) * step;
            d.p = ((d.p % 4) + 4) % 4;
          }
          alpha = d.arrived > 0 ? Math.max(0, 1 - d.arrived / 0.35) : 1;
        } else if (!reduced) {
          d.p += d.spd * dt;
          d.p = ((d.p % 4) + 4) % 4;
        }
        const pt = pointAt(d.p);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = d.col;
        ctx.fillRect(Math.round(pt.x - d.s / 2), Math.round(pt.y - d.s / 2), d.s, d.s);
      }
      ctx.globalAlpha = 1;

      // MURO: al elevarse el edificio, se extruyen las dos caras FRONTALES del
      // rombo (izquierda-frente y frente-derecha) desde el suelo hasta la base
      // elevada — así sube una pared sólida y no parece que flota.
      const liftPx = maxLift * liftFrac(enterP.get());
      if (liftPx > 0.5) {
        // El MURO se extruye del rombo del BASAMENTO DEL ARTE (bhw/bhh): sus dos
        // caras frontales, desde el piso hasta la base elevada. Coincide con el
        // borde del arte por construcción, no por ajuste a ojo.
        const L = { x: cx - bhw, y: cy };
        const B = { x: cx, y: cy + bhh };
        const R = { x: cx + bhw, y: cy };
        // cara izquierda (más oscura)
        ctx.fillStyle = '#242424';
        ctx.beginPath();
        ctx.moveTo(L.x, L.y);
        ctx.lineTo(B.x, B.y);
        ctx.lineTo(B.x, B.y - liftPx);
        ctx.lineTo(L.x, L.y - liftPx);
        ctx.closePath();
        ctx.fill();
        // cara derecha (más clara, "recibe luz")
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.moveTo(B.x, B.y);
        ctx.lineTo(R.x, R.y);
        ctx.lineTo(R.x, R.y - liftPx);
        ctx.lineTo(B.x, B.y - liftPx);
        ctx.closePath();
        ctx.fill();
        // aristas verticales para definir el volumen
        ctx.strokeStyle = '#3C3C3C';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(L.x, L.y);
        ctx.lineTo(L.x, L.y - liftPx);
        ctx.moveTo(B.x, B.y);
        ctx.lineTo(B.x, B.y - liftPx);
        ctx.moveTo(R.x, R.y);
        ctx.lineTo(R.x, R.y - liftPx);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [w, h, cx, cy, hw, hh, bhw, bhh, enterP, maxLift]);

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
 * Edificio (sprite ya recortado a su rombo de base) apoyado sobre su calle.
 *
 * Ya no hay recorte por hitbox ni "manzana" inventada: el sprite ES el edificio
 * con su basamento, y la calle se dibuja RODEANDO ese basamento, separada por
 * KGAP. Se dimensiona todo el conjunto para que entre en el área útil (la calle
 * nunca se corta abajo). Arranca en B/N y se pinta a color al entrar.
 */
function BuildingCrop({
  layer,
  foot,
  aspect,
  entering,
  enterP,
}: {
  layer: string;
  foot: Footprint;
  aspect: number;
  entering: boolean;
  enterP: MotionValue<number>;
}) {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  // El edificio se eleva (en % de su alto) siguiendo el progreso de entrada; el
  // muro del canvas usa el MISMO factor (maxLift px) → suben sincronizados.
  const liftY = useTransform(enterP, (v) => `${(-100 * KLIFT * liftFrac(v)).toFixed(2)}%`);

  // Semiejes del basamento del ARTE, en fracciones del sprite.
  const fBhw = 0.5;
  const fBhh = foot.bottomY - foot.groundY;
  // Rombo de la CALLE: el mismo, escalado hacia afuera (conserva la pendiente).
  const kRoad = (fBhw + KGAP) / fBhw;

  useEffect(() => {
    const update = () => {
      const availW = window.innerWidth - 40;
      const availH = window.innerHeight - 240;
      // Conjunto = calle + calzada. En unidades de ANCHO del sprite (sw):
      //   ancho  = 2·(fBhw·kRoad) + KROAD
      //   alto   = sh + (groundY·… ) → se resuelve abajo con la altura real
      const MW = 1.02; // horizontal: apenas de sangrado
      const MH = 0.98; // vertical: la calle NO se corta
      const cW = 2 * fBhw * kRoad + KROAD; // × sw
      // alto del conjunto = max(sh, cy + hhRoad + roadW) con cy = groundY·sh
      const cH = Math.max(1, foot.groundY + (fBhh * kRoad + KROAD / 2) * aspect); // × sh
      const shByW = (MW * availW) / (cW * aspect);
      const shByH = (MH * availH) / cH;
      const sh = Math.max(1, Math.floor(Math.min(shByW, shByH)));
      setSize({ w: Math.max(1, Math.round(sh * aspect)), h: sh });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [aspect, foot.groundY, fBhh, kRoad]);

  // Geometría en px, derivada del basamento del arte.
  const bhw = size.w * fBhw; // semiancho del basamento
  const bhh = size.h * fBhh; // semialto del basamento
  const hw = bhw * kRoad; // semiancho de la calle
  const hh = bhh * kRoad; // semialto de la calle
  const roadW = Math.max(6, Math.round(size.w * KROAD));
  const cy = Math.round(size.h * foot.groundY); // plano del piso (centro del rombo)
  const cx = Math.round(Math.max(hw + roadW / 2, size.w * foot.bottomX));
  const spriteLeft = Math.round(cx - size.w * foot.bottomX);
  const rbW = Math.round(cx + hw + roadW / 2);
  const rbH = Math.round(Math.max(size.h, cy + hh + roadW / 2));
  const maxLift = size.h * KLIFT;

  return (
    <div className="relative" style={{ width: rbW || undefined, height: rbH || undefined }}>
      {rbW > 4 && (
        <BuildingRoad
          w={rbW}
          h={rbH}
          cx={cx}
          cy={cy}
          hw={hw}
          hh={hh}
          bhw={bhw}
          bhh={bhh}
          entering={entering}
          enterP={enterP}
          maxLift={maxLift}
        />
      )}
      {/* El edificio se ELEVA del suelo al entrar (motion.div, mismo factor que
          el muro del canvas). Sin overflow: el sprite ya viene recortado. */}
      <motion.div
        className="absolute"
        style={{
          width: size.w || undefined,
          height: size.h || undefined,
          left: spriteLeft,
          top: 0,
          y: liftY,
        }}
      >
        <img
          src={assetUrl(layer)}
          alt=""
          aria-hidden="true"
          className="h-full w-full"
          style={{
            imageRendering: 'pixelated',
            // B/N por defecto; se pinta a color al entrar.
            filter: entering ? 'grayscale(0)' : 'grayscale(1) brightness(0.9)',
            transition: 'filter 0.9s ease',
          }}
        />
      </motion.div>
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
              <BuildingCrop
                layer={slide.kind === 'tema' ? BUILDING_LAYERS[slide.tema] : LANDSCAPE_PALACIO}
                foot={BUILDING_FOOTPRINT[slide.kind === 'tema' ? slide.tema : 'palacio']}
                aspect={spriteAspect(slide.kind === 'tema' ? slide.tema : 'palacio')}
                entering={entering}
                enterP={enterP}
              />
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
