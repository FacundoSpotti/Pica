'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — PixelSparkles
// Destellos pixel decorativos: puntitos (2-3px) que titilan en los márgenes
// oscuros, como polvo de píxeles alrededor de la ciudad. Mayormente blancos,
// con algún tinte ocasional de las temáticas.
// Posiciones DETERMINÍSTICAS (PRNG con semilla): el server y el cliente
// renderizan exactamente lo mismo — sin mismatch de hidratación.
// La animación vive en CSS (.pica-spark); con prefers-reduced-motion quedan
// invisibles (son puro decorado). pointer-events-none: no capturan nada.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';

/** PRNG determinístico (mulberry32) — mismo resultado en SSR y cliente. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Blanco dominante + tintes de temáticas de a poco. */
const SPARK_COLORS = [
  '#EBEBEB',
  '#EBEBEB',
  '#EBEBEB',
  '#EBEBEB',
  '#2B49DD', // educación
  '#FFC300', // trabajo
  '#A8DD2B', // salud
  '#FF7A27', // economía
  '#FF4A4D', // seguridad
];

interface PixelSparklesProps {
  count?: number;
  /** cambia la constelación sin tocar el componente */
  seed?: number;
  className?: string;
}

export default function PixelSparkles({
  count = 24,
  seed = 7,
  className = '',
}: PixelSparklesProps) {
  const sparks = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: count }, () => ({
      left: rnd() * 100,
      top: rnd() * 100,
      size: rnd() < 0.3 ? 3 : 2,
      color: SPARK_COLORS[Math.floor(rnd() * SPARK_COLORS.length)]!,
      dur: 2.6 + rnd() * 3.6,
      delay: rnd() * 6,
    }));
  }, [count, seed]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {sparks.map((s, i) => (
        <span
          key={i}
          className="pica-spark"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              background: s.color,
              color: s.color, // el halo (box-shadow currentColor) hereda el tinte
              '--spark-dur': `${s.dur.toFixed(2)}s`,
              '--spark-delay': `${s.delay.toFixed(2)}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
