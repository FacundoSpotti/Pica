'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — EntityIcon
// Cada ENTIDAD tiene un ícono ÚNICO (pedido de Facundo): mapeo exacto por
// nombre → ícono pixel 16×16 propio o combinación de sprites. El color llega
// de la temática, así "Departamentos" (compartida) igual se distingue.
// Para entidades futuras sin mapeo hay fallbacks heurísticos por palabra clave.
// ─────────────────────────────────────────────────────────────────────────────

import PixelIcon, { type PixelIconName } from '@/components/shared/PixelIcon';
import SpriteBadge from '@/components/shared/SpriteBadge';

interface EntityIconProps {
  entidad: string;
  color: string;
  /** alto visual aproximado en px */
  size?: number;
}

/** Mapeo EXACTO entidad → ícono pixel (los sprites se resuelven aparte). */
const ICON_BY_ENTITY: Record<string, PixelIconName> = {
  // Compartida (tinta con el color de cada temática)
  Departamentos: 'mapPin',
  // Trabajo
  'Personas por tramo de edad': 'ageStairs',
  'Personas por nivel educativo': 'pencil',
  'Personas por sexo': 'genderPair',
  'Personas ocupadas': 'briefcase',
  'Sectores de actividad económica': 'factory',
  'Tipos de ocupación': 'helmet',
  Hogares: 'home',
  // Salud
  'Prestadores de salud': 'clinic',
  Personas: 'users',
  'Gasto en salud': 'coins',
  'Niños y niñas menores de 1 año': 'baby',
  'Profesionales de la salud': 'medkit',
  // Educación
  'Jóvenes de 21 a 23 años': 'gradCap',
  'Áreas de conocimiento': 'book',
  // Economía
  Precios: 'priceTag',
  Energía: 'bolt',
  // Seguridad
  'Violencia de género': 'ribbon',
  Delitos: 'shield',
  'Siniestros de tránsito': 'car',
};

export default function EntityIcon({ entidad, color, size = 56 }: EntityIconProps) {
  // 1) Ícono único por entidad (mapeo exacto)
  const mapped = ICON_BY_ENTITY[entidad];
  if (mapped) return <PixelIcon name={mapped} size={size} color={color} />;

  // 2) Sprites: la única entidad de personas "a cuerpo entero" es 25+ (trío
  //    adulto) — el resto de personas ya tiene su ícono propio arriba.
  const e = entidad.toLowerCase();
  if (/25 años|adult/.test(e)) {
    return <SpriteBadge models={['m-01', 'w-01', 'm-05']} color={color} height={size} />;
  }

  // 3) Fallbacks heurísticos para entidades futuras sin mapeo
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
