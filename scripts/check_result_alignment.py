"""Step 6 UI corrections: pixel check of text alignment on the completed screen.
Run after tests/e2e/step6-ui-fix.spec.js. For each element it finds the rendered text / content
pixels inside the element's rectangle (from the read-only QA geometry) and compares the centre of
their bounding box with the intended anchor:
  - "Completed": centre of the ribbon's front band (card rows 90-210 of 1024) and the card centre;
  - reward row (label + coin + amount): centre of the reward pill's face;
  - chest bar label: centre of the bar's face;
  - Replay / Next labels and the x3 "Claim" text: the green button's optical label centre
    (−0.045 h: 3 % below the face centre, compensating the glossy top highlight).
Tolerance: 2.5 % of the element height vertically, 1.5 % of its width horizontally."""
import json
import sys
from pathlib import Path
from PIL import Image
import numpy as np

D = Path(__file__).resolve().parent.parent / 'project/screenshots/step6' / (sys.argv[1] if len(sys.argv) > 1 else 'ui-fix')
PILL_FACE = -0.06
GREEN_LABEL = -0.045
PURPLE_LABEL = -0.039
ok = True


def box_of(mask):
    ys, xs = np.nonzero(mask)
    if len(xs) < 12:
        return None
    return xs.min(), xs.max(), ys.min(), ys.max()


for proj in ('desktop-mouse', 'phone-touch'):
    j = json.loads((D / proj / 'rects.json').read_text())
    shot = next(p for p in (D / proj / '03-completed.png', D / proj / '04-completed.png', D / proj / '02-completed.png') if p.exists())
    img = np.array(Image.open(shot).convert('RGB')).astype(int)
    k = img.shape[1] / j['css']['W']  # screenshot px per CSS px
    B = j['buttons']
    results = []

    def region(r, fx=0.5, fy=0.5):
        cx, cy, w, h = r['x'] * k, r['y'] * k, r['w'] * k, r['h'] * k
        x0, x1 = int(cx - w * fx), int(cx + w * fx)
        y0, y1 = int(cy - h * fy), int(cy + h * fy)
        return x0, x1, y0, y1

    def check(name, sub, x0, y0, ax, ay, w, h):
        b = box_of(sub)
        if b is None:
            results.append((name, False, 'no content found'))
            return
        bx = x0 + (b[0] + b[1]) / 2
        by = y0 + (b[2] + b[3]) / 2
        dx, dy = (bx - ax) / w, (by - ay) / h
        good = abs(dx) <= 0.015 and abs(dy) <= 0.025
        results.append((name, good, f'dx {dx * 100:+.1f} % of width, dy {dy * 100:+.1f} % of height'))

    # title in the ribbon band
    c = B['result-card']
    cx, cy, cw, ch = c['x'] * k, c['y'] * k, c['w'] * k, c['h'] * k
    # ribbon front band incl. its darker lower edge: card rows 90-224 of 1024; text search starts
    # below the card's white top rim (rows < 106)
    band0, band1 = cy - ch / 2 + ch * 90 / 1024, cy - ch / 2 + ch * 224 / 1024
    x0, x1, y0, y1 = int(cx - cw * 0.3), int(cx + cw * 0.3), int(cy - ch / 2 + ch * 106 / 1024), int(band1)
    sub = img[y0:y1, x0:x1]
    white = (sub > 238).all(2)
    check('Completed title (ribbon band)', white, x0, y0, cx, (band0 + band1) / 2, cw * 0.6, band1 - band0)

    # reward row: content = darker / coloured pixels inside the pill face (exclude the rim)
    r = B['result-pill']
    # straight part of the pill only (its rounded ends carry the dark outline through every row),
    # inside the face, above the grey lower lip (+0.33 h)
    x0, x1, y0, y1 = region(r, 0.47 - 0.5 * r['h'] / r['w'], 0.3)
    sub = img[y0:y1, x0:x1]
    lum = sub.mean(2)
    sat = sub.max(2) - sub.min(2)
    # horizontal: the whole group (text + coin); vertical: the text only (the coin's drop shadow
    # would pull the box down)
    content = (lum < 170) | (sat > 60)
    coin_cols = ((sat > 60).sum(0) > 2)
    coin_cols = np.convolve(coin_cols.astype(int), np.ones(int(0.12 * r['h'] * k) * 2 + 1), 'same') > 0  # + its shadow
    text = (lum < 140) & (sat < 40) & ~coin_cols[None, :]
    b = box_of(content)
    gx = x0 + (b[0] + b[1]) / 2
    t = box_of(text)
    ty = y0 + (t[2] + t[3]) / 2
    ax, ay = r['x'] * k, (r['y'] + r['h'] * PILL_FACE) * k
    dx, dy = (gx - ax) / (r['w'] * k), (ty - ay) / (r['h'] * k)
    results.append(('Reward : coin +amount (pill face)', abs(dx) <= 0.015 and abs(dy) <= 0.025, f'group dx {dx * 100:+.1f} % of width, text dy {dy * 100:+.1f} % of height'))

    # chest bar label: white text inside the bar
    r = B['result-chestbar']
    x0, x1, y0, y1 = region(r, 0.47, 0.42)
    sub = img[y0:y1, x0:x1]
    # white text on the dark track only (the green fill's glossy highlight is excluded: columns
    # where the fill is present are those with green pixels)
    green = (sub[:, :, 1] > sub[:, :, 0] + 40) & (sub[:, :, 1] > 150)
    cols = ~green.any(0)
    white = (sub > 240).all(2) & cols[None, :]
    t = box_of(white)
    ty = y0 + (t[2] + t[3]) / 2
    ay = (r['y'] + r['h'] * PILL_FACE) * k
    dy = (ty - ay) / (r['h'] * k)
    results.append(('Level chest label (bar face)', abs(dy) <= 0.025, f'text dy {dy * 100:+.1f} % of height (horizontal: centred by construction on the bar)'))

    # buttons with a left icon (Replay yellow, Next green, boost pink): the white label text,
    # measured right of the icon, against each surface's optical label centre (vertical)
    for bid, lab in (('result-replay', -0.046), ('result-next', -0.045), ('result-boost', -0.041)):
        r = B.get(bid)
        if not r:
            continue
        cx, cy, w, h = r['x'] * k, r['y'] * k, r['w'] * k, r['h'] * k
        x0, x1, y0, y1 = int(cx - 0.05 * w), int(cx + 0.44 * w), int(cy - 0.34 * h), int(cy + 0.34 * h)
        t = box_of((img[y0:y1, x0:x1] > 240).all(2))
        if t is None:
            results.append((f'{bid} label', False, 'no text found'))
            continue
        ty = y0 + (t[2] + t[3]) / 2
        dy = (ty - (r['y'] + r['h'] * lab) * k) / h
        results.append((f'{bid} label (label centre)', abs(dy) <= 0.025, f'text dy {dy * 100:+.1f} % of height'))

    print(proj)
    for name, good, msg in results:
        print(f'  {"PASS" if good else "FAIL"} {name}: {msg}')
        ok &= good
sys.exit(0 if ok else 1)
