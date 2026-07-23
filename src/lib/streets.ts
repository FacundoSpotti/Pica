// ─────────────────────────────────────────────────────────────────────────────
// PICA — geometría del stage y de las calles (fuente de verdad compartida)
//
// La ciudad ya no vive dentro de una imagen: los edificios quedan en su caja
// calibrada y las CALLES se generan por código desde STREET_PATHS, extendidas
// hasta salir del viewport. StreetGrid (SVG) y useColorDots (puntos) usan el
// MISMO transform, así calles y puntos coinciden exactamente con la perspectiva.
//
// La caja del stage mantiene SIEMPRE la relación de aspecto del arte (4096×2305)
// y queda centrada en el viewport con el mismo margen que el Home de hoy — así
// los edificios no se mueven (ver criterio de aceptación §10 del spec).
// ─────────────────────────────────────────────────────────────────────────────

export const ART = { w: 4096, h: 2305 } as const;
export const ASPECT = ART.w / ART.h;

/** Margen reservado del viewport (px) — mismo valor que el letterbox del Home. */
const V_MARGIN = 150;
/** Ancho máximo de la caja como fracción del viewport (mismo que hoy: 93vw). */
const W_FRAC = 0.93;

export interface StageBox {
  originX: number;
  originY: number;
  w: number;
  h: number;
}

/**
 * Caja del stage para un viewport dado: contain con margen, centrada.
 * Coincide con `min(93vw, (100vh-150px)*ASPECT)` del Home → los edificios
 * mantienen su posición exacta.
 */
export function stageBox(vw: number, vh: number): StageBox {
  const w = Math.min(W_FRAC * vw, (vh - V_MARGIN) * ASPECT);
  const h = Math.min(vh - V_MARGIN, (W_FRAC * vw) / ASPECT);
  return { originX: (vw - w) / 2, originY: (vh - h) / 2, w, h };
}

/** Punto normalizado (0–1) de la caja → pixel de pantalla. */
export function toScreen(nx: number, ny: number, box: StageBox): [number, number] {
  return [box.originX + nx * box.w, box.originY + ny * box.h];
}

/**
 * Extiende una polilínea (coords normalizadas 0–1 de la caja) hacia afuera:
 * extrapola el primer y el último segmento hasta que su extremo cae fuera del
 * viewport + `margin`. El corte se evalúa en PÍXELES de pantalla (para cubrir
 * el margen real en cualquier relación de aspecto). Devuelve la polilínea
 * normalizada ya extendida — como la caja conserva el aspecto del arte, el
 * ángulo visual se mantiene idéntico a la perspectiva isométrica.
 */
export function extendPath(
  pts: ReadonlyArray<readonly [number, number]>,
  box: StageBox,
  vw: number,
  vh: number,
  margin = 0.12,
): Array<[number, number]> {
  if (pts.length < 2) return pts.map(([x, y]) => [x, y] as [number, number]);
  const mx = margin * vw;
  const my = margin * vh;
  const outside = (sx: number, sy: number) =>
    sx < -mx || sx > vw + mx || sy < -my || sy > vh + my;

  const extend = (from: readonly [number, number], to: readonly [number, number]): [number, number] => {
    const dx = from[0] - to[0];
    const dy = from[1] - to[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = (dx / len) * 0.04;
    const uy = (dy / len) * 0.04;
    let nx = from[0];
    let ny = from[1];
    for (let i = 0; i < 400; i++) {
      const [sx, sy] = toScreen(nx, ny, box);
      if (outside(sx, sy)) break;
      nx += ux;
      ny += uy;
    }
    return [nx, ny];
  };

  const head = extend(pts[0]!, pts[1]!);
  const tail = extend(pts[pts.length - 1]!, pts[pts.length - 2]!);
  const middle = pts.slice(1, -1).map(([x, y]) => [x, y] as [number, number]);
  return [head, ...middle, tail];
}
