'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — StickyNotes (Home)
// Notas pixel "pegadas" alrededor del mapa (ref. estética de escritorio retro,
// sin simular una ventana de Windows): papeles con cinta, levemente rotados,
// asomándose por los bordes del stage. Contienen la población contando
// (Handjet), qué es Pica, las fuentes y la versión.
// La capa no captura clicks (los hitboxes del mapa siguen funcionando).
// ─────────────────────────────────────────────────────────────────────────────

import { motion, useReducedMotion } from 'framer-motion';
import UruguayFlag from '@/components/shared/UruguayFlag';
import { useCountUp } from '@/hooks/useCountUp';

/** Población de Uruguay — Censo 2023, INE (el número del skill). */
const TOTAL_POPULATION = 3_499_451;

function Note({
  className,
  rotate,
  delay,
  flow = false,
  children,
}: {
  className: string;
  rotate: number;
  delay: number;
  /** En flujo (mobile): ocupa su celda en vez de posicionarse sobre el mapa. */
  flow?: boolean;
  children: React.ReactNode;
}) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      // Ancho fluido: en pantallas chicas (ej. 1024×600) las notas a 192px
      // tapaban el mapa y los carteles de hover de las temáticas — clamp las
      // achica proporcionalmente y solo llegan a 12rem en monitores grandes.
      className={`${flow ? 'relative w-full' : `absolute w-[clamp(120px,13vw,12rem)] ${className}`} border-2 border-white/25 bg-gradient-to-b from-[#1B1B18] to-[#101010] px-3 pb-3 pt-4 shadow-[4px_6px_0_rgba(0,0,0,0.45)]`}
      style={{ rotate }}
      initial={{ opacity: 0, y: shouldReduce ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduce ? { duration: 0 } : { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Cinta adhesiva pixel */}
      <span
        aria-hidden="true"
        className="absolute -top-2 left-1/2 h-3 w-12 -translate-x-1/2 bg-gradient-to-b from-white/30 to-white/10"
      />
      {children}
    </motion.div>
  );
}

export default function StickyNotes({ flow = false }: { flow?: boolean }) {
  const shouldReduce = useReducedMotion();
  const population = useCountUp(TOTAL_POPULATION, shouldReduce ?? false, 2200);

  return (
    <>
      {/* Población — arriba a la izquierda, contando al entrar */}
      <Note className="-left-7 -top-5" rotate={-3} delay={0.15} flow={flow}>
        <p className="font-sans text-pica-subtitle uppercase tracking-widest text-text-muted">
          Población
        </p>
        <p
          className="font-display text-[clamp(20px,2.3vw,30px)] font-black leading-none text-text-primary"
          style={{ fontVariationSettings: '"ELGR" 1, "ELSH" 2', fontVariantNumeric: 'tabular-nums' }}
        >
          {Math.round(population).toLocaleString('es-UY')}
        </p>
        <p className="mt-1 font-sans text-pica-subtitle leading-tight text-text-secondary">
          personas · Censo 2023, INE
        </p>
      </Note>

      {/* Qué es Pica — arriba a la derecha */}
      <Note className="-right-7 -top-5" rotate={2.5} delay={0.3} flow={flow}>
        <p className="font-sans text-pica-subtitle uppercase tracking-widest text-text-muted">
          leeme.txt
        </p>
        <p className="mt-1 font-sans text-pica-subtitle leading-snug text-text-secondary">
          Los datos estaban escondidos. Pica los encuentra:{' '}
          <span className="text-text-primary">clickeá un edificio</span> para descubrir su
          temática.
        </p>
      </Note>

      {/* Fuentes — abajo a la izquierda */}
      <Note className="-bottom-6 -left-9" rotate={2} delay={0.45} flow={flow}>
        <p className="font-sans text-pica-subtitle uppercase tracking-widest text-text-muted">
          Fuentes
        </p>
        <p className="mt-1 font-sans text-pica-subtitle leading-snug text-text-secondary">
          INE · INEEd · MSP — datos oficiales, citados en cada visualización.
        </p>
      </Note>

      {/* Versión — abajo a la derecha, chiquita */}
      <Note className="-bottom-5 -right-5 !w-[clamp(88px,8vw,8rem)]" rotate={-2} delay={0.6} flow={flow}>
        {/* Bandera pixel flameando: esto es de Uruguay */}
        <UruguayFlag height={20} className="mb-1" />
        <p className="font-sans text-pica-subtitle leading-tight text-text-muted">
          pica v0.1
          <br />
          ORT Uruguay
        </p>
      </Note>
    </>
  );
}
