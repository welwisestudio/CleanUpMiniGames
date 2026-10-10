"""Visible-progress analyzer: simulates every level's layer stack stage by stage with the runtime
images (same canvas mapping as the game) and measures how much the object VISIBLY changes inside
each stage's zone. Flags stages whose change is too small to read while the player works.
Run: node scripts/export_level_geometry.mjs > geo.json && python scripts/analyze_stage_visibility.py geo.json [dist]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
N = 384
VISIBLE = 0.06  # per-pixel colour change that reads as "changed"


def rgba(base, url):
    a = np.array(Image.open(base / url).convert('RGBA').resize((N, N), Image.BILINEAR)).astype(np.float32) / 255
    return a[:, :, :3], a[:, :, 3]


def compose(layers, vis):
    out = np.zeros((N, N, 3), np.float32)
    acc = np.zeros((N, N), np.float32)
    for l in layers:
        if l['rgb'] is None:
            continue
        a = l['a'] * vis[l['id']]
        out = out * (1 - a[..., None]) + l['rgb'] * a[..., None]
        acc = acc * (1 - a) + a
    return out, acc


def main():
    geo = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    base = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'dist'
    rows = []
    for lid, g in geo.items():
        layers = []
        for l in g['layers']:
            if l['url']:
                rgb, a = rgba(base, l['url'])
                layers.append({'id': l['id'], 'rgb': rgb, 'a': a, 'initial': l['initial']})
        obj = layers[0]['a'] > 0.5
        regions = {}
        for rid, r in g['regions'].items():
            if r.get('mask'):
                regions[rid] = rgba(base, r['mask'])[1] > 0.5
        vis = {l['id']: (1.0 if l['initial'] in ('full', 'chunks') or l['id'] == layers[0]['id'] else 0.0) * np.ones((N, N), np.float32) for l in layers}
        for st in g['stages']:
            zone = (regions.get(st['region']) if st['region'] else obj)
            if zone is None:
                zone = obj
            zone = zone & obj if not st['region'] else zone
            before, _ = compose(layers, vis)
            z = zone.astype(np.float32)
            m = st['mechanic']
            changed = []
            if m == 'brush':
                if st['mode'] == 'reveal':
                    changed = st['reveal']
                    for lay in changed:
                        if lay in vis:
                            vis[lay] = vis[lay] * (1 - z)
                elif st['mode'] == 'apply':
                    changed = [st['apply']]
                    if st['apply'] in vis:
                        vis[st['apply']] = np.maximum(vis[st['apply']], z)
                elif st['mode'] == 'scrub':
                    changed = [st['from'], *st['clear']]
                    if st['under'] in vis:
                        vis[st['under']] = np.ones((N, N), np.float32)
                    for lay in changed:
                        if lay in vis:
                            vis[lay] = vis[lay] * (1 - z)
            elif m in ('chunkBreak', 'fill'):
                lay = st['apply']
                if lay in vis:
                    vis[lay] = vis[lay] * 0
                changed = [lay]
            elif st.get('clearOnFinish'):
                for lay in st['clearOnFinish']:
                    if lay in vis:
                        vis[lay] = vis[lay] * 0  # carpet beater: the dust falls out
                continue
            else:
                continue  # points / drag / collect: sprites, visible by construction
            after, _ = compose(layers, vis)
            d = np.abs(after - before).max(2)
            zz = zone & (d >= 0) & obj if not st['region'] else zone
            if zz.sum() == 0:
                continue
            frac = float((d[zz] > VISIBLE).mean())
            mean = float(d[zz].mean())
            rows.append((lid, st['id'], st['tool'], st['region'], frac, mean, changed))
    rows.sort(key=lambda r: r[4])
    print('weakest stages (share of the zone that visibly changes, mean change):')
    for r in rows:
        if r[4] < 0.25:
            print(f'  {r[0]:20} {r[1]:16} {r[2]:15} zone={r[3] or "object":10} changed {r[4]:5.0%} mean {r[5]:.3f} layers {r[6]}')
    Path(ROOT / 'reference/review/registration/visibility.json').write_text(json.dumps(rows, indent=0), encoding='utf-8')


if __name__ == '__main__':
    main()
