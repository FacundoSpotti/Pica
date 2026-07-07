'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — /nosotros (según wireframe)
// Logo GRANDE al centro (ojos vivos) y las 5 cards orbitándolo, FLOTANDO y
// ARRASTRABLES (disponelas donde quieras). Click en una card → se EXPANDE
// hacia abajo mostrando su texto; el resto de la pantalla queda en blanco y
// negro. Personas grises de los sprites deambulan de fondo (interactivas:
// mantené el click y te miran). Sin scroll ni modales.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PicaLogo from '@/components/shared/PicaLogo';
import AmbientWalkers from '@/components/shared/AmbientWalkers';
import { useIsMobile } from '@/hooks/useIsMobile';
import { picaColors } from '../../../config/tailwind.colors';

/** Casilla que recibe el feedback (TAREA 10). */
const FEEDBACK_EMAIL = 'facuspotti@gmail.com';

interface Card {
  id: string;
  titulo: string;
  color: string;
  /** posición inicial en la grilla 3×3 (el logo ocupa el centro) */
  cell: string;
  contenido: string[];
  /** true → al expandir muestra el formulario de feedback en vez de texto */
  form?: boolean;
}

const CARDS: Card[] = [
  {
    id: 'que',
    titulo: '¿Qué hacemos?',
    color: picaColors.blue[400],
    cell: 'col-start-1 row-start-1 justify-self-start self-start',
    contenido: [
      'Transformamos datos oficiales de Uruguay en experiencias visuales que se pueden explorar, entender y compartir.',
      'Pica no es un dashboard: es un explorador editorial. Las personas se representan con personas — cada figura pixel que ves caminar es una porción real de la población.',
    ],
  },
  {
    id: 'porque',
    titulo: '¿Por qué lo hacemos?',
    color: picaColors.green[400],
    cell: 'col-start-3 row-start-1 justify-self-end self-start',
    contenido: [
      'Los datos públicos estaban escondidos en PDFs y planillas. Pica viene del juego del escondite: "¡Pica! te encontré".',
      'Creemos que entender la información pública es un derecho — y que un dato que no se entiende es un dato que no existe.',
    ],
  },
  {
    id: 'como',
    titulo: '¿Cómo lo hacemos?',
    color: picaColors.yellow[400],
    cell: 'col-start-3 row-start-2 justify-self-end self-center',
    contenido: [
      'Tomamos datos de organismos oficiales, los procesamos a datasets abiertos y validados, y los contamos con pixel art: multitudes de figuras que caminan hasta formar cada cifra.',
      'Referencias: The Pudding y el periodismo visual de datos. Stack: Next.js, Canvas y muchos sprites.',
    ],
  },
  {
    id: 'fuentes',
    titulo: 'Fuentes',
    color: picaColors.red[400],
    cell: 'col-start-1 row-start-2 justify-self-start self-center',
    contenido: [
      'Instituto Nacional de Estadística (ECH, Estadísticas Vitales), INEEd (Mirador Educativo), Ministerio de Salud Pública (PAI) y el catálogo de datos abiertos del Estado.',
      'Cada visualización cita su fuente exacta con link. Los valores provisorios se declaran como tales hasta ser reemplazados por datos oficiales procesados.',
    ],
  },
  {
    id: 'valores',
    titulo: 'Valores',
    color: picaColors.orange[400],
    cell: 'col-start-2 row-start-3 justify-self-center self-end',
    contenido: [
      'Accesibilidad: contraste AA, movimiento reducido respetado, y toda visualización tiene su tabla de datos alternativa.',
      'Transparencia: fuentes citadas, datos abiertos, código legible. Estética con propósito: el pixel art no decora — representa.',
    ],
  },
  {
    id: 'feedback',
    titulo: 'Dejanos tu feedback',
    color: picaColors.cyan[400],
    cell: 'col-start-1 row-start-3 justify-self-start self-end',
    contenido: [],
    form: true,
  },
];

/** Formulario de feedback: arma un mail con el mensaje (sin backend). */
function FeedbackForm({ color }: { color: string }) {
  const [sent, setSent] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const nombre = String(fd.get('nombre') ?? '').trim();
        const mensaje = String(fd.get('mensaje') ?? '').trim();
        if (!mensaje) return;
        const subject = encodeURIComponent('Feedback — Pica');
        const body = encodeURIComponent(`${mensaje}\n\n— ${nombre || 'Anónimo'}`);
        window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
        setSent(true);
      }}
    >
      <p className="font-sans text-pica-subtitle text-text-secondary">
        Contanos qué te gustó, qué falta o qué dato querés ver en Pica.
      </p>
      <label className="flex flex-col gap-1 font-sans text-pica-subtitle text-text-secondary">
        Nombre (opcional)
        <input
          name="nombre"
          type="text"
          autoComplete="name"
          className="border border-white/25 bg-black/40 px-2 py-1.5 font-sans text-pica-subtitle text-text-primary outline-none focus:border-white/60"
        />
      </label>
      <label className="flex flex-col gap-1 font-sans text-pica-subtitle text-text-secondary">
        Mensaje
        <textarea
          name="mensaje"
          required
          rows={3}
          className="resize-none border border-white/25 bg-black/40 px-2 py-1.5 font-sans text-pica-subtitle text-text-primary outline-none focus:border-white/60"
        />
      </label>
      <button
        type="submit"
        className="w-fit px-4 py-1.5 font-display text-pica-button font-bold uppercase text-bg-base"
        style={{ backgroundColor: color, letterSpacing: '0.06em' }}
      >
        Enviar por mail
      </button>
      <p className="font-sans text-pica-subtitle text-text-muted">
        {sent
          ? 'Se abrió tu app de correo — ¡gracias!'
          : `Se abre tu app de correo hacia ${FEEDBACK_EMAIL}.`}
      </p>
    </form>
  );
}

