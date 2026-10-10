"""Contact sheet of every zone stage's green outline exactly as the game draws it (the simplified
zone shape of ObjectStack.simplifyZone, ported 1:1: closing scaled to the zone, holes filled,
islands < 4 % dropped) over the clean object — for a quick visual review of outline quality.
Run: python scripts/outline_sheet.py geo.json out.jpg [dist]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
R = 512


def simplify(inside):
    ys, xs = np.where(inside)
    if not len(xs):
        return inside
    k = max(3, min(22, round(np.hypot(xs.max() - xs.min(), ys.max() - ys.min()) * 0.05)))
    yy, xx = np.mgrid[-k:k + 1, -k:k + 1]
    disk = xx * xx + yy * yy <= k * k
    shape = ndimage.binary_closing(np.pad(inside, k + 2), structure=disk)[k + 2:-k - 2, k + 2:-k - 2]
    shape = ndimage.binary_fill_holes(shape)
    br = max(2, round(k / 2))
    f = shape.astype(np.float32)
    for _ in range(2):
        f = ndimage.uniform_filter(f, size=2 * br + 1, mode='constant')
    shape = f >= 0.5
    lab, n = ndimage.label(shape)
    if n:
        sizes = ndimage.sum(shape, lab, range(1, n + 1))
        shape = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= sizes.sum() * 0.06])
    return shape


def main():
    geo = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    base = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / 'dist'
    tiles = []
    for lid, g in geo.items():
        clean = next(l for l in g['layers'] if l['url'])
        obj_im = Image.open(base / clean['url']).convert('RGBA').resize((R, R))
        obj = np.array(obj_im)[:, :, 3] > 127
        for st in g['stages']:
            reg = st['region']
            if not reg or st.get('outline') is False or reg not in g['regions'] or not g['regions'][reg].get('mask'):
                continue
            m = np.array(Image.open(base / g['regions'][reg]['mask']).convert('RGBA').resize((R, R)))[:, :, 3] > 127
            m = ndimage.binary_dilation(m, iterations=3) & obj  # the game's region mask (dilated 3, inside the object)
            shape = simplify(m)
            edge = ndimage.binary_dilation(shape, iterations=4) & ~shape
            bg = Image.new('RGBA', (R, R), (40, 40, 60, 255))
            bg.alpha_composite(obj_im)
            px = bg.load()
            ys, xs = np.where(edge)
            for x, y in zip(xs, ys):
                if not (((x + y) >> 3) % 2 == 1 and ((x - y + 4096) >> 3) % 2 == 1):
                    px[x, y] = (0, 240, 16, 255)
            t = bg.convert('RGB').resize((256, 256))
            ImageDraw.Draw(t).text((4, 4), f'{lid}/{st["id"]}', fill=(255, 255, 0))
            tiles.append(t)
    C = 8
    rows = (len(tiles) + C - 1) // C
    s = Image.new('RGB', (C * 256, rows * 256))
    for i, t in enumerate(tiles):
        s.paste(t, ((i % C) * 256, (i // C) * 256))
    s.save(sys.argv[2], quality=85)
    print(len(tiles), 'zone stages')


if __name__ == '__main__':
    main()
