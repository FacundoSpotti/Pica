'use client';

// Tipo E — Datos Espaciales: mapa coroplético de Uruguay por departamento.
// GeoJSON local (public/geo) con códigos HASC (UY.XX) que mapean 1:1 a los
// ISO 3166-2 (UY-XX) de los datasets — verificado al descargar el archivo.

import { useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { interpolateRgb, max, min, scaleLinear } from 'd3';
import { TEMA_SCALE } from '@/lib/colors';
import type { DatasetEspacial } from '@/types/data';
import { DataTable, VizFooter, VizHeader } from './VizShared';

const GEO_URL = '/geo/uruguay-departamentos.json';

interface GeoProps {
  NAME_1?: string;
  HASC_1?: string;
}

export default function MapViz({ data }: { data: DatasetEspacial }) {
  const [lo, hi] = TEMA_SCALE[data.tematica];
  const [hovered, setHovered] = useState<{ nombre: string; valor: number } | null>(null);

  const vals = data.departamentos.map((d) => d.valor);
  const minV = min(vals) ?? 0;
  const maxV = max(vals) ?? 1;
  const t = scaleLinear().domain([minV, maxV]).range([0, 1]).clamp(true);
  const colorOf = (v: number) => interpolateRgb(lo, hi)(t(v));

  const byId = new Map(data.departamentos.map((d) => [d.id, d]));

  return (
    <div>
      <VizHeader dataset={data} />

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div
          role="img"
          aria-label={`Mapa de Uruguay: ${data.caracteristica}. Valores de ${minV} a ${maxV} ${data.unidad ?? ''}.`}
          className="w-full max-w-md"
        >
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 4200, center: [-55.8, -32.6] }}
            width={480}
            height={520}
            style={{ width: '100%', height: 'auto' }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const props = geo.properties as GeoProps;
                  const iso = props.HASC_1?.replace('.', '-') ?? '';
                  const dept = byId.get(iso as never);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={dept ? colorOf(dept.valor) : '#26262A'}
                      stroke="#0A0A0A"
                      strokeWidth={1}
                      onMouseEnter={() => dept && setHovered(dept)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none', opacity: 0.85, cursor: 'pointer' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        <div className="md:pt-8">
          {/* Lectura del departamento bajo el cursor */}
          <div aria-live="polite" className="min-h-16">
            {hovered ? (
              <>
                <p className="font-sans text-pica-paragraph text-text-secondary">{hovered.nombre}</p>
                <p
                  className="font-display text-pica-heading-2 font-bold"
                  style={{ color: hi, fontVariationSettings: '"ELGR" 1, "ELSH" 2' }}
                >
                  {hovered.valor.toLocaleString('es-UY')}
                  {data.unidad === '%' ? '%' : ''}
                </p>
              </>
            ) : (
              <p className="font-sans text-pica-subtitle text-text-muted">
                Pasá el cursor por un departamento
              </p>
            )}
          </div>

          {/* Leyenda min → max */}
          <div className="mt-6 flex items-center gap-2 font-sans text-pica-subtitle text-text-secondary">
            <span>{minV.toLocaleString('es-UY')}</span>
            <div
              className="h-2 w-28"
              style={{ background: `linear-gradient(to right, ${lo}, ${hi})` }}
              aria-hidden="true"
            />
            <span>
              {maxV.toLocaleString('es-UY')}
              {data.unidad === '%' ? '%' : ''}
            </span>
          </div>
        </div>
      </div>

      <DataTable
        caption={data.caracteristica}
        head={['Departamento', `Valor${data.unidad ? ` (${data.unidad})` : ''}`]}
        rows={[...data.departamentos]
          .sort((a, b) => b.valor - a.valor)
          .map((d) => [d.nombre, d.valor])}
      />
      <VizFooter dataset={data} />
    </div>
  );
}
