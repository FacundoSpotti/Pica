'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — VizRouter
// Elige el componente según tipoResultado (ver pica-data):
// A escalar · B distribución · C serie temporal · D matriz · E mapa.
// REGLA ISOTYPE (pica): si el dato involucra PERSONAS, los tipos B/C/D se
// representan con sprites de personas que caminan a su grilla — la gráfica
// abstracta solo se permite cuando el dato no es de personas.
// ─────────────────────────────────────────────────────────────────────────────

import ScalarViz from './ScalarViz';
import DistributionViz from './DistributionViz';
import IsotypeDistributionViz from './IsotypeDistributionViz';
import IsotypeGlyphViz from './IsotypeGlyphViz';
import IconGridViz from './IconGridViz';
import PerCapitaViz from './PerCapitaViz';
import PixelBarsViz from './PixelBarsViz';
import IsotypeTimeSeriesViz from './IsotypeTimeSeriesViz';
import MatrixViz from './MatrixViz';
import IsotypeMatrixViz from './IsotypeMatrixViz';
import MapViz from './MapViz';
import { isPersonEntity } from '@/lib/isotype';
import type { Dataset } from '@/types/data';

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
