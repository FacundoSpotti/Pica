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
import TimeSeriesViz from './TimeSeriesViz';
import MatrixViz from './MatrixViz';
import MapViz from './MapViz';
import { isPersonEntity } from '@/lib/isotype';
import type { Dataset } from '@/types/data';

export default function VizRouter({ dataset }: { dataset: Dataset }) {
  const persons = isPersonEntity(dataset.entidad);
  switch (dataset.tipoResultado) {
    case 'A':
      return <ScalarViz data={dataset} />;
    case 'B':
      return persons ? (
        <IsotypeDistributionViz data={dataset} />
      ) : (
        <DistributionViz data={dataset} />
      );
    case 'C':
      // TODO(isotype): versión con sprites en camino — validando enfoque con B
      return <TimeSeriesViz data={dataset} />;
    case 'D':
      // TODO(isotype): ídem C
      return <MatrixViz data={dataset} />;
    case 'E':
      return <MapViz data={dataset} />;
  }
}
