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

import { useRef, useState } from 'react';
import type { Dataset } from '@/types/data';

interface ShareStoryProps {
  dataset: Dataset;
}

export default function ShareStory({ dataset }: ShareStoryProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = async () => {
    setOpen(true);
    setBusy(true);
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setBlob(null);
    // esperar un frame para que el canvas oculto exista en el DOM
    await new Promise((r) => requestAnimationFrame(r));
    const story = canvasRef.current;
    if (!story) return;
    // storyRenderer arrastra D3 (incluido d3-geo) — se carga on-demand acá, solo
    // al compartir, para no pesar en la carga del explorador.
    const { renderStory } = await import('@/lib/storyRenderer');
    await renderStory(story, dataset);
    // Blob + object URL (los data URLs fallan al descargar en iOS/Android)
    const b = await new Promise<Blob | null>((res) => story.toBlob(res, 'image/png'));
    if (b) {
      setBlob(b);
      setUrl(URL.createObjectURL(b));
    }
    setBusy(false);
  };

  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `pica-${dataset.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // ¿La Web Share API puede compartir este archivo? (requiere HTTPS/localhost)
  const canNativeShare = (): boolean => {
    if (!blob || typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    const file = new File([blob], `pica-${dataset.id}.png`, { type: 'image/png' });
    return typeof nav.share === 'function' && nav.canShare?.({ files: [file] }) === true;
  };

  // IMPORTANTE: navigator.share debe correr DENTRO del gesto del click (sin
  // await previo que consuma la activación) — por eso el blob se genera antes.
  const share = () => {
    if (!blob) return;
    if (canNativeShare()) {
      const file = new File([blob], `pica-${dataset.id}.png`, { type: 'image/png' });
      navigator.share({ files: [file], title: 'Pica', text: '#Uruguay' }).catch(() => {
        /* cancelado por el usuario */
      });
    } else {
      // Sin Web Share (desktop o contexto no seguro): descargar
      download();
    }
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
            {url && !canNativeShare() && (
              <p className="max-w-xs text-center font-sans text-pica-subtitle text-text-muted">
                Este navegador no permite compartir directo: se descarga la imagen
                y la compartís desde tu galería.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
