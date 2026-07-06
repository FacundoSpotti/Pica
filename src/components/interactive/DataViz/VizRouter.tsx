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
import TimeSeriesViz from './TimeSeriesViz';
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
      // No-personas: glifo de dominio (N1) · grilla de íconos (N5) · barras/lista
      if (dataset.glifo) return <IsotypeGlyphViz data={dataset} />;
      if (dataset.presentacion === 'grilla') return <IconGridViz data={dataset} />;
      return <DistributionViz data={dataset} />;
    case 'C':
      return persons ? <IsotypeTimeSeriesViz data={dataset} /> : <TimeSeriesViz data={dataset} />;
    case 'D':
      return persons ? <IsotypeMatrixViz data={dataset} /> : <MatrixViz data={dataset} />;
    case 'E':
      return <MapViz data={dataset} />;
  }
}
