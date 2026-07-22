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
import PixelSparkles from '@/components/shared/PixelSparkles';
import UruguayFlag from '@/components/shared/UruguayFlag';
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
  /** Valores: se muestran como tags en vez de párrafos */
  tags?: string[];
}

const CARDS: Card[] = [
  {
    id: 'que',
    titulo: '¿Qué hace Pica?',
    color: picaColors.blue[400],
    cell: 'col-start-1 row-start-1 justify-self-start self-start',
    contenido: [
      'Pica democratiza la información que nos dan pero no nos explican. No buscamos dar respuestas ni imponer una visión positiva o negativa de las cosas — buscamos que cada persona pueda acceder a los datos que describen cómo es este país, desde los que nos involucran directamente hasta los que creemos que no.',
      'En un mundo saturado de información, no podemos desconocer aquella que verdaderamente debería importarnos. No existe empatía ni solución posible en el desconocimiento.',
    ],
  },
  {
    id: 'porque',
    titulo: '¿Por qué?',
    color: picaColors.green[400],
    cell: 'col-start-3 row-start-1 justify-self-end self-start',
    contenido: [
      'En un mundo con tantos estímulos, Pica propone una solución adaptada al lenguaje de hoy: insertar contenido relevante en el medio correcto para llegar a todos, y principalmente a quienes son ajenos a gran parte de las realidades que aquí se describen.',
    ],
  },
  {
    id: 'como',
    titulo: '¿Cómo?',
    color: picaColors.yellow[400],
    cell: 'col-start-3 row-start-2 justify-self-end self-center',
    contenido: [
      'Buscamos visibilizar toda situación que merezca atención, sea por razones positivas o negativas. La imparcialidad es central, y por eso la transparencia y el sustento de cada dato son innegociables.',
      'Recolectamos información de fuentes oficiales y la exhibimos siempre con su crédito. Los datos se muestran tal cual. Las interpretaciones las hace cada usuario — ese no es nuestro fin.',
    ],
  },
  {
    id: 'mision',
    titulo: 'Misión',
    color: picaColors.purple[400],
    cell: 'col-start-2 row-start-1 justify-self-center self-start',
    contenido: ['Democratizar y dar accesibilidad a la información que nos ilustra.'],
  },
  {
    id: 'vision',
    titulo: 'Visión',
    color: picaColors.pink[400],
    cell: 'col-start-3 row-start-3 justify-self-end self-end',
    contenido: [
      'Dar herramientas a todos los uruguayos para que puedan detenerse y tomar conciencia de las realidades de su país.',
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
    contenido: [],
    tags: ['Transparencia', 'Accesibilidad', 'Imparcialidad', 'Diseño', 'Cultura', 'Comunidad'],
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
    <main className="pica-bg relative flex h-screen w-full flex-col overflow-hidden bg-bg-base max-md:h-auto max-md:min-h-dvh max-md:overflow-y-auto">
      {/* Personas grises deambulando de fondo (mantené el click y te miran) */}
      <div style={open ? DIM_STYLE : UNDIM_STYLE} className="absolute inset-0">
        <AmbientWalkers count={isMobile ? 5 : 10} />
        <PixelSparkles count={18} seed={23} className="hidden md:block" />
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
          {/* Bandera pixel flameando — identidad uruguaya del proyecto */}
          <div className="mt-3 flex items-center gap-2">
            <UruguayFlag height={22} />
            <span className="font-sans text-pica-subtitle uppercase tracking-[0.18em] text-text-muted">
              Hecho en Uruguay
            </span>
          </div>
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
              className={`${card.cell} pointer-events-auto cursor-grab active:cursor-grabbing max-md:self-center`}
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
                {/* Capa 3: la card — click expande hacia abajo. */}
                <div
                  className="w-72 border-2 bg-gradient-to-b from-black/80 to-black/60 max-md:w-[82vw]"
                  style={{
                    borderColor: card.color,
                    // Sombra tenue del color de la card — la "despega" del fondo
                    boxShadow: `0 10px 30px -14px ${card.color}66`,
                  }}
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
                        <div className="px-5 pb-5 short:max-h-[45vh] short:overflow-y-auto">
                          {card.form ? (
                            <div className="mt-3">
                              <FeedbackForm color={card.color} />
                            </div>
                          ) : card.tags ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {card.tags.map((t) => (
                                <span
                                  key={t}
                                  className="border px-3 py-1 font-display text-pica-subtitle font-bold uppercase tracking-wide"
                                  style={{ borderColor: card.color, color: card.color }}
                                >
                                  {t}
                                </span>
                              ))}
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

      {/* Pie: crédito de autor (proyecto propio) */}
      <footer
        className="pointer-events-none z-10 mx-auto max-w-md px-8 pb-4 text-center font-sans text-pica-subtitle text-text-muted"
        style={open ? DIM_STYLE : UNDIM_STYLE}
      >
        Pica — un proyecto de Facundo Spotti · Uruguay
      </footer>
    </main>
  );
}
