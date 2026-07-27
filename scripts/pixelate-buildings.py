#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# PICA — pixelate-buildings.py
#
# Hermano de pixelate-landscape.py, para los edificios REDISEÑADOS (recortados,
# uno por archivo, con transparencia). Reutiliza la misma técnica de mosaico:
# moda de color por celda + alpha por mayoría (≥50%) + paleta por median-cut.
#
# Diferencias con el script del landscape:
#   - Entrada: PNGs recortados de tamaños distintos (no el lienzo 4096×2305).
#   - El `cell` se DERIVA del lado más largo objetivo (--target, default 258),
#     así todos los edificios quedan en la misma escala de píxel-arte.
#   - Exporta PNG (mosaico) y SVG (celdas fusionadas en rects, greedy).
#   - Emite footprint.json con la GEOMETRÍA de la base (rombo) de cada edificio,
#     medida del propio arte — es lo que alinea calle y muro sin adivinar.
#
# Uso:
#   python scripts/pixelate-buildings.py                    # los 6, paleta global
#   python scripts/pixelate-buildings.py --only educacion   # uno solo
#   python scripts/pixelate-buildings.py --palette each     # paleta por edificio
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import argparse
import json
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image

SRC_DIR = Path('public/assets/design_system/nuevos_edificios')
OUT_PNG = SRC_DIR / 'pixel'
OUT_SVG = SRC_DIR / 'svg'

# tema -> fragmento del nombre de archivo (sin acentos, minúsculas)
TEMAS = {
    'educacion': 'educacion',
    'trabajo': 'trabajo',
    'salud': 'salud',
    'economia': 'economia',
    'seguridad': 'seguridad',
    'palacio': 'palacio',
}


def deaccent(s: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()


def find_sources() -> dict[str, Path]:
    """Mapea tema -> archivo PNG de origen (tolerante a acentos y sufijos)."""
    out: dict[str, Path] = {}
    for f in sorted(SRC_DIR.glob('*.png')):
        stem = deaccent(f.stem)
        if 'pespectiva' in stem or 'perspectiva' in stem:
            continue
        for tema, frag in TEMAS.items():
            if stem.startswith(frag):
                out[tema] = f
    return out


def build_palette(img_rgb: Image.Image, colors: int) -> Image.Image:
    """Paleta (median cut), sin dithering — zonas planas, no ruido."""
    return img_rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


def palette_indices(img_rgb: Image.Image, pal_img: Image.Image) -> np.ndarray:
    q = img_rgb.quantize(palette=pal_img, dither=Image.Dither.NONE)
    return np.asarray(q, dtype=np.uint16)


def mosaic(rgba: np.ndarray, idx: np.ndarray, palette: np.ndarray, cell: int) -> np.ndarray:
    """Mosaico (H//cell × W//cell × RGBA): moda de paleta por celda, alpha por mayoría.
    Misma técnica que pixelate-landscape.py (no cambiarla: es la que da el look)."""
    h, w = idx.shape
    rows, cols = h // cell, w // cell
    k = len(palette)
    idx = idx[: rows * cell, : cols * cell].copy()
    alpha = rgba[: rows * cell, : cols * cell, 3]

    opaque = alpha >= 128
    idx[~opaque] = k  # bucket extra: no compite por la moda

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


def to_svg(m: np.ndarray, cell_scale: int = 1) -> str:
    """Mosaico → SVG fusionando celdas contiguas del mismo color (greedy).
    Emite rects maximales: se expande a lo ancho y luego hacia abajo mientras
    la fila entera coincida. Baja el conteo de <rect> ~10-20× vs. una por celda."""
    rows, cols, _ = m.shape
    used = np.zeros((rows, cols), dtype=bool)
    opaque = m[:, :, 3] > 0
    # clave de color por celda (int24) para comparar rápido
    key = (m[:, :, 0].astype(np.int32) << 16) | (m[:, :, 1].astype(np.int32) << 8) | m[:, :, 2].astype(np.int32)

    parts: list[str] = []
    for y in range(rows):
        x = 0
        while x < cols:
            if used[y, x] or not opaque[y, x]:
                x += 1
                continue
            c = key[y, x]
            # expandir a la derecha
            x2 = x
            while x2 + 1 < cols and not used[y, x2 + 1] and opaque[y, x2 + 1] and key[y, x2 + 1] == c:
                x2 += 1
            # expandir hacia abajo mientras toda la franja coincida
            y2 = y
            while y2 + 1 < rows:
                row = slice(x, x2 + 1)
                if (
                    (~used[y2 + 1, row]).all()
                    and opaque[y2 + 1, row].all()
                    and (key[y2 + 1, row] == c).all()
                ):
                    y2 += 1
                else:
                    break
            used[y : y2 + 1, x : x2 + 1] = True
            w = (x2 - x + 1) * cell_scale
            h = (y2 - y + 1) * cell_scale
            parts.append(
                f'<rect x="{x * cell_scale}" y="{y * cell_scale}" width="{w}" height="{h}" fill="#{c:06x}"/>'
            )
            x = x2 + 1

    vw, vh = cols * cell_scale, rows * cell_scale
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}" '
        f'width="{vw}" height="{vh}" shape-rendering="crispEdges">'
        + ''.join(parts)
        + '</svg>'
    )


