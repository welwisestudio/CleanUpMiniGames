"""Step 6 UI pass 4: the chest reward reel must stay inside the chest card.
Run after tests/e2e/step6-ui-pass4.spec.js. For every reel frame, the rows of the reel window are
scanned left and right of the card: only the dimmed scene may be there (dark). A reward card tile
(bright peach / white) in those strips = overflow."""
import json
import sys
from pathlib import Path
from PIL import Image
import numpy as np

D = Path(__file__).resolve().parent.parent / 'project/screenshots/step6/ui-pass4'
ok = True
for proj in ('desktop-mouse', 'phone-touch'):
    j = json.loads((D / proj / 'reel.json').read_text())
    for f in j['frames']:
        img = np.array(Image.open(f['p']).convert('RGB')).astype(int)
        k = img.shape[1] / j['css']['W']
        c, w = f['card'], f['win']
        y0, y1 = int((w['y'] - w['h'] / 2) * k), int((w['y'] + w['h'] / 2) * k)
        left = img[y0:y1, : max(0, int((c['x'] - c['w'] / 2) * k) - 2)]
        right = img[y0:y1, int((c['x'] + c['w'] / 2) * k) + 2:]
        bright = sum(int((part.mean(2) > 150).sum()) for part in (left, right) if part.size)
        good = bright == 0
        ok &= good
        print(f'{proj} {Path(f["p"]).name} ({f["phase"]}): bright pixels outside the card in the reel rows = {bright} -> {"PASS" if good else "FAIL"}')
sys.exit(0 if ok else 1)
