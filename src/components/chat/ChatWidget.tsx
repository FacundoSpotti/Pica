'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — ChatWidget (TAREA 9)
// Asistente de datos: botón flotante (globo pixel) + panel de chat.
// · Acotado a los datasets reales: el backend (/api/chat) inyecta el catálogo
//   con los números verdaderos y prohíbe inventar cifras.
// · Las respuestas traen links internos /interactivo?... — acá se renderizan
//   como <Link> clickeables; cualquier otro link se muestra como texto plano.
// · z-40: por DEBAJO de los overlays fullscreen (z-50) — un modal abierto
//   siempre tapa el chat.
// Desktop y mobile con el mismo componente (panel fluido).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PixelIcon from '@/components/shared/PixelIcon';
import PicaLogo from '@/components/shared/PicaLogo';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const SUGERENCIAS = [
  '¿Qué departamento tiene la mayor tasa de empleo?',
  '¿Cuántos estudiantes hay en educación terciaria?',
  '¿Cómo evolucionaron los femicidios por año?',
];

const SALUDO =
  'Hola, soy el asistente de Pica. Preguntame por los datos de Uruguay que tenemos cargados — trabajo, salud, educación, economía y seguridad — y te llevo a la visualización.';

/**
 * Render del texto del bot: convierte [etiqueta](/interactivo?...) en <Link>
 * y deja el resto como texto. Solo se aceptan links INTERNOS a /interactivo;
 * cualquier otra URL queda como texto plano (sin HTML crudo — sin XSS).
 */
function renderRich(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((\/interactivo[^)\s]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <Link
        key={k++}
        href={m[2]!}
        className="font-bold text-text-primary underline underline-offset-4"
      >
        {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldReduce = useReducedMotion();

  // Autoscroll al último mensaje
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, loading]);

  // Escape cierra el panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...msgs, { role: 'user', content }];
    setMsgs(next);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const d = (await r.json()) as { text?: string; error?: string };
      if (!r.ok || typeof d.text !== 'string') throw new Error(d.error ?? 'error');
      setMsgs((m) => [...m, { role: 'assistant', content: d.text! }]);
    } catch {
      setError('No pude responder — probá de nuevo en un momento.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Cerrar asistente de datos' : 'Abrir asistente de datos'}
        className="pica-sheen fixed bottom-5 right-5 z-40 flex h-[52px] w-[52px] items-center justify-center border-2 border-white/25 transition-transform hover:scale-105"
        style={{ backgroundColor: '#EBEBEB' }}
      >
        {open ? (
          <span aria-hidden="true" className="font-display text-2xl font-bold" style={{ color: '#0A0A0A' }}>
            ×
          </span>
        ) : (
          <PixelIcon name="chat" size={26} color="#0A0A0A" />
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Asistente de datos de Pica"
            className="fixed bottom-20 right-5 z-40 flex w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden border-2 border-white/25 bg-gradient-to-b from-[#161614] to-[#0C0C0B] shadow-[6px_8px_0_rgba(0,0,0,0.45)] max-md:inset-x-3 max-md:bottom-20 max-md:w-auto"
            style={{ maxHeight: 'min(560px, calc(100dvh - 7rem))' }}
            initial={{ opacity: 0, y: shouldReduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduce ? 0 : 16 }}
            transition={{ duration: shouldReduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Encabezado */}
            <header className="flex items-center gap-3 border-b border-white/15 px-4 py-3">
              <PicaLogo className="h-8 w-auto text-text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-pica-subtitle font-bold uppercase tracking-[0.14em] text-text-primary">
                  Asistente de datos
                </p>
                <p className="truncate font-sans text-[13px] leading-tight text-text-muted">
                  Responde solo con datos oficiales cargados en Pica
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="px-1 font-display text-pica-button text-text-secondary hover:text-text-primary"
              >
                ×
              </button>
            </header>

            {/* Mensajes */}
            <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <p className="font-sans text-pica-subtitle leading-snug text-text-secondary">
                {SALUDO}
              </p>

              {/* Sugerencias iniciales */}
              {msgs.length === 0 && (
                <div className="flex flex-col items-start gap-2 pt-1">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="border border-white/25 px-3 py-1.5 text-left font-sans text-pica-subtitle text-text-secondary transition-colors hover:border-white/60 hover:text-text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {msgs.map((m, i) =>
                m.role === 'user' ? (
                  <p
                    key={i}
                    className="ml-8 border border-white/25 bg-white/[0.06] px-3 py-2 font-sans text-pica-subtitle leading-snug text-text-primary"
                  >
                    {m.content}
                  </p>
                ) : (
                  <p
                    key={i}
                    className="mr-4 font-sans text-pica-subtitle leading-snug text-text-secondary"
                  >
                    {renderRich(m.content)}
                  </p>
                ),
              )}

              {/* Pensando: tres píxeles parpadeando (mismo lenguaje que la bienvenida) */}
              {loading && (
                <div className="flex gap-1.5 py-1" aria-label="El asistente está escribiendo">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 bg-text-secondary"
                      animate={shouldReduce ? { opacity: 0.7 } : { opacity: [0.15, 1, 0.15] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                    />
                  ))}
                </div>
              )}

              {error && (
                <p className="font-sans text-pica-subtitle text-pica-red-400">{error}</p>
              )}
            </div>

            {/* Entrada */}
            <form
              className="flex gap-2 border-t border-white/15 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Preguntá por un dato…"
                aria-label="Tu pregunta para el asistente"
                maxLength={500}
                className="min-w-0 flex-1 border border-white/25 bg-black/40 px-3 py-2 font-sans text-pica-subtitle text-text-primary outline-none placeholder:text-text-muted focus:border-white/60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2 font-display text-pica-subtitle font-bold uppercase tracking-wide text-bg-base disabled:opacity-40"
                style={{ backgroundColor: '#EBEBEB' }}
              >
                Enviar
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