def footprint(m: np.ndarray) -> dict:
    """Geometría de la BASE (rombo) medida del propio mosaico, en fracciones 0–1
    del sprite. Es la fuente de verdad para alinear la calle y el muro:
      - left/right/bottom: vértices del rombo de apoyo
      - slope: pendiente media de las dos aristas de base (dy/dx)
      - baseY: altura del plano de piso (y del centro del rombo)
    """
    op = m[:, :, 3] > 0
    rows, cols = op.shape
    ys, xs = np.nonzero(op)
    if len(xs) == 0:
        return {}
    x0, x1 = int(xs.min()), int(xs.max())
    ymax = int(ys.max())
    bx = float(np.median(xs[ys >= ymax - 1]))
    ly = float(np.median(ys[xs <= x0 + 1]))
    ry = float(np.median(ys[xs >= x1 - 1]))
    mL = (ymax - ly) / (bx - x0) if bx != x0 else 0.0
    mR = (ry - ymax) / (x1 - bx) if x1 != bx else 0.0
    cy = (ly + ry) / 2  # plano del piso: altura media de los vértices laterales
    return {
        'w': cols,
        'h': rows,
        'left': [round(x0 / cols, 5), round(ly / rows, 5)],
        'right': [round(x1 / cols, 5), round(ry / rows, 5)],
        'bottom': [round(bx / cols, 5), round(ymax / rows, 5)],
        'groundY': round(cy / rows, 5),
        'slope': round((abs(mL) + abs(mR)) / 2, 5),
        'halfHeightPx': round((ymax - cy), 2),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--target', type=int, default=258, help='lado más largo del mosaico (px)')
    ap.add_argument('--cell', type=int, default=None,
                    help='forzar lado de celda en px del original (ignora --target)')
    ap.add_argument('--colors', type=int, default=96, help='colores de la paleta')
    ap.add_argument('--palette', choices=('global', 'each'), default='global',
                    help='global = una paleta compartida por los 6 (coherencia de set)')
    ap.add_argument('--only', default=None, help='procesar un solo tema')
    args = ap.parse_args()

    srcs = find_sources()
    if args.only:
        srcs = {k: v for k, v in srcs.items() if k == args.only}
    if not srcs:
        raise SystemExit('No se encontraron PNGs de origen en ' + str(SRC_DIR))

    OUT_PNG.mkdir(parents=True, exist_ok=True)
    OUT_SVG.mkdir(parents=True, exist_ok=True)

    imgs = {t: Image.open(p).convert('RGBA') for t, p in srcs.items()}

    pal_img = None
    if args.palette == 'global':
        # Lienzo con todos los edificios lado a lado → una sola paleta para el set
        tw = sum(i.width for i in imgs.values())
        th = max(i.height for i in imgs.values())
        sheet = Image.new('RGB', (tw, th), (0, 0, 0))
        ox = 0
        for i in imgs.values():
            sheet.paste(i.convert('RGB'), (ox, 0), i.split()[3])
            ox += i.width
        pal_img = build_palette(sheet, args.colors)

    fp_all: dict[str, dict] = {}
    for tema, img in imgs.items():
        cell = args.cell if args.cell else max(1, round(max(img.width, img.height) / args.target))
        pi = pal_img if pal_img is not None else build_palette(img.convert('RGB'), args.colors)
        palette = np.asarray(pi.getpalette(), dtype=np.uint8)[: args.colors * 3].reshape(-1, 3)
        idx = palette_indices(img.convert('RGB'), pi)
        m = mosaic(np.asarray(img), idx, palette, cell)

        png_path = OUT_PNG / f'{tema}.png'
        Image.fromarray(m, 'RGBA').save(png_path, optimize=True)
        svg_path = OUT_SVG / f'{tema}.svg'
        svg = to_svg(m)
        svg_path.write_text(svg, encoding='utf-8')

        fp_all[tema] = footprint(m)
        nrect = svg.count('<rect')
        print(
            f'{tema:10s} {img.width}x{img.height} cell={cell} -> {m.shape[1]}x{m.shape[0]}  '
            f'PNG {png_path.stat().st_size/1024:6.1f} KB   SVG {svg_path.stat().st_size/1024:6.1f} KB '
            f'({nrect} rects)   slope={fp_all[tema].get("slope")}'
        )

    (SRC_DIR / 'footprint.json').write_text(json.dumps(fp_all, indent=2), encoding='utf-8')
    print('\nfootprint.json escrito (geometría de base para alinear calle y muro).')


if __name__ == '__main__':
    main()
