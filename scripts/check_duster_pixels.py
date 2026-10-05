"""Step 6 polish check: Chair duster stage pixels (run after tests/e2e/step6-duster.spec.js).
Measures, in the start / partial / done-held screenshots of each project:
- frame brightness on the dusted (left) and untouched (right) halves -> dust visibly removed;
- hole centres -> stay dark and unchanged (always visible above the dust)."""
import json
import sys
from pathlib import Path
from PIL import Image
import numpy as np

D = Path(__file__).resolve().parent.parent / 'project/screenshots/step6/duster'
CSS_W = {'desktop-mouse': 1280, 'phone-touch': 390}
ok = True
for proj, css_w in CSS_W.items():
    s = json.loads((D / proj / 'samples.json').read_text())
    shots = {k: np.array(Image.open(D / proj / f'chair-02-dust-{k}.png').convert('RGB')).astype(float) for k in ('1-start', '2-partial', '3-done-held')}
    k = next(iter(shots.values())).shape[1] / css_w

    def lum(img, pts, half):
        out = []
        for p in pts:
            x, y, h = int(p['x'] * k), int(p['y'] * k), max(1, int(half * k))
            out.append(img[y - h:y + h, x - h:x + h].mean())
        return np.array(out)

    fl = {n: lum(im, s['leftPts'], 2).mean() for n, im in shots.items()}
    fr = {n: lum(im, s['rightPts'], 2).mean() for n, im in shots.items()}
    holes = {n: lum(im, s['spots'], 3) for n, im in shots.items()}
    print(f'{proj}: frame L {fl["1-start"]:.0f} -> {fl["2-partial"]:.0f} -> {fl["3-done-held"]:.0f} | frame R {fr["1-start"]:.0f} -> {fr["2-partial"]:.0f} -> {fr["3-done-held"]:.0f}')
    print(f'{proj}: holes start {holes["1-start"].round(0).tolist()} partial {holes["2-partial"].round(0).tolist()} done {holes["3-done-held"].round(0).tolist()}')
    checks = {
        'left half visibly cleaned in the partial state (>20 darker)': fl['1-start'] - fl['2-partial'] > 20,
        'untouched right half still dusty in the partial state (<10 change)': abs(fr['1-start'] - fr['2-partial']) < 10,
        'right half cleaned at the end (>20 darker)': fr['1-start'] - fr['3-done-held'] > 20,
        'holes far darker than the dusty frame at every moment': all((v < fr['1-start'] - 40).all() for v in holes.values()),
        'holes unchanged by dusting (<15)': (abs(holes['1-start'] - holes['3-done-held']) < 15).all(),
    }
    for name, res in checks.items():
        print(f'  {"PASS" if res else "FAIL"} {name}')
        ok &= bool(res)
sys.exit(0 if ok else 1)
