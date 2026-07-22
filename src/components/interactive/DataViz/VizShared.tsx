'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — piezas compartidas de las visualizaciones
// · VizHeader: característica + entidad (título accesible visible)
// · VizFooter: fuente con link (siempre presente — regla de pica-data)
// · DataTable: alternativa en tabla para lectores de pantalla y curiosos,
//   dentro de <details> (regla de pica-accessibility)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { Dataset } from '@/types/data';

export function VizHeader({
  dataset,
  compact = false,
  center = false,
}: {
  dataset: Dataset;
  compact?: boolean;
  center?: boolean;
}) {
  // "ver más": si la descripción quedó recortada por el clamp, un toggle la
  // expande completa. El overflow se detecta midiendo el párrafo.
  const pRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  useEffect(() => {
    setExpanded(false);
    const check = () => {
      const el = pRef.current;
      if (!el) return;
      // Tolerancia de media línea: el redondeo del line-height daba falsos
      // positivos con textos de una sola línea.
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
      setClamped(el.scrollHeight - el.clientHeight > lh / 2);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [dataset.id, dataset.descripcion]);

  const clampClasses = expanded
    ? ''
    : ` short:line-clamp-1${compact ? ' line-clamp-2' : ''}`;

  return (
    // short: (desktop bajo, ej. 1024×600) comprime el encabezado para que la
    // visualización entre sin scroll ni corte.
    <header className={`${compact ? 'mb-3' : 'mb-6'} short:mb-1${center ? ' text-center' : ''}`}>
      <p className="font-sans text-pica-subtitle uppercase tracking-widest text-text-muted short:hidden">
        {dataset.entidad} · {dataset.anio}
      </p>
      <h2 className="font-display text-pica-title font-bold text-text-primary short:text-2xl short:leading-7">
        {dataset.caracteristica}
      </h2>
      <p
        ref={pRef}
        className={`mt-2 max-w-xl font-sans text-pica-subtitle text-text-secondary short:mt-0${clampClasses}${center ? ' mx-auto' : ''}`}
      >
        {dataset.descripcion}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="mt-0.5 font-sans text-pica-subtitle text-text-muted underline underline-offset-2 hover:text-text-secondary"
        >
          {expanded ? 'ver menos' : 'ver más'}
        </button>
      )}
    </header>
  );
}

export function VizFooter({ dataset }: { dataset: Dataset }) {
  return (
    // Sin margen propio: el espaciado lo pone VizMeta (la fuente va INMEDIATAMENTE
    // debajo del link "Ver datos en tabla").
    <footer className="mt-2 font-sans text-pica-subtitle text-text-muted">
      Fuente: {dataset.fuente}
      {dataset.fuenteUrl && (
        <>
          {' · '}
          <a
            href={dataset.fuenteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-text-secondary"
          >
            ver fuente
          </a>
        </>
      )}
    </footer>
  );
}

/**
 * Pie unificado de TODA visualización: "Ver datos en tabla" (si hay tabla) +
 * la fuente inmediatamente debajo. SIEMPRE alineado a la izquierda y a ancho
 * completo (nunca centrado) — antes cada device lo colocaba a su manera y
 * quedaba centrado en unas pantallas y a la izquierda en otras.
 * Usar esto en lugar de <DataTable/> + <VizFooter/> sueltos.
 */
export function VizMeta({ dataset, table }: { dataset: Dataset; table?: DataTableProps }) {
  return (
    <div className="mt-6 w-full text-left short:mt-3">
      {table && <DataTable {...table} />}
      <VizFooter dataset={dataset} />
    </div>
  );
}

interface DataTableProps {
  caption: string;
  head: string[];
  rows: Array<Array<string | number>>;
}

export function DataTable({ caption, head, rows }: DataTableProps) {
  return (
    <details>
      <summary className="cursor-pointer font-sans text-pica-subtitle text-text-secondary underline-offset-2 hover:underline">
        Ver datos en tabla
      </summary>
      {/* La tabla se despliega COMPLETA: con una tabla abierta el visor
          permite scroll de página (ver CharacteristicExplorer :has). */}
      <table className="mt-2 w-full max-w-md border-collapse font-sans text-pica-subtitle">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="border-b border-white/20 px-2 py-1 text-left text-text-secondary"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/10">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1 text-text-primary">
                  {typeof cell === 'number' ? cell.toLocaleString('es-UY') : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
