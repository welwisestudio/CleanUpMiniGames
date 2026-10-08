"""Review helper: tiles images into one contact sheet (for visual review of generated art).
Usage: python scripts/contact_sheet.py <out.png> <tile_px> <img> [<img> ...]
"""
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def main():
    out, tile = sys.argv[1], int(sys.argv[2])
    paths = sys.argv[3:]
    cols = min(int(os.environ.get('COLS', 5)), len(paths))
    rows = (len(paths) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tile, rows * (tile + 18)), (40, 40, 48))
    d = ImageDraw.Draw(sheet)
    for i, p in enumerate(paths):
        im = Image.open(p).convert('RGBA')
        im.thumbnail((tile, tile))
        bg = Image.new('RGBA', im.size, (200, 200, 205, 255))
        bg.alpha_composite(im)
        x, y = (i % cols) * tile, (i // cols) * (tile + 18)
        sheet.paste(bg.convert('RGB'), (x + (tile - im.width) // 2, y + 18 + (tile - im.height) // 2))
        d.text((x + 4, y + 2), Path(p).parent.name + '/' + Path(p).stem, fill=(255, 255, 255))
    sheet.save(out)


if __name__ == '__main__':
    main()
