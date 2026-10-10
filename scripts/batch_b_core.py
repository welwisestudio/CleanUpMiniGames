"""Levels 16–50 asset pipeline core (used by prepare_batch_b.py).

Per level: the clean master (Nano Banana 2) + its Background Remover cutout give the object alpha;
every edit state (Nano Banana 2 edit of the master, pixel-aligned, see DECISIONS 2026-10-08) is
combined with the SAME alpha and registered with the same transform onto the 1024 canvas.
Procedural states are composited from the approved images only: dust film (approved dust-wood
material), wet (darkened + the approved fx-drop sprites), dull / matte (desaturated, low
contrast), grime (a brown film modulated by the approved dust material). Regions come from colour
or state differences of the registered images. No extra background removal, no redrawing.
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

import prepare_levels as PL

ROOT = PL.ROOT
M, C, PUB = PL.M, PL.C, PL.PUB
OBJ = PL.OBJ


def load_rgb(level, name):
    return Image.open(M / level / f'{name}.png').convert('RGB')


def source_alpha(level, poly=None):
    """Object alpha in master pixels: the Background Remover cutout; `poly` (master pixel
    coordinates) adds a geometric outline for a flat part the remover treats as floor (patio
    slabs, DECISIONS 2026-10-08) — a polygon crop, not a colour key."""
    a = np.array(Image.open(C / level / 'clean.png').convert('RGBA'))[:, :, 3].astype(np.float32) / 255
    if poly:
        im = Image.new('L', (a.shape[1], a.shape[0]), 0)
        ImageDraw.Draw(im).polygon([tuple(p) for p in poly], fill=255)
        pa = ndimage.gaussian_filter(np.array(im).astype(np.float32) / 255, 1.0)
        a = np.maximum(a, pa)
    return a


def register(level, states, poly=None):
    """{state: RGBA canvas} for 'clean' + states, the clean alpha (0..1) and the registration."""
    a = source_alpha(level, poly)
    H, W = a.shape
    x0, y0, x1, y1 = PL.bbox(a)
    s = OBJ * PL.FILL / max(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    out = {}
    for st in ['clean'] + states:
        rgb = load_rgb(level, st)
        if rgb.size != (W, H):
            rgb = rgb.resize((W, H), Image.LANCZOS)
        img = Image.fromarray(np.dstack([np.array(rgb), (a * 255).astype(np.uint8)]), 'RGBA')
        sc = img.resize((round(W * s), round(H * s)), Image.LANCZOS)
        can = Image.new('RGBA', (OBJ, OBJ), (0, 0, 0, 0))
        can.paste(sc, (round(OBJ / 2 - cx * s), round(OBJ / 2 - cy * s)), sc)
        out[st] = can
    clean_a = PL.alpha(out['clean'])
    return out, clean_a, {'scale': round(s, 5), 'srcBBox': [round(v, 1) for v in (x0, y0, x1, y1)], 'alphaFrom': 'clean cutout' + (' + slab polygon' if poly else '')}


def rgbf(img):
    return np.array(img.convert('RGB')).astype(np.float32) / 255


def to_img(rgb, a):
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 1) * 255, np.clip(a, 0, 1) * 255]).astype(np.uint8), 'RGBA')


def dull(img, a, amount=0.42):
    """Matte / unpolished: less contrast and saturation, a light haze."""
    # Step 9: reads clearly as a dull, hazy film (so polishing visibly brings the shine back) but
    # keeps the material's hue (gold stays gold): moderate desaturation, flattened contrast, a
    # milky haze and blotchy streaks from the approved dust material.
    c = rgbf(img)
    lum = c.mean(2, keepdims=True)
    inside = a > 0.5
    mean = float(lum[..., 0][inside].mean()) if inside.any() else 0.5
    d = c * (1 - amount * 0.3) + lum * amount * 0.3
    d = (d - mean) * (1 - amount * 0.4) + mean
    tex = _dust_tex()
    streak = ndimage.gaussian_filter(tex, 6)
    streak = (streak - streak.min()) / max(1e-6, streak.max() - streak.min())
    h = np.clip(amount * (0.38 + 0.3 * streak), 0, 0.3)[..., None]
    d = d * (1 - h) + np.array([0.86, 0.86, 0.84], np.float32) * h
    return to_img(d, a)


_drops = None


def wet(img, a, seed=7, density=1.0):
    """Freshly washed: a little darker and richer, with the approved water droplets on top."""
    global _drops
    if _drops is None:
        _drops = [Image.open(PUB / 'soccer-ball' / f'fx-drop-{i}.webp').convert('RGBA') for i in (1, 2)]
    c = rgbf(img)
    lum = c.mean(2, keepdims=True)
    w = ((c - lum) * 1.15 + lum) * 0.86
    base = to_img(w, a)
    rng = np.random.default_rng(seed)
    ys, xs = np.where(a > 0.6)
    if len(xs):
        for _ in range(int(len(xs) / 1800 * density)):
            i = rng.integers(len(xs))
            sz = int(rng.uniform(12, 30))
            dd = np.array(_drops[rng.integers(2)].resize((sz, sz), Image.LANCZOS)).astype(np.float32)
            dd[:, :, 3] *= rng.uniform(0.55, 0.9)
            base.alpha_composite(Image.fromarray(dd.astype(np.uint8), 'RGBA'), (int(xs[i] - sz / 2), int(ys[i] - sz / 2)))
    out = np.array(base).astype(np.float32)
    out[:, :, 3] = np.minimum(out[:, :, 3], a * 255)
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


_tex = None


def _dust_tex():
    global _tex
    if _tex is None:
        _tex = np.array(Image.open(M / 'materials/dust-wood.png').convert('L').resize((OBJ, OBJ), Image.LANCZOS)).astype(np.float32) / 255
    return _tex


def grime(img, a, amount=0.55, color=(0.36, 0.27, 0.17)):
    """Greasy brown grime film, patchy (modulated by the approved dust material's low frequencies)."""
    c = rgbf(img)
    tex = _dust_tex()
    blot = ndimage.gaussian_filter(tex, 22)
    blot = (blot - blot.min()) / max(1e-6, blot.max() - blot.min())
    detail = tex - ndimage.gaussian_filter(tex, 3)
    lum = c.mean(2, keepdims=True)
    film = np.array(color, np.float32)[None, None, :] * (0.6 + 0.8 * lum) + detail[:, :, None] * 0.8
    k = np.clip(amount * (0.45 + 0.75 * blot), 0, 0.9)[:, :, None]
    return to_img(c * (1 - k) + film * k, a)


def dusty(img, a, strength=0.6):
    return PL.dust_layer(img, a, strength)


def hsv(img):
    c = rgbf(img)
    mx, mn = c.max(2), c.min(2)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = (mx - mn) / np.maximum(mx, 1e-6)
    return h, s, mx


def clean_mask(m, inside, close=3, min_blob=200, grow=1):
    m = ndimage.binary_opening(m, iterations=1)
    m = ndimage.binary_closing(m, iterations=close)
    lab, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        m = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v >= min_blob])
    if grow:
        m = ndimage.binary_dilation(m, iterations=grow)
    return m & (inside > 0.5)