/** Apagado de "todo lo demás" cuando una card está abierta. */
const DIM_STYLE: React.CSSProperties = {
  filter: 'grayscale(1)',
  opacity: 0.35,
  transition: 'filter 300ms ease, opacity 300ms ease',
};
const UNDIM_STYLE: React.CSSProperties = {
  filter: 'none',
  opacity: 1,
  transition: 'filter 300ms ease, opacity 300ms ease',
};

export default function NosotrosPage() {
  const [open, setOpen] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  // Evita que un arrastre dispare el click de expandir
  const draggingRef = useRef(false);
  // Mobile: cards apiladas y scrolleables; el drag se desactiva (pelea con el scroll táctil)
  const isMobile = useIsMobile();

  // Escape colapsa la card abierta
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-bg-base max-md:h-auto max-md:min-h-screen max-md:overflow-y-auto">
      {/* Personas grises deambulando de fondo (mantené el click y te miran) */}
      <div style={open ? DIM_STYLE : UNDIM_STYLE} className="absolute inset-0">
        <AmbientWalkers count={10} />
      </div>

      {/* Nav: solo la vuelta al Home (wireframe) */}
      <header className="z-10 flex items-center p-6">
        <Link
          href="/"
          className="font-display text-pica-button text-text-primary underline-offset-4 hover:underline"
        >
          ← Home
        </Link>
      </header>

      {/* Grilla 3×3: logo al centro, cards orbitando (flotan y se arrastran) */}
      <div
        ref={gridRef}
        className="pointer-events-none z-10 grid min-h-0 flex-1 grid-cols-3 grid-rows-3 items-center gap-4 px-10 pb-10 max-md:flex max-md:flex-col max-md:items-center max-md:gap-4 max-md:px-6 md:px-20"
      >
        {/* Logo central, grande y vivo — en blanco y negro si hay card abierta.
            En mobile va primero, arriba de la pila de cards. */}
        <div
          className="col-start-2 row-start-2 flex flex-col items-center justify-self-center max-md:order-first"
          style={open ? DIM_STYLE : UNDIM_STYLE}
        >
          <PicaLogo className="h-40 w-auto text-text-primary md:h-56" />
          <p className="mt-2 max-w-xs text-center font-sans text-pica-subtitle text-text-secondary">
            Datos de Uruguay que se dejan encontrar.
          </p>
        </div>

        {CARDS.map((card, i) => {
          const isOpen = open === card.id;
          return (
            // Capa 1: ARRASTRE — reposicionala donde se te antoje
            <motion.div
              key={card.id}
              drag={!isMobile}
              dragConstraints={gridRef}
              dragMomentum={false}
              dragElastic={0.06}
              whileDrag={{ scale: 1.05 }}
              onDragStart={() => {
                draggingRef.current = true;
              }}
              onDragEnd={() => {
                setTimeout(() => {
                  draggingRef.current = false;
                }, 0);
              }}
              className={`${card.cell} pointer-events-auto cursor-grab active:cursor-grabbing`}
              style={{ zIndex: isOpen ? 30 : 10, ...(open && !isOpen ? DIM_STYLE : UNDIM_STYLE) }}
            >
              {/* Capa 2: FLOTACIÓN — deriva suave, desfasada por card */}
              <motion.div
                animate={shouldReduce || isOpen ? { y: 0 } : { y: [0, -8, 0, 6, 0] }}
                transition={
                  shouldReduce || isOpen
                    ? { duration: 0.2 }
                    : { duration: 6.5 + i * 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }
                }
              >
                {/* Capa 3: la card — click expande hacia abajo */}
                <div
                  className="w-72 border-2 bg-black/70 max-md:w-[82vw]"
                  style={{ borderColor: card.color }}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => {
                      if (draggingRef.current) return;
                      setOpen((o) => (o === card.id ? null : card.id));
                    }}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left font-display text-pica-button font-bold uppercase"
                    style={{ color: card.color, letterSpacing: '0.08em' }}
                  >
                    {card.titulo}
                    <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: shouldReduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5">
                          {card.form ? (
                            <div className="mt-3">
                              <FeedbackForm color={card.color} />
                            </div>
                          ) : (
                            card.contenido.map((p) => (
                              <p
                                key={p.slice(0, 24)}
                                className="mt-3 font-sans text-pica-subtitle text-text-secondary"
                              >
                                {p}
                              </p>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Pie: crédito académico */}
      <footer
        className="pointer-events-none z-10 pb-4 text-center font-sans text-pica-subtitle text-text-muted"
        style={open ? DIM_STYLE : UNDIM_STYLE}
      >
        Proyecto académico — Diseño Interactivo, Universidad ORT Uruguay · Facundo Spotti
      </footer>
    </main>
  );
}
