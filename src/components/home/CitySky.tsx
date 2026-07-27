'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — CitySky
// Tinte de la hora sobre TODA la ventana (no solo el stage): el paisaje pasa de
// día a atardecer dorado, a noche azulada, y vuelve. Es lo que integra el mapa
// con el margen — sin esto la ciudad y el fondo se leen como dos cosas.
//
// Encima viaja un PÁJARO cada tanto: cruza el cielo, aletea y se va. Aparece a
// intervalos irregulares para que se sienta casual y no como un loop.
//
// Va en `mix-blend-mode: soft-light` para teñir sin apagar el pixel art.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useDayNight } from '@/hooks/useDayNight';

/** Paleta del cielo por momento del día. */
function skyTint(night: number, golden: number): string {
  // Día: azul frío muy tenue · atardecer: ámbar · noche: azul profundo
  const day = `rgba(150, 190, 255, ${(0.1 * (1 - night)).toFixed(3)})`;
  const dusk = `rgba(255, 150, 60, ${(0.26 * golden).toFixed(3)})`;
  const dark = `rgba(10, 20, 60, ${(0.5 * night).toFixed(3)})`;
  return `linear-gradient(${dark}, ${dark}), linear-gradient(${dusk}, ${dusk}), linear-gradient(${day}, ${day})`;
}

export default function CitySky() {
  const reduce = useReducedMotion() ?? false;
  const { night, golden } = useDayNight(reduce);
  const [bird, setBird] = useState<{ id: number; y: number; dir: 1 | -1; dur: number } | null>(null);

  // Pájaro: aparece cada 18–40s, a una altura al azar del tercio superior.
  useEffect(() => {
    if (reduce) return;
    let timer: ReturnType<typeof setTimeout>;
    let id = 0;
    const schedule = () => {
      timer = setTimeout(
        () => {
          id += 1;
          setBird({
            id,
            y: 8 + Math.random() * 26,
            dir: Math.random() < 0.5 ? 1 : -1,
            dur: 13 + Math.random() * 8,
          });
          schedule();
        },
        18_000 + Math.random() * 22_000,
      );
    };
    // Primero a los pocos segundos, para que se note que existe
    timer = setTimeout(() => {
      id += 1;
      setBird({ id, y: 14, dir: 1, dur: 15 });
      schedule();
    }, 6_000);
    return () => clearTimeout(timer);
  }, [reduce]);

  return (
    <>
      {/* Tinte de la hora */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[6]"
        style={{
          background: skyTint(night, golden),
          mixBlendMode: 'soft-light',
          transition: 'background 1s linear',
        }}
      />
      {/* Luz cálida rasante en el horizonte durante el dorado */}
      {golden > 0.05 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-[6] h-1/2"
          style={{
            background: `radial-gradient(120% 100% at 50% 0%, rgba(255,170,80,${(0.16 * golden).toFixed(3)}) 0%, transparent 65%)`,
            transition: 'background 1s linear',
          }}
        />
      )}

      {/* Pájaro */}
      {bird && (
        <div
          key={bird.id}
          aria-hidden="true"
          className="pointer-events-none fixed z-[7] pica-bird-fly"
          style={{
            top: `${bird.y}%`,
            animationDuration: `${bird.dur}s`,
            // Va de un borde al otro según la dirección
            ['--bird-from' as string]: bird.dir === 1 ? '-6vw' : '106vw',
            ['--bird-to' as string]: bird.dir === 1 ? '106vw' : '-6vw',
          }}
        >
          {/* Tres capas de transform separadas: trasladar (fly), espejar según
              la dirección, y aletear (flap). Si el aleteo y el espejado
              comparten elemento, el keyframe pisa al inline y el pájaro nunca
              se da vuelta. */}
          <div style={{ transform: bird.dir === 1 ? 'scaleX(1)' : 'scaleX(-1)' }}>
            <div className="pica-bird-flap">
              {/* Pájaro pixel: un trazo que hace de alas */}
              <svg width="14" height="10" viewBox="0 0 14 10" shapeRendering="crispEdges">
                <path
                  d="M1 4 h2 v1 h2 v1 h2 v-1 h2 v-1 h2"
                  fill="none"
                  stroke="rgba(235,235,235,0.5)"
                  strokeWidth="1.4"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
