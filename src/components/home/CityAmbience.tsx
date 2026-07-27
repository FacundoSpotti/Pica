'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — CityAmbience
// Dos capas que le dan vida al paisaje, ambas en coordenadas del stage:
//
//   · FAROLES (CITY_LAMPS): halo cálido sobre cada farol del arte. Respira
//     siempre y cada tanto pega un destello. Las fases están desfasadas por
//     farol (delay derivado del índice) para que la ciudad titile despareja,
//     no al unísono.
//   · MANZANAS FUTURAS (FUTURE_BLOCKS): los huecos entre calles donde todavía
//     no hay temática se marcan con un rombo punteado y un cartel — cuentan que
//     Pica sigue creciendo.
//
// Va DEBAJO de los edificios: la luz baña el suelo y las fachadas la tapan.
// Respeta prefers-reduced-motion (queda encendido, sin titileo).
// ─────────────────────────────────────────────────────────────────────────────

import { useReducedMotion } from 'framer-motion';
import { CITY_LAMPS, FUTURE_BLOCKS, GROUND_SLOPE } from '@/lib/assets';

/** Color de la luz: sodio cálido, como el alumbrado real. */
const LAMP_WARM = 'rgba(255, 176, 74, 0.55)';
const LAMP_CORE = 'rgba(255, 226, 170, 0.9)';

/** Tamaño del rombo de una manzana vacía, en fracciones del stage. */
const BLOCK_HW = 0.085;

export default function CityAmbience({ dimmed = false }: { dimmed?: boolean }) {
  const reduce = useReducedMotion() ?? false;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 transition-opacity duration-500"
      style={{ opacity: dimmed ? 0.25 : 1 }}
    >
      {/* ── Manzanas que todavía no tienen temática ───────────────────────── */}
      {FUTURE_BLOCKS.length > 0 && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {FUTURE_BLOCKS.map(([cx, cy], i) => {
            // Rombo con la MISMA pendiente que las bases de los edificios, para
            // que se lea como una manzana más de la grilla y no como un adorno.
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
      {FUTURE_BLOCKS.map(([cx, cy], i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display uppercase"
          style={{
            left: `${cx * 100}%`,
            top: `${cy * 100}%`,
            fontSize: 'clamp(7px, 0.62vw, 11px)',
            letterSpacing: '0.22em',
            color: 'rgba(235,235,235,0.32)',
          }}
        >
          Próximamente
        </span>
      ))}

      {/* ── Faroles ───────────────────────────────────────────────────────── */}
      {CITY_LAMPS.map(([x, y], i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        >
          {/* Halo amplio: baña el suelo alrededor del poste */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
              reduce ? '' : 'pica-lamp-glow'
            }`}
            style={{
              width: 'clamp(26px, 2.6vw, 54px)',
              height: 'clamp(26px, 2.6vw, 54px)',
              background: `radial-gradient(circle, ${LAMP_WARM} 0%, transparent 68%)`,
              animationDelay: `${(i % 7) * 0.55}s`,
            }}
          />
          {/* Núcleo: el punto de luz de la lámpara */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
              reduce ? '' : 'pica-lamp-core'
            }`}
            style={{
              width: 'clamp(3px, 0.3vw, 6px)',
              height: 'clamp(3px, 0.3vw, 6px)',
              background: LAMP_CORE,
              boxShadow: `0 0 6px ${LAMP_CORE}`,
              animationDelay: `${(i % 7) * 0.55}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
