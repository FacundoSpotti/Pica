'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — EntityIcon
// Icono representativo de una entidad para lectura rápida:
// personas/jóvenes → sprites del proyecto · niños → sprites infantiles ·
// hogares → casa pixel · departamentos → pin de mapa pixel.
// ─────────────────────────────────────────────────────────────────────────────

import PixelIcon from '@/components/shared/PixelIcon';
import SpriteBadge from '@/components/shared/SpriteBadge';

interface EntityIconProps {
  entidad: string;
  color: string;
  /** alto visual aproximado en px */
  size?: number;
}

export default function EntityIcon({ entidad, color, size = 56 }: EntityIconProps) {
  const e = entidad.toLowerCase();

  if (/niñ/.test(e)) {
    return <SpriteBadge models={['cm-01', 'cw-02', 'cm-03']} color={color} height={size * 0.8} />;
  }
  if (/j[oó]ven/.test(e)) {
    return <SpriteBadge models={['w-03', 'm-02']} color={color} height={size} />;
  }
  if (/persona|poblaci[oó]n|habitante|activ/.test(e)) {
    return <SpriteBadge models={['m-01', 'w-01', 'm-05']} color={color} height={size} />;
  }
  if (/hogar|vivienda|casa/.test(e)) {
    return <PixelIcon name="home" size={size} color={color} />;
  }
  if (/departamento|territorio|regi[oó]n|localidad/.test(e)) {
    return <PixelIcon name="mapPin" size={size} color={color} />;
  }
  if (/instituci|centro|escuela|liceo/.test(e)) {
    return <PixelIcon name="building" size={size} color={color} />;
  }
  // Genérico: grupo de personas
  return <PixelIcon name="users" size={size} color={color} />;
}
