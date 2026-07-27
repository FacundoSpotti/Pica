'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — CityAmbience
// El ambiente del paisaje va en DOS capas, montadas a distinta altura del
// stack porque no pueden compartir z:
//
//   layer="ground" (DEBAJO de los edificios)
//     1. SOMBRAS proyectadas de cada edificio sobre la calle. Se derivan del
//        rombo de base (BUILDING_FOOTPRINT) y se estiran/giran según la hora:
//        cortas al mediodía, largas y tendidas al atardecer.
//     2. MANZANAS sin temática todavía: rombo punteado + cartel "Próximamente".
//
//   layer="lights" (ENCIMA de los edificios)
//     3. FAROLES. Van arriba porque las farolas del arte están dibujadas al
//        frente de cada manzana: si la luz queda debajo de la capa del edificio,
//        el propio edificio la tapa y no se ve nada.
//        No son un círculo plano — cada uno tiene charco de luz elíptico sobre
//        el asfalto (en perspectiva isométrica), brillo especular del piso
//        mojado, halo volumétrico y bulbo.
//
// Todo cuelga de useDayNight, así el conjunto se lee coherente (no hay faroles
// prendidos a pleno sol ni sombras que contradigan la luz).
// Respeta prefers-reduced-motion: queda una tarde fija, sin titileo.
// ─────────────────────────────────────────────────────────────────────────────

import { useReducedMotion } from 'framer-motion';
import {
  BUILDING_FOOTPRINT,
  BUILDING_PLACEMENT,
  CITY_LAMPS,
  FUTURE_BLOCKS,
  GROUND_SLOPE,
} from '@/lib/assets';
import { useDayNight } from '@/hooks/useDayNight';
import type { Tematica } from '@/types/sprites';

/** Tamaño del rombo de una manzana vacía, en fracciones del stage. */
const BLOCK_HW = 0.085;

const SHADOW_KEYS: ReadonlyArray<Tematica | 'palacio'> = [
  'educacion',
  'salud',
  'seguridad',
  'trabajo',
  'palacio',
  'economia',
];

