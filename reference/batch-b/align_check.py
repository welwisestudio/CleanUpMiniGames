"""QA only: how well each edit lines up with its clean master (outline overlap, IoU) and the best
small shift. The outline of an edit is estimated against its flat gray background just for this
measurement; runtime alpha always comes from the master's Background Remover cutout."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
M = Path('reference/masters')
sys.path.insert(0, 'reference/batch-b')
from edits import EDITS

def sil(p):
    a = np.array(Image.open(p).convert('RGB')).astype(np.float32)
    bg = np.median(np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)]), 0)
    m = np.abs(a - bg).max(2) > 22
    return ndimage.binary_opening(m, iterations=2)

for lv, (_, states) in EDITS.items():
    base = sil(M / lv / 'clean.png')
    for st in states:
        e = sil(M / lv / f'{st}.png')
        if e.shape != base.shape:
            print(lv, st, 'SIZE', e.shape, base.shape); continue
        best = (0, 0, 0)
        for dy in range(-6, 7, 2):
            for dx in range(-6, 7, 2):
                s = np.roll(np.roll(e, dy, 0), dx, 1)
                iou = (s & base).sum() / max(1, (s | base).sum())
                if iou > best[0]: best = (iou, dx, dy)
        iou0 = (e & base).sum() / max(1, (e | base).sum())
        flag = 'OK' if iou0 > 0.93 else 'CHECK'
        print(f'{lv:20s} {st:12s} iou={iou0:.3f} best={best[0]:.3f} shift=({best[1]},{best[2]}) {flag}')
