'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — VizRouter
// Elige el componente según tipoResultado (ver pica-data):
// A escalar · B distribución · C serie temporal · D matriz · E mapa.
// REGLA ISOTYPE (pica): si el dato involucra PERSONAS, los tipos B/C/D se
// representan con sprites de personas que caminan a su grilla — la gráfica
// abstracta solo se permite cuando el dato no es de personas.
//
// CODE-SPLITTING (perf): cada viz se carga on-demand con next/dynamic (ssr:false).
// Así la grilla de entidades y el explorador NO arrastran D3, react-simple-maps
// ni el código de las 11 vistas hasta que se abre una característica concreta —
// solo se descarga y parsea la vista que realmente se muestra.
// ─────────────────────────────────────────────────────────────────────────────

import dynamic from 'next/dynamic';
import { isPersonEntity } from '@/lib/isotype';
import type { Dataset } from '@/types/data';

// Fallback mientras baja el chunk de la vista (breve, solo la primera vez por
// tipo). next/dynamic exige que las OPCIONES sean un objeto literal inline
// (para detectar `ssr: false` estáticamente) — por eso no se comparte un `opts`.
const loading = () => (
  <div className="flex min-h-[45vh] w-full items-center justify-center">
    <p className="font-sans text-pica-subtitle text-text-muted">Cargando…</p>
  </div>
);

const ScalarViz = dynamic(() => import('./ScalarViz'), { ssr: false, loading });
const DistributionViz = dynamic(() => import('./DistributionViz'), { ssr: false, loading });
const IsotypeDistributionViz = dynamic(() => import('./IsotypeDistributionViz'), { ssr: false, loading });
const IsotypeGlyphViz = dynamic(() => import('./IsotypeGlyphViz'), { ssr: false, loading });
const IconGridViz = dynamic(() => import('./IconGridViz'), { ssr: false, loading });
const PerCapitaViz = dynamic(() => import('./PerCapitaViz'), { ssr: false, loading });
const PixelBarsViz = dynamic(() => import('./PixelBarsViz'), { ssr: false, loading });
const IsotypeTimeSeriesViz = dynamic(() => import('./IsotypeTimeSeriesViz'), { ssr: false, loading });
const MatrixViz = dynamic(() => import('./MatrixViz'), { ssr: false, loading });
const IsotypeMatrixViz = dynamic(() => import('./IsotypeMatrixViz'), { ssr: false, loading });
const MapViz = dynamic(() => import('./MapViz'), { ssr: false, loading });

export default function VizRouter({ dataset }: { dataset: Dataset }) {
  // Persona si la entidad lo indica por su nombre O si el dataset lo declara
  // explícito (`personas: true`) — norma: conteo de personas ⇒ sprites.
  const persons = isPersonEntity(dataset.entidad) || dataset.personas === true;
  switch (dataset.tipoResultado) {
    case 'A':
      return <ScalarViz data={dataset} />;
    case 'B':
      if (persons) return <IsotypeDistributionViz data={dataset} />;
      // No-personas: per-cápita (persona + glifos) · grilla de íconos (N5, para
      // MUCHAS categorías) · glifo de dominio (N1) · barras/lista.
      // La grilla se evalúa ANTES que el glifo: un dataset con muchas categorías
      // (ej. gasto por área, 21) usa la grilla aunque declare un glifo — la lista
      // de glifos no entra en pantalla con tantas filas.
      if (dataset.presentacion === 'per-capita') return <PerCapitaViz data={dataset} />;
      if (dataset.presentacion === 'grilla') return <IconGridViz data={dataset} />;
      if (dataset.glifo) return <IsotypeGlyphViz data={dataset} />;
      return <DistributionViz data={dataset} />;
    case 'C':
      // No-personas: torres de bloques pixel (la línea D3 desentonaba con la
      // estética — feedback de Facundo sobre nafta e inflación)
      return persons ? <IsotypeTimeSeriesViz data={dataset} /> : <PixelBarsViz data={dataset} />;
    case 'D':
      return persons ? <IsotypeMatrixViz data={dataset} /> : <MatrixViz data={dataset} />;
    case 'E':
      return <MapViz data={dataset} />;
  }
}
