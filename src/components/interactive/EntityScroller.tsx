'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — EntityScroller
// Scroll vertical con snap: cada entidad ocupa el viewport y hace snap al
// centro. Click (o Enter/Espacio) bloquea la entidad y activa la exploración
// horizontal de características. Navegable con ↑/↓ (pica-accessibility).
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import EntityIcon from '@/components/interactive/EntityIcon';
import { TEMA_COLOR } from '@/lib/colors';
import { getCaracteristicas } from '@/lib/datasets';
import type { Tematica } from '@/types/sprites';

interface EntityScrollerProps {
  tema: Tematica;
  entidades: string[];
  onSelect: (entidad: string) => void;
}

export default function EntityScroller({ tema, entidades, onSelect }: EntityScrollerProps) {
  const color = TEMA_COLOR[tema];
  const containerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  const scrollToIndex = (i: number) => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(entidades.length - 1, i));
    el.scrollTo({ top: idx * el.clientHeight, behavior: 'smooth' });
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setCurrent(Math.round(el.scrollTop / el.clientHeight));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        scrollToIndex(current + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        scrollToIndex(current - 1);
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const entidad = entidades[current];
        if (entidad) onSelect(entidad);
        break;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label="Entidades disponibles — usá las flechas y Enter"
      aria-activedescendant={`entidad-${current}`}
      className="h-full snap-y snap-mandatory overflow-y-auto"
    >
      {entidades.map((entidad, i) => {
        const count = getCaracteristicas(tema, entidad).length;
        const active = i === current;
        return (
          <section
            key={entidad}
            id={`entidad-${i}`}
            role="option"
            aria-selected={active}
            className="flex h-full snap-center flex-col items-center justify-center gap-4 px-8 text-center"
          >
            <p
              className="font-display text-pica-subtitle font-bold uppercase"
              style={{ color, letterSpacing: '0.12em' }}
            >
              Entidad {i + 1} de {entidades.length}
            </p>
            {/* Icono + nombre en el mismo botón (todo clickeable) */}
            <button
              type="button"
              onClick={() => onSelect(entidad)}
              className="flex flex-col items-center gap-4 transition-transform hover:scale-105"
              style={{ opacity: active ? 1 : 0.4 }}
            >
              <EntityIcon entidad={entidad} color={color} size={72} />
              <span className="font-display text-pica-heading-2 font-bold text-text-primary">
                {entidad}
              </span>
            </button>
            <p className="font-sans text-pica-paragraph text-text-secondary">
              {count} {count === 1 ? 'característica' : 'características'} para explorar
            </p>
            {i < entidades.length - 1 && (
              <p aria-hidden="true" className="mt-8 animate-bounce font-sans text-pica-paragraph text-text-muted">
                ↓
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
