// ─────────────────────────────────────────────────────────────────────────────
// PICA — estado compartido de las herramientas de calibración (dev)
// Evita que el PathCalibrator (tecla P) y el HitboxCalibrator (tecla H) estén
// activos a la vez y se pisen los atajos (N, Z, X, C).
// ─────────────────────────────────────────────────────────────────────────────

export type CalibrationMode =
  | 'none'
  | 'paths'
  | 'hitboxes'
  | 'flag'
  | 'placement'
  | 'lamps';

/** Modo activo actual (mutable, compartido entre calibradores). */
export const calibration = { mode: 'none' as CalibrationMode };

/** Evento emitido al cambiar de modo, para que ambos componentes re-rendericen. */
export const CALIBRATION_EVENT = 'pica-calibration-mode';

export function setCalibrationMode(mode: CalibrationMode): void {
  calibration.mode = mode;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<CalibrationMode>(CALIBRATION_EVENT, { detail: mode }));
  }
}
