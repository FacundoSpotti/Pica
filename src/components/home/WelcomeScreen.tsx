'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — WelcomeScreen
// Pantalla de entrada: fondo negro, "Bienvenido a Pica" + slogan, centrado.
// Funciona además como pantalla de carga: mientras se muestra, precarga el
// landscape (la imagen pesada del home), con un mínimo para que el texto se
// alcance a leer y un tope para no retener el home si algo falla.
// Solo aparece en la PRIMERA carga real de la página (flag a nivel de módulo):
// volver al home navegando dentro de la app no la repite.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import UruguayFlag from '@/components/shared/UruguayFlag';
import { assetUrl, LANDSCAPE_COMPLETE } from '@/lib/assets';

let shownThisLoad = false;

const MIN_MS = 2000; // mínimo visible: que el slogan se alcance a leer
const MAX_MS = 6000; // tope: nunca retener el home más que esto

export default function WelcomeScreen() {
  const [visible, setVisible] = useState(() => !shownThisLoad);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (!visible) return;
    shownThisLoad = true;
    const start = performance.now();
    let finished = false;
    let minTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (finished) return;
      finished = true;
      setVisible(false);
    };
    // Precargar el asset más pesado del home mientras se lee la bienvenida
    const img = new Image();
    img.src = assetUrl(LANDSCAPE_COMPLETE);
    const onReady = () => {
      const rest = Math.max(0, MIN_MS - (performance.now() - start));
      minTimer = setTimeout(finish, rest);
    };
    img.decode().then(onReady).catch(onReady);
    const failsafe = setTimeout(finish, MAX_MS);
    return () => {
      clearTimeout(failsafe);
      if (minTimer) clearTimeout(minTimer);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-label="Bienvenido a Pica — cargando"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[#050505] px-6 text-center"
          style={{
            backgroundImage:
              'radial-gradient(60% 50% at 50% 45%, rgba(235, 235, 235, 0.05), transparent 70%)',
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduce ? 0 : 0.6, ease: 'easeOut' }}
        >
          <motion.h1
            className="font-display text-pica-heading-2 font-bold uppercase text-white"
            style={{ letterSpacing: '0.08em' }}
            initial={{ opacity: 0, y: shouldReduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.5, delay: 0.1 }}
          >
            Bienvenido a Pica
          </motion.h1>
          <motion.p
            className="max-w-md font-sans text-pica-paragraph text-white/80"
            initial={{ opacity: 0, y: shouldReduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.5, delay: 0.45 }}
          >
            Los datos estaban escondidos. Pica los encuentra.
          </motion.p>
          {/* Bandera pixel flameando — esto es Uruguay */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: shouldReduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.5, delay: 0.8 }}
          >
            <UruguayFlag height={26} />
            <span className="font-sans text-pica-subtitle uppercase tracking-[0.2em] text-white/60">
              Datos de Uruguay
            </span>
          </motion.div>
          {/* Indicador de carga: tres píxeles parpadeando */}
          <div className="mt-2 flex gap-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 bg-white"
                animate={shouldReduce ? { opacity: 0.8 } : { opacity: [0.15, 1, 0.15] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