export default function CityAmbience({
  dimmed = false,
  layer = 'ground',
}: {
  dimmed?: boolean;
  /** 'ground' va debajo de los edificios; 'lights' encima (ver cabecera). */
  layer?: 'ground' | 'lights';
}) {
  const reduce = useReducedMotion() ?? false;
  const { night, golden, phase } = useDayNight(reduce);

  // Los faroles encienden al caer la tarde y se apagan al amanecer.
  const lampOn = Math.min(1, Math.max(0, (night - 0.18) / 0.5));
  // Sombras: fuertes de día, se disuelven de noche (solo queda luz artificial).
  const sunUp = 1 - night;
  const shadowAlpha = 0.34 * sunUp;
  // Dirección/largo de la sombra: el sol cruza de un lado al otro y la sombra
  // se alarga en las puntas del día.
  const sunX = Math.sin((phase - 0.5) * Math.PI * 2); // -1 → 1
  const shadowLen = 0.55 + golden * 1.5;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 transition-opacity duration-500"
      style={{ opacity: dimmed ? 0.28 : 1 }}
    >
      {/* ── 1. Sombras de los edificios ───────────────────────────────────── */}
      {layer === 'ground' && shadowAlpha > 0.02 && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {SHADOW_KEYS.map((k) => {
            const p = BUILDING_PLACEMENT[k];
            const f = BUILDING_FOOTPRINT[k];
            const gy = (p.top + f.groundY * p.height) * 100;
            const by = (p.top + f.bottomY * p.height) * 100;
            const lx = p.left * 100;
            const rx = (p.left + p.width) * 100;
            const bx = (p.left + f.bottomX * p.width) * 100;
            const hh = by - gy;
            // La sombra es el mismo rombo, desplazado en sentido contrario al sol
            // y estirado. Se dibuja detrás del edificio, sobre el asfalto.
            const dx = -sunX * p.width * 100 * 0.34 * shadowLen;
            const dy = -Math.abs(hh) * 0.5 * shadowLen;
            return (
              <polygon
                key={k}
                points={`${lx + dx},${gy + dy} ${bx + dx},${by + dy} ${rx + dx},${gy + dy} ${bx + dx},${gy - hh + dy}`}
                fill={`rgba(0,0,0,${shadowAlpha.toFixed(3)})`}
                style={{ transition: 'fill 1s linear' }}
              />
            );
          })}
        </svg>
      )}

      {/* ── 2. Manzanas todavía sin temática ──────────────────────────────── */}
      {layer === 'ground' && (
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {FUTURE_BLOCKS.map(([cx, cy], i) => {
          const hw = BLOCK_HW * 100;
          const hh = hw * GROUND_SLOPE;
          const x = cx * 100;
          const y = cy * 100;
          return (
            <polygon
              key={i}
              points={`${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}`}
              fill="rgba(235,235,235,0.022)"
              stroke="rgba(235,235,235,0.16)"
              strokeWidth={0.12}
              strokeDasharray="0.9 0.9"
              className={reduce ? undefined : 'pica-block-breathe'}
              style={reduce ? undefined : { animationDelay: `${(i % 5) * 0.7}s` }}
            />
          );
        })}
      </svg>
      )}
      {layer === 'ground' &&
        FUTURE_BLOCKS.map(([cx, cy], i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display uppercase"
            style={{
              left: `${cx * 100}%`,
              top: `${cy * 100}%`,
              fontSize: 'clamp(6px, 0.55vw, 10px)',
              letterSpacing: '0.22em',
              color: 'rgba(235,235,235,0.3)',
            }}
          >
            Próximamente
          </span>
        ))}

      {/* ── 3. Faroles ────────────────────────────────────────────────────── */}
      {layer === 'lights' && lampOn > 0.02 && (
        <div className="absolute inset-0" style={{ opacity: lampOn, transition: 'opacity 2s linear' }}>
          {CITY_LAMPS.map(([x, y], i) => {
            const delay = `${(i % 9) * 0.7}s`;
            return (
              <div
                key={i}
                className={reduce ? 'absolute' : 'absolute pica-lamp'}
                style={{ left: `${x * 100}%`, top: `${y * 100}%`, animationDelay: delay }}
              >
                {/* Charco de luz sobre el asfalto: elipse aplastada por la
                    perspectiva isométrica, no un círculo. Es lo que hace que se
                    lea como un farol iluminando y no como un punto brillante. */}
                <div
                  className="absolute -translate-x-1/2 rounded-[50%]"
                  style={{
                    top: 0,
                    width: 'clamp(46px, 4.6vw, 96px)',
                    height: `calc(clamp(46px, 4.6vw, 96px) * ${GROUND_SLOPE})`,
                    transform: 'translate(-50%, -38%)',
                    background:
                      'radial-gradient(50% 50% at 50% 50%, rgba(255,186,96,0.30) 0%, rgba(255,170,70,0.13) 45%, transparent 72%)',
                  }}
                />
                {/* Brillo especular del asfalto mojado: más chico, más definido
                    y desplazado hacia el frente, como un charco reflejando. */}
                <div
                  className="absolute -translate-x-1/2 rounded-[50%]"
                  style={{
                    top: 0,
                    width: 'clamp(14px, 1.3vw, 28px)',
                    height: `calc(clamp(14px, 1.3vw, 28px) * ${GROUND_SLOPE * 0.8})`,
                    transform: 'translate(-50%, 46%)',
                    background:
                      'radial-gradient(50% 50% at 50% 50%, rgba(255,214,150,0.34) 0%, transparent 70%)',
                    filter: 'blur(1px)',
                  }}
                />
                {/* Halo volumétrico alrededor de la lámpara */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: 'clamp(16px, 1.6vw, 34px)',
                    height: 'clamp(16px, 1.6vw, 34px)',
                    background:
                      'radial-gradient(circle, rgba(255,206,140,0.55) 0%, rgba(255,178,80,0.22) 40%, transparent 70%)',
                  }}
                />
                {/* Bulbo */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: 'clamp(2px, 0.22vw, 4px)',
                    height: 'clamp(2px, 0.22vw, 4px)',
                    background: '#FFF0D0',
                    boxShadow: '0 0 5px rgba(255,214,150,0.95), 0 0 10px rgba(255,178,80,0.6)',
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
