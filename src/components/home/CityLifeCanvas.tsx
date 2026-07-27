'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — CityLifeCanvas
// Un solo canvas a viewport completo con todo lo que se mueve en la ciudad:
//
//   · AUTOS — recorren STREET_PATHS por el eje de la calzada (no por la vereda,
//     donde caminan las personas), más rápidos que los puntos de color y con
//     faros encendidos de noche. Frenan en los semáforos en rojo.
//   · SEMÁFOROS — se colocan solos en los CRUCES: se calculan las intersecciones
//     entre paths, no hace falta calibrarlos. Ciclan verde → amarillo → rojo.
//   · HUMO — columnas que suben y se disipan desde CITY_CHIMNEYS.
//
// Todo junto en un canvas (y no como nodos del DOM) porque son decenas de
// elementos animándose por frame. Comparte la geometría del stage con las
// calles y los puntos (stageBox/toScreen), así nada se desalinea.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { STREET_PATHS } from '@/hooks/useColorDots';
import { CITY_CHIMNEYS } from '@/lib/assets';
import { stageBox, toScreen, type StageBox } from '@/lib/streets';
import { useDayNight } from '@/hooks/useDayNight';

const CAR_COUNT = 14;
const CAR_COLORS = ['#8FB8DE', '#C7CDD4', '#9AA7B4', '#6E8CA8', '#D6DBE0'];
/** Ciclo del semáforo (s): verde, amarillo, rojo. */
const TL = { green: 6.5, yellow: 1.6, red: 6.5 };
const TL_TOTAL = TL.green + TL.yellow + TL.red;

interface Car {
  path: number;
  t: number; // 0–1 sobre el path
  dir: 1 | -1;
  spd: number;
  color: string;
  stopped: boolean;
}

interface Light {
  x: number; // fracción del stage
  y: number;
  offset: number; // desfase del ciclo, para que no cambien todos a la vez
}

interface Puff {
  chimney: number;
  age: number;
  life: number;
  drift: number;
  size: number;
}

/** Punto y dirección sobre una polilínea (t en 0–1 de su longitud total). */
function pointOn(path: ReadonlyArray<readonly [number, number]>, t: number) {
  if (path.length < 2) return { x: 0, y: 0, dx: 1, dy: 0 };
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const l = Math.hypot(path[i + 1]![0] - path[i]![0], path[i + 1]![1] - path[i]![1]);
    segs.push(l);
    total += l;
  }
  let d = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]! || i === segs.length - 1) {
      const a = path[i]!;
      const b = path[i + 1]!;
      const f = segs[i]! ? d / segs[i]! : 0;
      const dx = (b[0] - a[0]) / (segs[i]! || 1);
      const dy = (b[1] - a[1]) / (segs[i]! || 1);
      return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, dx, dy };
    }
    d -= segs[i]!;
  }
  return { x: 0, y: 0, dx: 1, dy: 0 };
}

/** Intersecciones entre pares de segmentos: ahí van los semáforos. */
function findIntersections(): Light[] {
  const out: Light[] = [];
  for (let i = 0; i < STREET_PATHS.length; i++) {
    for (let j = i + 1; j < STREET_PATHS.length; j++) {
      const A = STREET_PATHS[i]!;
      const B = STREET_PATHS[j]!;
      for (let a = 0; a < A.length - 1; a++) {
        for (let b = 0; b < B.length - 1; b++) {
          const [x1, y1] = A[a]!;
          const [x2, y2] = A[a + 1]!;
          const [x3, y3] = B[b]!;
          const [x4, y4] = B[b + 1]!;
          const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
          if (Math.abs(den) < 1e-9) continue;
          const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
          const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / den;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          const x = x1 + t * (x2 - x1);
          const y = y1 + t * (y2 - y1);
          // Solo cruces BIEN dentro de la caja: los del borde quedan cortados
          // por la ventana y se leen como manchas sueltas.
          if (x < 0.06 || x > 0.94 || y < 0.06 || y > 0.94) continue;
          // Separación mínima generosa: la grilla genera muchísimos cruces y
          // todos poblados se ve saturado. Se queda uno por zona.
          if (out.some((l) => Math.hypot(l.x - x, l.y - y) < 0.14)) continue;
          out.push({ x, y, offset: (out.length * 2.3) % TL_TOTAL });
        }
      }
    }
  }
  return out;
}

