# ─────────────────────────────────────────────────────────────────────────────
# PICA — pixelate-landscape.py
# Convierte el landscape (y sus capas) a PIXEL ART REAL: mosaico donde cada
# celda de N×N píxeles toma el COLOR PREDOMINANTE (moda) de esa zona, sobre
# una paleta global cuantizada (median cut) compartida por todas las capas.
#
# Claves del diseño:
# · La MISMA grilla (origen 0,0 y celda N) para todas las capas → el mosaico
#   coincide entre capas y los hitboxes/paths en % siguen válidos sin tocar.
# · Paleta GLOBAL construida desde Landscape_complete → coherencia de color.
# · Alpha por celda: si ≥50% de los píxeles son opacos, la celda es opaca y
#   toma la moda de SOLO los píxeles opacos; si no, es transparente.
# · Salida a resolución REDUCIDA (W/N × H/N): el navegador escala con
#   image-rendering: pixelated (nearest) → bloques nítidos y archivos livianos.
#
# Uso:
#   python scripts/pixelate-landscape.py --cell 4 --colors 64            # todas las capas
#   python scripts/pixelate-landscape.py --cell 3 --only complete        # solo el fondo (pruebas)
# ─────────────────────────────────────────────────────────────────────────────

import argparse
import io
from pathlib import Path

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

LANDSCAPE_DIR = Path('public/assets/design_system/landscape')
FILES = {
    'complete': 'Landscape_complete.png',
    'background': 'Landscape_background.png',
    'palacio': 'Landscape_parts_palacio_legislativo.png',
    'educacion': 'Landscape_parts-educacion.png',
    'trabajo': 'Landscape_parts_trabajo.png',
    'salud': 'Landscape_parts_salud.png',
    'economia': 'Landscape_parts_economia.png',
    'seguridad': 'Landscape_parts_seguridad.png',
}


def build_palette(img_rgb: Image.Image, colors: int) -> Image.Image:
    """Paleta global (median cut) desde la imagen completa."""
    return img_rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


def palette_indices(img_rgb: Image.Image, pal_img: Image.Image) -> np.ndarray:
    """Índice de paleta por píxel (sin dithering — zonas planas, no ruido)."""
    q = img_rgb.quantize(palette=pal_img, dither=Image.Dither.NONE)
    return np.asarray(q, dtype=np.uint16)


def mosaic(rgba: np.ndarray, idx: np.ndarray, palette: np.ndarray, cell: int) -> np.ndarray:
    """Mosaico (H//cell × W//cell × RGBA): moda de paleta por celda, alpha por mayoría."""
    h, w = idx.shape
    rows, cols = h // cell, w // cell
    k = len(palette)
    idx = idx[: rows * cell, : cols * cell].copy()
    alpha = rgba[: rows * cell, : cols * cell, 3]

    # Píxeles transparentes van a un bucket extra (k) que no compite por la moda
    opaque = alpha >= 128
    idx[~opaque] = k

    # Índice de celda por píxel → bincount combinado (vectorizado, sin loops)
    cell_row = np.arange(rows * cell) // cell
    cell_col = np.arange(cols * cell) // cell
    cell_id = cell_row[:, None] * cols + cell_col[None, :]
    combined = cell_id.astype(np.int64) * (k + 1) + idx.astype(np.int64)

    out = np.zeros((rows * cols, 4), dtype=np.uint8)
    counts = np.bincount(combined.ravel(), minlength=rows * cols * (k + 1)).reshape(rows * cols, k + 1)

    opaque_counts = counts[:, :k]
    n_opaque = opaque_counts.sum(axis=1)
    is_opaque = n_opaque * 2 >= cell * cell  # ≥50% de la celda con contenido
    best = opaque_counts.argmax(axis=1)

    out[is_opaque, :3] = palette[best[is_opaque]]
    out[is_opaque, 3] = 255
    return out.reshape(rows, cols, 4)


def process(name: str, cell: int, pal_img: Image.Image, palette: np.ndarray, outdir: Path) -> str:
    src = LANDSCAPE_DIR / FILES[name]
    img = Image.open(src).convert('RGBA')
    rgba = np.asarray(img)
    idx = palette_indices(img.convert('RGB'), pal_img)
    m = mosaic(rgba, idx, palette, cell)
    out_img = Image.fromarray(m, 'RGBA')
    outdir.mkdir(parents=True, exist_ok=True)
    dst = outdir / FILES[name]
    out_img.save(dst, optimize=True)
    kb = dst.stat().st_size / 1024
    return f'{FILES[name]}: {img.width}x{img.height} -> {out_img.width}x{out_img.height} ({kb:.0f} KB)'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--cell', type=int, default=4, help='lado de la celda del mosaico (px del arte original)')
    ap.add_argument('--colors', type=int, default=64, help='colores de la paleta global')
    ap.add_argument('--only', default=None, help='procesar solo una capa (complete, palacio, educacion, ...)')
    args = ap.parse_args()

    complete = Image.open(LANDSCAPE_DIR / FILES['complete']).convert('RGB')
    pal_img = build_palette(complete, args.colors)
    palette = np.asarray(pal_img.getpalette(), dtype=np.uint8).reshape(-1, 3)[: args.colors]

    outdir = LANDSCAPE_DIR / 'pixel' / f'c{args.cell}'
    names = [args.only] if args.only else list(FILES)
    print(f'Mosaico: celda {args.cell}px · paleta {args.colors} colores · -> {outdir}')
    for name in names:
        print(' ', process(name, args.cell, pal_img, palette, outdir))


if __name__ == '__main__':
    main()
