---
name: pica-interactive
description: >
  Cargar cuando se trabaje en la pantalla interactiva de Pica: scroll-snap,
  selección de entidades, exploración horizontal de características, componentes
  de visualización D3, el mapa de Uruguay con React Simple Maps, o cualquier
  lógica de la ruta /interactivo. También cargar cuando se habla de "pantalla
  interactiva", "scroll snap", "entidad", "exploración", "visualización",
  "gráfico", "mapa" en el contexto de la pantalla de datos de Pica.
---

# pica-interactive — Pantalla interactiva de Pica

---

## Arquitectura de la pantalla

```
/interactivo?tema=educacion&entidad=departamentos&caracteristica=nivel-educativo
     │
     ├── InteractiveLayout.tsx        → layout general, recibe params de URL
     │
     ├── EntityScroller.tsx           → scroll vertical con snap, lista de entidades
     │   └── EntityCard.tsx           → tarjeta de entidad individual
     │
     ├── CharacteristicExplorer.tsx   → se activa al hacer clic en entidad
     │   └── scroll horizontal de características
     │
     └── DataViz/
         ├── VizRouter.tsx            → elige componente según tipoResultado
         ├── ScalarViz.tsx            → Tipo A
         ├── DistributionViz.tsx      → Tipo B (D3 barras/dona)
         ├── TimeSeriesViz.tsx        → Tipo C (D3 línea)
         ├── MatrixViz.tsx            → Tipo D (D3 heatmap)
         └── MapViz.tsx               → Tipo E (React Simple Maps)
```

---

## Rutas y parámetros URL

```
/interactivo                               → sin params, muestra selector de temática
/interactivo?tema=educacion                → entra a educación, sin entidad seleccionada
/interactivo?tema=educacion&entidad=departamentos   → entidad bloqueada
/interactivo?tema=educacion&entidad=departamentos&caracteristica=nivel-educativo  → viz activa
```

Todos los parámetros son opcionales y viven en la URL para que el estado sea compartible.

---

## Modelo de interacción

### 1 — Scroll vertical con snap (EntityScroller)
```
El usuario scrollea hacia abajo explorando entidades disponibles.
Cada entidad hace snap al centro del viewport.
```

```typescript
// CSS para scroll-snap en el contenedor
const scrollerStyles = {
  overflowY: 'scroll',
  scrollSnapType: 'y mandatory',
  height: '100vh',
};

// CSS para cada entidad
const entityCardStyles = {
  scrollSnapAlign: 'center',
  height: '100vh',        // cada entidad ocupa el viewport completo
};
```

### 2 — El clic (lock de entidad)
```
Al hacer clic en una entidad:
- Se bloquea el scroll vertical
- La entidad queda centrada en pantalla
- Se activa el modo de exploración horizontal
- La URL se actualiza: ?entidad=departamentos
```

### 3 — Scroll horizontal (CharacteristicExplorer)
```
Con la entidad bloqueada, el usuario scrollea horizontalmente.
Cada característica disponible actualiza la visualización en tiempo real.
La URL se actualiza: ?caracteristica=nivel-educativo
```

---

## VizRouter — cómo enrutar visualizaciones

```typescript
// src/components/interactive/DataViz/VizRouter.tsx
import { ScalarViz } from './ScalarViz';
import { DistributionViz } from './DistributionViz';
import { TimeSeriesViz } from './TimeSeriesViz';
import { MatrixViz } from './MatrixViz';
import { MapViz } from './MapViz';
import type { Dataset } from '@/types/data';

interface VizRouterProps {
  dataset: Dataset;
}

export function VizRouter({ dataset }: VizRouterProps) {
  switch (dataset.tipoResultado) {
    case 'A': return <ScalarViz data={dataset} />;
    case 'B': return <DistributionViz data={dataset} />;
    case 'C': return <TimeSeriesViz data={dataset} />;
    case 'D': return <MatrixViz data={dataset} />;
    case 'E': return <MapViz data={dataset} />;
  }
}
```

---

## MapViz — mapa de Uruguay (Tipo E)

```typescript
// src/components/interactive/DataViz/MapViz.tsx
'use client';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import type { DatasetEspacial } from '@/schemas/base';

// GeoJSON de Uruguay por departamentos
// Descargar de: https://github.com/topojson/world-atlas o similar
const GEO_URL = '/geo/uruguay-departamentos.json';

export function MapViz({ data }: { data: DatasetEspacial }) {
  const valores = data.departamentos.map(d => d.valor);
  const colorScale = scaleLinear<string>()
    .domain([Math.min(...valores), Math.max(...valores)])
    .range(['#e8f4fd', '#1a6fb5']); // ajustar colores al design system

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ scale: 3000, center: [-56, -33] }}
    >
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map(geo => {
            const dept = data.departamentos.find(d => d.id === geo.properties.id);
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={dept ? colorScale(dept.valor) : '#eee'}
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
}
```

**GeoJSON necesario:** descargar el TopoJSON/GeoJSON de Uruguay con IDs ISO 3166-2.
Fuente: https://github.com/jsanz/uruguay-geojson o https://data.humdata.org/dataset/cod-ab-ury

---

## D3 en React — regla de oro

**D3 maneja las matemáticas. React maneja el render.**

```typescript
// ✅ CORRECTO — D3 calcula, React renderiza SVG
import { scaleLinear, max } from 'd3';

function DistributionViz({ data }) {
  const xScale = scaleLinear()
    .domain([0, max(data.categorias, d => d.valor)])
    .range([0, 400]);

  return (
    <svg width={500} height={300}>
      {data.categorias.map((cat, i) => (
        <rect
          key={cat.label}
          x={0}
          y={i * 40}
          width={xScale(cat.valor)}  // D3 calcula el ancho
          height={30}
        />
      ))}
    </svg>
  );
}

// ❌ INCORRECTO — no usar d3.select() con el DOM en componentes React
// d3.select('#mi-svg').append('rect')...  ← esto conflictúa con React
```

---

## Transiciones entre visualizaciones

Usar Framer Motion para animar cambios de dataset:

```typescript
import { AnimatePresence, motion } from 'framer-motion';

function VizContainer({ dataset }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={dataset.id}              // key cambia → trigger de animación
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <VizRouter dataset={dataset} />
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Cómo agregar una nueva entidad o característica

1. Crear el JSON del dataset en `src/data/[tematica]/`
2. Validar con el schema Zod correspondiente (ver pica-data)
3. Registrar en el índice de la temática (`src/data/[tematica]/index.ts`)
4. El `VizRouter` lo renderiza automáticamente según `tipoResultado`
5. Si es un `tipoResultado` nuevo o con lógica especial → crear componente en `DataViz/`

---

## Convenciones de la pantalla interactiva

- El estado activo (entidad + característica) siempre vive en la URL — no en useState
- Los datos se cargan con `fetch` desde `/data/[tematica]/[dataset].json` — no hay API
- Cada cambio de característica usa `router.replace()` sin recargar la página
- Las animaciones de transición duran max 300ms — no interrumpir la exploración
- En mobile: el scroll-snap vertical funciona igual, el horizontal se convierte en swipe
