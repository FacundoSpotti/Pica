'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — ThemeOverlay
// Aparece cuando los puntos terminaron de converger al edificio seleccionado.
// Layout (ver pica-home, versión corregida):
//   IZQUIERDA: personaje 360° girando + título de la temática debajo
//   DERECHA:  descripción + botones EXPLORAR / VOLVER
//
// Entrada animada: cada elemento sube desde abajo (y: 48 → 0) con easing
// suave y en cascada (personaje → título → descripción → botones), sobre el
// fade del fondo. Con prefers-reduced-motion todo aparece sin desplazamiento.
//
// Accesibilidad: role=dialog + aria-modal, Escape cierra, foco inicial en
// EXPLORAR y devolución del foco al cerrar.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import ThemeCharacter from '@/components/home/ThemeCharacter';
import {
  TEMA_COLOR,
  TEMA_DESCRIPTION,
  TEMA_LABEL,
  TEMA_TEXT_ON_COLOR,
} from '@/lib/colors';
import type { Tematica } from '@/types/sprites';

interface ThemeOverlayProps {
  tema: Tematica;
  onClose: () => void;
  /** Mobile: cubre TODA la pantalla (fixed) en formato vertical, no el mapa. */
  fullscreen?: boolean;
}

/** Easing de la entrada: desaceleración suave (easeOutQuint aprox.). */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function ThemeOverlay({ tema, onClose, fullscreen = false }: ThemeOverlayProps) {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const exploreRef = useRef<HTMLButtonElement>(null);
  const color = TEMA_COLOR[tema];

  // Variants de entrada desde abajo, con delay en cascada por elemento
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: shouldReduce ? 0 : 48 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 0 },
    transition: shouldReduce
      ? { duration: 0 }
      : { duration: 0.55, delay, ease: EASE },
  });

  // Foco inicial en EXPLORAR + devolución del foco al elemento previo al cerrar
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    exploreRef.current?.focus();
    return () => prev?.focus();
  }, []);

  // Escape cierra el overlay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Fullscreen (mobile): bloquear el scroll de la página detrás del modal —
  // la opacidad deja ver el fondo, pero no debe poder scrollearse.
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-overlay-title"
      aria-describedby="theme-overlay-desc"
      className={
        fullscreen
          ? 'fixed inset-0 z-50 flex items-center justify-center overflow-y-auto'
          : 'absolute inset-0 z-30 flex items-center justify-center overflow-hidden'
      }
      style={{ background: fullscreen ? 'rgba(8, 8, 8, 0.96)' : 'rgba(8, 8, 8, 0.85)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduce ? 0 : 0.35 }}
    >
      <div className="flex flex-col items-center gap-6 px-8 py-8 md:flex-row md:gap-16">
        {/* IZQUIERDA — personaje 360° + título debajo */}
        <div className="flex flex-col items-center gap-4">
          {/* Marco neon con el color de la temática (ref. de Figma) */}
          <motion.div {...rise(0.05)}>
            <div
              className="rounded-lg border-[3px] px-8 py-5"
              style={{
                borderColor: color,
                boxShadow: `0 0 16px ${color}59, inset 0 0 10px ${color}26`,
                background: 'rgba(10, 10, 10, 0.55)',
              }}
            >
              <ThemeCharacter tema={tema} height={180} />
            </div>
          </motion.div>
          <motion.h2
            id="theme-overlay-title"
            className="font-display text-pica-button font-bold uppercase"
            style={{ color, letterSpacing: '0.12em' }}
            {...rise(0.18)}
          >
            {TEMA_LABEL[tema]}
          </motion.h2>
        </div>

        {/* DERECHA — descripción + acciones */}
        <div className="flex max-w-sm flex-col items-center gap-8 md:items-start">
          <motion.p
            id="theme-overlay-desc"
            className="font-sans text-pica-paragraph text-center text-text-secondary md:text-left"
            {...rise(0.3)}
          >
            {TEMA_DESCRIPTION[tema]}
          </motion.p>

          <motion.div className="flex gap-4" {...rise(0.42)}>
            <button
              ref={exploreRef}
              type="button"
              onClick={() => router.push(`/interactivo?tema=${tema}`)}
              className="font-display text-pica-button px-6 py-2 font-bold uppercase transition-transform hover:scale-105"
              style={{
                backgroundColor: color,
                color: TEMA_TEXT_ON_COLOR[tema],
                letterSpacing: '0.06em',
              }}
            >
              Explorar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-display text-pica-button border-2 px-6 py-2 font-bold uppercase text-text-primary transition-colors hover:border-text-primary"
              style={{ borderColor: 'rgba(235, 235, 235, 0.3)', letterSpacing: '0.06em' }}
            >
              Volver
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
