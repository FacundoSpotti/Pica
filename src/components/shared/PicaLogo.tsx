'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PICA — PicaLogo
// Logo navbar inlineado desde el SVG oficial (120×120) para poder animar las
// PUPILAS (eye-left / eye-right — los dos rects finales del export, ver
// pica-ui): parpadeo y mirada pasivos vía CSS (.pica-eye en globals.css).
// El color se hereda de currentColor.
// ─────────────────────────────────────────────────────────────────────────────

export default function PicaLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      // crispEdges: sin costuras de antialiasing entre rects vecinos cuando el
      // tamaño no es múltiplo exacto (en h-12 aparecían líneas entre píxeles).
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated' }}
    >
      <rect x={30} y={63} width={9} height={6} />
      <rect x={42} y={66} width={6} height={3} />
      <rect x={48} y={63} width={6} height={6} />
      <rect x={57} y={63} width={3} height={6} />
      <rect x={63} y={63} width={3} height={3} />
      <rect x={66} y={63} width={6} height={3} />
      <rect x={69} y={63} width={3} height={6} />
      <rect x={75} y={66} width={3} height={3} />
      <rect x={30} y={57} width={9} height={6} />
      <rect x={42} y={60} width={6} height={3} />
      <rect x={51} y={57} width={3} height={6} />
      <rect x={57} y={57} width={3} height={6} />
      <rect x={63} y={60} width={6} height={3} />
      <rect x={69} y={57} width={3} height={6} />
      <rect x={75} y={60} width={3} height={3} />
      <rect x={81} y={57} width={6} height={6} />
      <rect x={30} y={51} width={6} height={6} />
      <rect x={36} y={51} width={6} height={6} />
      <rect x={42} y={51} width={6} height={6} />
      <rect x={48} y={51} width={6} height={6} />
      <rect x={54} y={51} width={6} height={6} />
      <rect x={60} y={51} width={6} height={6} />
      <rect x={66} y={51} width={6} height={6} />
      <rect x={72} y={51} width={6} height={6} />
      <rect x={78} y={51} width={6} height={6} />
      <rect x={30} y={69} width={6} height={6} />
      <rect x={36} y={69} width={6} height={6} />
      <rect x={42} y={69} width={6} height={6} />
      <rect x={48} y={69} width={6} height={6} />
      <rect x={54} y={69} width={6} height={6} />
      <rect x={60} y={69} width={6} height={6} />
      <rect x={66} y={69} width={6} height={6} />
      <rect x={72} y={69} width={6} height={6} />
      <rect x={78} y={69} width={6} height={6} />
      <rect x={81} y={63} width={9} height={6} />
      <rect x={30} y={75} width={6} height={6} />
      <rect x={36} y={75} width={6} height={6} />
      <rect x={42} y={75} width={6} height={6} />
      <rect x={48} y={75} width={6} height={6} />
      <rect x={54} y={75} width={6} height={6} />
      <rect x={60} y={75} width={6} height={6} />
      <rect x={66} y={75} width={6} height={6} />
      <rect x={72} y={75} width={6} height={6} />
      <rect x={78} y={75} width={6} height={6} />
      <rect x={84} y={75} width={6} height={6} />
      <rect x={30} y={81} width={6} height={6} />
      <rect x={36} y={81} width={6} height={6} />
      <rect x={42} y={81} width={6} height={6} />
      <rect x={48} y={81} width={6} height={6} />
      <rect x={54} y={81} width={6} height={6} />
      <rect x={60} y={81} width={6} height={6} />
      <rect x={66} y={81} width={6} height={6} />
      <rect x={72} y={81} width={6} height={6} />
      <rect x={78} y={81} width={6} height={6} />
      <rect x={84} y={81} width={6} height={6} />
      <rect x={84} y={69} width={6} height={6} />
      <rect x={87} y={57} width={3} height={6} />
      <rect x={84} y={51} width={6} height={6} />
      <rect x={30} y={39} width={6} height={6} />
      <rect x={36} y={33} width={6} height={6} />
      <rect x={36} y={39} width={6} height={6} />
      <rect x={42} y={33} width={6} height={6} />
      <rect x={48} y={33} width={6} height={6} />
      <rect x={54} y={33} width={6} height={6} />
      <rect x={60} y={33} width={6} height={6} />
      <rect x={66} y={33} width={6} height={6} />
      <rect x={72} y={33} width={6} height={6} />
      <rect x={78} y={39} width={6} height={6} />
      <rect x={78} y={33} width={6} height={6} />
      <rect x={84} y={39} width={6} height={6} />
      {/* Pupilas animadas */}
      <rect className="pica-eye" x={48} y={42} width={6} height={6} />
      <rect className="pica-eye" x={66} y={42} width={6} height={6} />
    </svg>
  );
}