export default function CityLifeCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion() ?? false;
  const { night } = useDayNight(reduce);
  const nightRef = useRef(night);
  nightRef.current = night;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const lights = findIntersections();
    const cars: Car[] = STREET_PATHS.length
      ? Array.from({ length: CAR_COUNT }, (_, i) => ({
          path: i % STREET_PATHS.length,
          t: Math.random(),
          dir: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
          spd: 0.035 + Math.random() * 0.03,
          color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]!,
          stopped: false,
        }))
      : [];
    const puffs: Puff[] = [];

    let raf = 0;
    let last = performance.now();
    let clock = 0;

    /** Estado del semáforo en un instante: 0 verde, 1 amarillo, 2 rojo. */
    const lightState = (l: Light) => {
      const p = (clock + l.offset) % TL_TOTAL;
      if (p < TL.green) return 0;
      if (p < TL.green + TL.yellow) return 1;
      return 2;
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      const box: StageBox = stageBox(vw, vh);
      const nightNow = nightRef.current;
      ctx.clearRect(0, 0, vw, vh);

      // ── Humo ──────────────────────────────────────────────────────────────
      if (CITY_CHIMNEYS.length) {
        if (Math.random() < dt * 6) {
          puffs.push({
            chimney: Math.floor(Math.random() * CITY_CHIMNEYS.length),
            age: 0,
            life: 3.4 + Math.random() * 2.2,
            drift: (Math.random() - 0.5) * 0.35,
            size: 3 + Math.random() * 3,
          });
        }
        for (let i = puffs.length - 1; i >= 0; i--) {
          const s = puffs[i]!;
          s.age += dt;
          if (s.age >= s.life) {
            puffs.splice(i, 1);
            continue;
          }
          const k = s.age / s.life;
          const c = CITY_CHIMNEYS[s.chimney]!;
          const [sx, sy] = toScreen(c[0], c[1], box);
          const rise = k * box.h * 0.075;
          const x = sx + s.drift * rise;
          const y = sy - rise;
          const r = (s.size + k * 9) * (box.h / 700);
          ctx.globalAlpha = (1 - k) * 0.22;
          ctx.fillStyle = '#C9CDD2';
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // ── Autos ─────────────────────────────────────────────────────────────
      const carLen = Math.max(3, box.h * 0.009);
      for (const car of cars) {
        const path = STREET_PATHS[car.path]!;
        const pos = pointOn(path, car.t);
        // ¿Hay un semáforo en rojo justo delante?
        const ahead = 0.022;
        const nx = pos.x + pos.dx * ahead * car.dir;
        const ny = pos.y + pos.dy * ahead * car.dir;
        car.stopped = lights.some(
          (l) => lightState(l) === 2 && Math.hypot(l.x - nx, l.y - ny) < 0.022,
        );
        if (!car.stopped) {
          car.t += car.spd * dt * car.dir;
          if (car.t > 1) car.t = 0;
          if (car.t < 0) car.t = 1;
        }
        const [x, y] = toScreen(pos.x, pos.y, box);
        const ang = Math.atan2(pos.dy * box.h, pos.dx * box.w) + (car.dir < 0 ? Math.PI : 0);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        // Carrocería
        ctx.fillStyle = car.color;
        ctx.fillRect(-carLen, -carLen * 0.42, carLen * 2, carLen * 0.84);
        // Faros de noche: un cono corto hacia adelante
        if (nightNow > 0.35) {
          const g = ctx.createLinearGradient(carLen, 0, carLen * 6, 0);
          g.addColorStop(0, `rgba(255,240,200,${0.34 * nightNow})`);
          g.addColorStop(1, 'rgba(255,240,200,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(carLen, -carLen * 0.4);
          ctx.lineTo(carLen * 6, -carLen * 1.5);
          ctx.lineTo(carLen * 6, carLen * 1.5);
          ctx.lineTo(carLen, carLen * 0.4);
          ctx.closePath();
          ctx.fill();
          // Luz trasera
          ctx.fillStyle = `rgba(255,80,60,${0.7 * nightNow})`;
          ctx.fillRect(-carLen - 1, -carLen * 0.3, 1.5, carLen * 0.6);
        }
        ctx.restore();
      }

      // ── Semáforos ─────────────────────────────────────────────────────────
      const r = Math.max(1.6, box.h * 0.0035);
      for (const l of lights) {
        const [x, y] = toScreen(l.x, l.y, box);
        const st = lightState(l);
        const col = st === 0 ? '#4ADE80' : st === 1 ? '#FACC15' : '#F87171';
        // Poste corto
        ctx.strokeStyle = 'rgba(120,120,120,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - r * 5);
        ctx.stroke();
        // Halo + luz
        ctx.globalAlpha = 0.35 + 0.35 * nightNow;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y - r * 5, r * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(x, y - r * 5, r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    if (!reduce) raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduce]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[6]"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