def region(spec, imgs, clean_a, regions):
    """Boolean region on the 1024 canvas from a spec tuple:
    ('diff', a, b, thr, grow)          where two registered states differ (filled, cleaned)
    ('hue', h0, h1, smin, vmin[, img]) colour range (wraps when h0 > h1)
    ('gray', smax, vmin, vmax[, img])  low saturation in a brightness band (chrome / steel / white)
    ('dark', vmax[, img])              dark parts (iron, tyres)
    ('rows', f0, f1) / ('cols', f0, f1) share of the object's bounds
    ('not', r) ('and', r1, r2) ('or', r1, r2) ('minus', r1, r2) ('grow', r, px) ('all',)
    ('alpha',)                          the Background Remover alpha (without the slab polygon)"""
    kind = spec[0]
    inside = clean_a
    if kind == 'diff':
        a, b, thr, grow = spec[1:5]
        d = ndimage.gaussian_filter(np.abs(rgbf(imgs[a]) - rgbf(imgs[b])).max(2), 2)
        m = ndimage.binary_fill_holes(ndimage.binary_closing(d > thr, iterations=6))
        m = clean_mask(m, inside, 2, 300, grow)
        if len(spec) > 5 and spec[5] == 'largest':  # one connected area (a basin)
            lab, n = ndimage.label(m)
            if n:
                m = lab == (int(np.argmax(ndimage.sum(m, lab, range(1, n + 1)))) + 1)
                m = ndimage.binary_fill_holes(m)
        return m
    if kind == 'hue':
        h0, h1, smin, vmin = spec[1:5]
        h, s, v = hsv(imgs[spec[5] if len(spec) > 5 else 'clean'])
        hm = ((h >= h0) & (h <= h1)) if h0 <= h1 else ((h >= h0) | (h <= h1))
        return clean_mask(hm & (s >= smin) & (v >= vmin) & (inside > 0.5), inside)
    if kind == 'gray':
        smax, vmin, vmax = spec[1:4]
        h, s, v = hsv(imgs[spec[4] if len(spec) > 4 else 'clean'])
        return clean_mask((s <= smax) & (v >= vmin) & (v <= vmax) & (inside > 0.5), inside)
    if kind == 'dark':
        h, s, v = hsv(imgs[spec[2] if len(spec) > 2 else 'clean'])
        return clean_mask((v <= spec[1]) & (inside > 0.5), inside)
    if kind in ('rows', 'cols'):
        _, f0, f1 = spec
        x0, y0, x1, y1 = PL.bounds_of(clean_a)
        m = np.zeros_like(clean_a, bool)
        if kind == 'rows':
            m[int(y0 + (y1 - y0) * f0):int(y0 + (y1 - y0) * f1)] = True
        else:
            m[:, int(x0 + (x1 - x0) * f0):int(x0 + (x1 - x0) * f1)] = True
        return m & (inside > 0.5)
    if kind == 'not':
        return (inside > 0.5) & ~regions[spec[1]]
    if kind == 'and':
        return regions[spec[1]] & regions[spec[2]]
    if kind == 'or':
        return regions[spec[1]] | regions[spec[2]]
    if kind == 'minus':
        return regions[spec[1]] & ~regions[spec[2]]
    if kind == 'largest':  # keep the n largest connected parts (a part, not its stray specks)
        lab, n = ndimage.label(regions[spec[1]])
        if not n:
            return regions[spec[1]]
        sizes = ndimage.sum(regions[spec[1]], lab, range(1, n + 1))
        keep = [int(i) + 1 for i in np.argsort(sizes)[::-1][:spec[2]]]
        return np.isin(lab, keep) & (inside > 0.5)
    if kind == 'clean':  # drop small islands (no stray outline specks)
        return clean_mask(regions[spec[1]], inside, 2, 600, 0)
    if kind == 'fill':  # a region with its holes filled (a sign plate with its painted symbol)
        return ndimage.binary_fill_holes(ndimage.binary_closing(regions[spec[1]], iterations=4)) & (inside > 0.5)
    if kind == 'grow':
        return ndimage.binary_dilation(regions[spec[1]], iterations=spec[2]) & (inside > 0.5)
    if kind == 'all':
        return inside > 0.5
    if kind == 'alpha':
        return PL.alpha(imgs['_remover']) > 0.5
    raise ValueError(kind)


def components(mask, min_area=150, max_n=8):
    """Centroids and sizes of the largest connected parts: [[x, y, size], ...]."""
    lab, n = ndimage.label(mask)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        m = lab[sl] == i + 1
        area = int(m.sum())
        if area < min_area:
            continue
        ys, xs = np.where(m)
        size = max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start)
        out.append((area, int(xs.mean() + sl[1].start), int(ys.mean() + sl[0].start), int(size), sl, m))
    out.sort(key=lambda t: -t[0])
    return out[:max_n]
