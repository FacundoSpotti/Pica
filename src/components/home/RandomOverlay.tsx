'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — RandomOverlay (Palacio Legislativo)
// Aparece cuando los puntos convergen al Palacio: ofrece explorar una
// ESTADÍSTICA AL AZAR. Mismo lenguaje visual que ThemeOverlay (marco neon,
// entrada en cascada, EXPLORAR/VOLVER), en blanco (el Palacio no es temática).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import PicaLogo from '@/components/shared/PicaLogo';
import { getRandomDatasetUrl } from '@/lib/randomDataset';

interface RandomOverlayProps {
  onClose: () => void;
  /** Mobile: cubre TODA la pantalla (fixed), como ThemeOverlay. */
  fullscreen?: boolean;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const WHITE = '#EBEBEB';

export default function RandomOverlay({ onClose, fullscreen = false }: RandomOverlayProps) {
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const exploreRef = useRef<HTMLButtonElement>(null);

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: shouldReduce ? 0 : 48 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 0 },
    transition: shouldReduce ? { duration: 0 } : { duration: 0.55, delay, ease: EASE },
  });

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    exploreRef.current?.focus();
    return () => prev?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Fullscreen (mobile): bloquear el scroll de la página detrás del modal
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
      aria-labelledby="random-overlay-title"
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
      {/* max-h-full + overflow-y-auto: si el stage es bajo (ej. 1024×600) nada
          queda cortado e inalcanzable; en `short` todo se achica para entrar. */}
      <div className="flex max-h-full flex-col items-center gap-6 overflow-y-auto px-8 py-8 text-center short:gap-3 short:py-4">
        <motion.div {...rise(0.05)}>
          <div
            className="rounded-lg border-[3px] px-8 py-6 short:px-5 short:py-3"
            style={{
              borderColor: WHITE,
              boxShadow: `0 0 16px ${WHITE}59, inset 0 0 10px ${WHITE}26`,
              background: 'rgba(10, 10, 10, 0.55)',
            }}
          >
            <PicaLogo className="h-24 w-auto text-text-primary short:h-14" />
          </div>
        </motion.div>

        <motion.h2
          id="random-overlay-title"
          className="font-display text-pica-title font-bold uppercase text-text-primary"
          style={{ letterSpacing: '0.1em' }}
          {...rise(0.18)}
        >
          ¡Pica!
        </motion.h2>

        <motion.p
          className="max-w-sm font-sans text-pica-paragraph text-text-secondary"
          {...rise(0.3)}
        >
          Como en el escondite: «¡pica!» es encontrar al que estaba escondido.
          Acá los escondidos son los datos — tocá el botón y te revelamos una
          estadística al azar, de cualquier temática.
        </motion.p>

        <motion.div className="flex gap-4" {...rise(0.42)}>
          <button
            ref={exploreRef}
            type="button"
            onClick={() => router.push(getRandomDatasetUrl())}
            className="font-display text-pica-button px-6 py-2 font-bold uppercase transition-transform hover:scale-105"
            style={{ backgroundColor: WHITE, color: '#0A0A0A', letterSpacing: '0.06em' }}
          >
            Dato al azar
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
    </motion.div>
  );
}
