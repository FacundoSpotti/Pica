'use client';

/* eslint-disable @next/next/no-img-element */
// La previsualización es un data URL generado en runtime — <img> directo, no
// aplica next/image.

// ─────────────────────────────────────────────────────────────────────────────
// PICA — ShareStory (TAREA 6)
// Botón "Compartir" + modal: genera la historia 1080×1920 de la estadística
// actual (branding + dato + multitud) y ofrece Descargar / Compartir (Web Share
// API → Instagram/etc. en móvil). MVP: estadísticas de personas (isotype).
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, type RefObject } from 'react';
import { renderStory } from '@/lib/storyRenderer';
import type { Dataset } from '@/types/data';

interface ShareStoryProps {
  dataset: Dataset;
  vizRef: RefObject<HTMLElement | null>;
}

export default function ShareStory({ dataset, vizRef }: ShareStoryProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = async () => {
    setOpen(true);
    setBusy(true);
    setUrl(null);
    // esperar un frame para que el canvas oculto exista en el DOM
    await new Promise((r) => requestAnimationFrame(r));
    const canvases = vizRef.current
      ? Array.from(vizRef.current.querySelectorAll('canvas'))
      : [];
    const story = canvasRef.current;
    if (!story) return;
    await renderStory(story, dataset, canvases);
    setUrl(story.toDataURL('image/png'));
    setBusy(false);
  };

  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `pica-${dataset.id}.png`;
    a.click();
  };

  const share = () => {
    const story = canvasRef.current;
    if (!story) return;
    story.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `pica-${dataset.id}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Pica', text: '#Uruguay' });
        } catch {
          /* cancelado */
        }
      } else {
        download();
      }
    }, 'image/png');
  };

  return (
    <>
      <button
        type="button"
        onClick={generate}
        className="flex items-center gap-2 border border-white/25 px-3 py-1.5 font-sans text-pica-subtitle text-text-primary transition-colors hover:border-white/60"
      >
        ↗ Compartir
      </button>

      {/* Canvas de trabajo (oculto) — debe existir antes de generar */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Compartir historia"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[92vh] flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {busy && (
              <p className="font-sans text-pica-paragraph text-text-secondary">Generando historia…</p>
            )}
            {url && (
              <img
                src={url}
                alt="Historia de Pica lista para compartir"
                className="max-h-[80vh] w-auto border border-white/20"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={share}
                disabled={!url}
                className="bg-text-primary px-5 py-2 font-display text-pica-button font-bold uppercase text-bg-base disabled:opacity-40"
              >
                Compartir
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!url}
                className="border border-white/30 px-5 py-2 font-display text-pica-button font-bold uppercase text-text-primary disabled:opacity-40"
              >
                Descargar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 font-sans text-pica-subtitle text-text-muted hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
