'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — piezas compartidas de las visualizaciones
// · VizHeader: característica + entidad (título accesible visible)
// · VizFooter: fuente con link (siempre presente — regla de pica-data)
// · DataTable: alternativa en tabla para lectores de pantalla y curiosos,
//   dentro de <details> (regla de pica-accessibility)
// ─────────────────────────────────────────────────────────────────────────────

import type { Dataset } from '@/types/data';

export function VizHeader({ dataset, compact = false }: { dataset: Dataset; compact?: boolean }) {
  return (
    <header className={compact ? 'mb-3' : 'mb-6'}>
      <p className="font-sans text-pica-subtitle uppercase tracking-widest text-text-muted">
        {dataset.entidad} · {dataset.anio}
      </p>
      <h2 className="font-display text-pica-title font-bold text-text-primary">
        {dataset.caracteristica}
      </h2>
      <p
        className={`mt-2 max-w-xl font-sans text-pica-subtitle text-text-secondary${compact ? ' line-clamp-2' : ''}`}
        title={compact ? dataset.descripcion : undefined}
      >
        {dataset.descripcion}
      </p>
    </header>
  );
}

export function VizFooter({ dataset }: { dataset: Dataset }) {
  return (
    <footer className="mt-6 font-sans text-pica-subtitle text-text-muted">
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

interface DataTableProps {
  caption: string;
  head: string[];
  rows: Array<Array<string | number>>;
}

export function DataTable({ caption, head, rows }: DataTableProps) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer font-sans text-pica-subtitle text-text-secondary underline-offset-2 hover:underline">
        Ver datos en tabla
      </summary>
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
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border-b border-white/10 px-2 py-1 text-text-primary">
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
