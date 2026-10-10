"""Registration validator (all 50 levels, a few minutes, no gameplay): every texture of a level is
mapped onto the ONE canonical object canvas exactly as the game does (full-canvas textures are
scaled to the canvas, masks are sampled relatively) and checked:
  A  every visual state lies inside the clean silhouette (no second, shifted copy) and full states
     have the same bounds as the clean state;
  B  the object mask matches the clean art;
  C  every region mask is non-empty and lies inside the object;
  D  every stage region exists (the green outline is generated from the same region mask);
  E  point targets / items / slots / decals lie on the object (or their region);
  F  covered by A (alpha outside the clean silhouette = a displaced copy).
Writes reference/review/registration/report.json and a contact sheet per suspicious level.
Run: node scripts/export_level_geometry.mjs > geo.json && python scripts/validate_registration.py geo.json [dist]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
# documented intentional exceptions: removable parts that overhang the clean body silhouette
PART_LAYERS = {('desk-fan', 'guardOld')}
OUT = ROOT / 'reference/review/registration'
N = 1024


def load_alpha(base, url, n=N):
    im = Image.open(base / url).convert('RGBA')
    return np.array(im.resize((n, n), Image.BILINEAR))[:, :, 3].astype(np.float32) / 255, im


def bbox(a, t=0.5):
    ys, xs = np.where(a > t)
    return None if not len(xs) else [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def main():
    geo = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    base = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'dist'
    OUT.mkdir(parents=True, exist_ok=True)
    report = {}
    for lid, g in geo.items():
        issues = []
        layers = [l for l in g['layers'] if l['url']]
        clean = next((l for l in layers if l['static']), layers[0] if layers else None)
        ca, cim = load_alpha(base, clean['url'])
        cmask = ca > 0.5
        cb = bbox(ca)
        near = ndimage.binary_dilation(cmask, iterations=8)
        area = cmask.sum()
        # B: object mask vs clean art
        if g['mask']:
            ma, _ = load_alpha(base, g['mask'])
            mb = bbox(ma)
            if mb and max(abs(a - b) for a, b in zip(mb, cb)) > 12:
                issues.append(f'B object mask bounds {mb} vs clean {cb}')
            obj = ma > 0.5
        else:
            obj = cmask
        # A / F: states
        state_alpha = {}
        for l in layers:
            if l is clean:
                continue
            a, _ = load_alpha(base, l['url'])
            state_alpha[l['id']] = a
            m = a > 0.5
            if not m.any():
                continue
            out = (m & ~near).sum() / max(1, m.sum())
            if out > 0.02 and (lid, l['id']) not in PART_LAYERS:
                issues.append(f'A/F state {l["id"]}: {out:.1%} of its pixels lie outside the clean silhouette (shifted copy?)')
            # a FULL state (it covers the clean silhouette, not one zone) must have the clean bounds;
            # zone-limited states (basin foam, plate paint, crust patches) are subsets by design
            cover = (m & cmask).sum() / max(1, area)
            if cover > 0.95:
                b = bbox(a)
                d = max(abs(x - y) for x, y in zip(b, cb))
                if d > 12:
                    issues.append(f'A full state {l["id"]} bounds {b} differ from clean {cb} by {d}px')
        # C: regions
        rmask = {}
        for rid, r in g['regions'].items():
            if 'mask' in r and r['mask']:
                a, _ = load_alpha(base, r['mask'])
                m = a > 0.5
                rmask[rid] = m
                if not m.any():
                    issues.append(f'C region {rid} is empty')
                    continue
                out = (m & ~ndimage.binary_dilation(obj, iterations=6)).sum() / m.sum()
                if out > 0.03:
                    issues.append(f'C region {rid}: {out:.1%} outside the object')
        # D / E: stages
        for st in g['stages']:
            reg = st['region']
            if reg and reg not in g['regions']:
                issues.append(f'D stage {st["id"]}: unknown region {reg}')
            if reg and reg in rmask and st['mechanic'] == 'brush':
                # the work must be visible: at least one target layer has pixels inside the region
                vis = [lay for lay in st['layers'] if lay in state_alpha and (state_alpha[lay][rmask[reg]] > 0.5).mean() > 0.02]
                if st['layers'] and not vis and not any(lay in ('foam', 'scrubbed') for lay in st['layers']):
                    issues.append(f'D stage {st["id"]}: none of its layers {st["layers"]} has visible pixels in region {reg}')
            for p in st['points']:
                x, y = int(p['x']), int(p['y'])
                if p['kind'] in ('target', 'slot') and 0 <= x < N and 0 <= y < N:
                    m = rmask.get(p.get('region')) if p.get('region') else obj
                    m = ndimage.binary_dilation(m if m is not None else obj, iterations=10)
                    if not m[y, x]:
                        issues.append(f'E stage {st["id"]}: {p["kind"]} ({x},{y}) is off the object/region')
        for l in g['layers']:
            for d in l['decals']:
                x, y = int(d['x']), int(d['y'])
                if not ndimage.binary_dilation(obj, iterations=10)[y, x]:
                    issues.append(f'E decal of {l["id"]} at ({x},{y}) is off the object')
        report[lid] = issues
        if issues:
            sheet(lid, base, g, clean, ca, state_alpha, rmask)
    flagged = {k: v for k, v in report.items() if v}
    (OUT / 'report.json').write_text(json.dumps({'levels': len(report), 'flagged': flagged}, indent=1), encoding='utf-8')
    print(f'levels checked {len(report)}, flagged {len(flagged)}')
    for k, v in flagged.items():
        print(k)
        for i in v:
            print('   ', i)


def sheet(lid, base, g, clean, ca, states, rmask):
    """Overlay: clean (full), each state's alpha edge in red, region masks in green."""
    im = Image.open(base / clean['url']).convert('RGBA').resize((N, N))
    bg = Image.new('RGBA', (N, N), (40, 40, 60, 255))
    bg.alpha_composite(im)
    d = ImageDraw.Draw(bg)
    for sid, a in states.items():
        e = (a > 0.5) ^ ndimage.binary_erosion(a > 0.5, iterations=2)
        ys, xs = np.where(e)
        for x, y in zip(xs[::3], ys[::3]):
            d.point((x, y), fill=(255, 40, 40, 255))
    for rid, m in rmask.items():
        e = m ^ ndimage.binary_erosion(m, iterations=2)
        ys, xs = np.where(e)
        for x, y in zip(xs[::2], ys[::2]):
            d.point((x, y), fill=(0, 240, 16, 255))
    bg.convert('RGB').resize((512, 512)).save(OUT / f'{lid}.jpg', quality=85)


if __name__ == '__main__':
    main()
