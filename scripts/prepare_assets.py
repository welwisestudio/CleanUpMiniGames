"""Prepare runtime assets for the Soccer Ball benchmark from Nano Banana 2 masters and
Higgsfield Background Remover cutouts.

Inputs:  reference/masters/soccer-ball/*.png  (generated, untouched)
         reference/cutouts/soccer-ball/*.png  (Background Remover output, untouched)
Outputs: public/assets/soccer-ball/*.webp, public/assets/ui/*.webp
         src/content/generated/assetMeta.js   (sizes, working points, nine-slice margins)
         reference/review/soccer-ball/*.png   (alpha review on light / dark / game backgrounds)

Only crop / registration / resize / compositing of already generated images happens here.
No background removal, no chroma key, no redrawing. Requires: Pillow, NumPy, SciPy.
Run: python scripts/prepare_assets.py
"""
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
MASTERS = ROOT / 'reference/masters/soccer-ball'
CUTOUTS = ROOT / 'reference/cutouts/soccer-ball'
OUT_LEVEL = ROOT / 'public/assets/soccer-ball'
OUT_UI = ROOT / 'public/assets/ui'
REVIEW = ROOT / 'reference/review/soccer-ball'
META_JS = ROOT / 'src/content/generated/assetMeta.js'

OBJ = 1024  # object canvas
OBJ_R = 440  # ball radius on the canvas

for d in (OUT_LEVEL, OUT_UI, REVIEW, META_JS.parent):
    d.mkdir(parents=True, exist_ok=True)

meta = {'object': {'canvasSize': OBJ, 'radius': OBJ_R}, 'tools': {}, 'ui': {}, 'fx': {}, 'files': {}}


def save_webp(img, path, quality=90):
    img.save(path, 'WEBP', quality=quality, alpha_quality=100, method=6)
    meta['files'][str(path.relative_to(ROOT / 'public')).replace('\\', '/')] = list(img.size)


def alpha_bbox(img, thr=16):
    a = np.array(img.split()[-1])
    ys, xs = np.where(a > thr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def crop_padded(img, pad_frac=0.06, box=None):
    x0, y0, x1, y1 = box or alpha_bbox(img)
    pad = int(max(x1 - x0, y1 - y0) * pad_frac)
    canvas = Image.new('RGBA', (x1 - x0 + 2 * pad, y1 - y0 + 2 * pad), (0, 0, 0, 0))
    canvas.paste(img.crop((x0, y0, x1, y1)), (pad, pad))
    return canvas


def fit(img, max_side):
    s = max_side / max(img.size)
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


# ---- review previews -------------------------------------------------------------------
_game_bg = None


def review(name, img):
    global _game_bg
    if _game_bg is None:
        _game_bg = Image.open(MASTERS / 'bg-pitch-portrait.png').convert('RGBA')
    t = fit(img, 300)
    w, h = t.size
    strip = Image.new('RGBA', (3 * (w + 20), h + 20), (0, 0, 0, 255))
    bgs = [Image.new('RGBA', (w, h), (245, 245, 245, 255)), Image.new('RGBA', (w, h), (25, 25, 35, 255)),
           _game_bg.resize((w * 3, h * 3)).crop((w, h, 2 * w, 2 * h))]
    for i, bg in enumerate(bgs):
        tile = bg.copy()
        tile.alpha_composite(t)
        strip.paste(tile, (10 + i * (w + 20), 10))
    strip.convert('RGB').save(REVIEW / f'{name}.png')


def alpha_stats(img):
    a = np.array(img.split()[-1])
    return {'transparent': round(float((a < 8).mean()), 3), 'opaque': round(float((a > 247).mean()), 3)}


# ---- ball states: register to one canvas -------------------------------------------------
def ball_fit(img):
    x0, y0, x1, y1 = alpha_bbox(img, 128)
    return (x0 + x1) / 2, (y0 + y1) / 2, ((x1 - x0) + (y1 - y0)) / 4


clean_src = Image.open(CUTOUTS / 'ball-clean.png').convert('RGBA')
ccx, ccy, cr = ball_fit(clean_src)
registered = {}
for state in ['clean', 'wet', 'stained', 'dusty', 'mudcrust']:
    src = Image.open(CUTOUTS / f'ball-{state}.png').convert('RGBA')
    cx, cy, r = ball_fit(src)
    # Same scale for the crust as for the clean ball (its volume may extend beyond the ball).
    s = OBJ_R / (cr if state == 'mudcrust' else r)
    scaled = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', (OBJ, OBJ), (0, 0, 0, 0))
    canvas.paste(scaled, (round(OBJ / 2 - cx * s), round(OBJ / 2 - cy * s)), scaled)
    registered[state] = canvas
    meta.setdefault('registration', {})[state] = {'srcCenter': [round(cx, 1), round(cy, 1)], 'srcRadius': round(r, 1), 'scale': round(s, 5)}

clean_alpha = np.array(registered['clean'].split()[-1]).astype(np.float32) / 255
for state in ['wet', 'stained', 'dusty']:
    arr = np.array(registered[state]).astype(np.float32)
    arr[:, :, 3] = np.minimum(arr[:, :, 3], clean_alpha * 255)  # identical silhouette for stacked layers
    registered[state] = Image.fromarray(arr.astype(np.uint8), 'RGBA')

for state, img in registered.items():
    save_webp(img, OUT_LEVEL / f'ball-{state}.webp')
    review(f'ball-{state}', img)
    meta.setdefault('alpha', {})[f'ball-{state}'] = alpha_stats(img)

# Outside mask = inverse of the clean silhouette (used to clip painted layers).
outside = Image.new('RGBA', (OBJ, OBJ), (255, 255, 255, 255))
outside.putalpha(Image.fromarray(((1 - clean_alpha) * 255).astype(np.uint8)))
outside.save(OUT_LEVEL / 'mask-outside.png')
meta['files']['soccer-ball/mask-outside.png'] = [OBJ, OBJ]

# ---- foam layers and stamps ----------------------------------------------------------
yy, xx = np.mgrid[0:OBJ, 0:OBJ]
rr = np.hypot(xx - OBJ / 2, yy - OBJ / 2) / OBJ_R
sphere = np.clip(1.0 - 0.28 * np.clip(rr, 0, 1) ** 2.2, 0, 1)
light = np.clip(1.0 + 0.10 * (1 - np.hypot(xx - OBJ * 0.4, yy - OBJ * 0.38) / OBJ_R), 0.9, 1.1)
tex = Image.open(MASTERS / 'tex-foam.png').convert('RGB').resize((OBJ, OBJ), Image.LANCZOS)
foam_rgb = np.clip(np.array(tex).astype(np.float32) * (sphere * light)[:, :, None], 0, 255)
rgba = np.dstack([foam_rgb, clean_alpha * 255 * 0.96]).astype(np.uint8)
save_webp(Image.fromarray(rgba, 'RGBA'), OUT_LEVEL / 'tex-foam-full.webp')

# Scrubbed foam = the SAME foam material after scrubbing (Step 3 revision: no swap to an
# unrelated image). Colour and bubbles come from tex-foam; only the swirl structure (ridges /
# grooves) and a faint beige grime tint are taken from the tex-foam-swirl master. Ridges stay
# dense, grooves thin out so the cleaned ball shows through. Compositing only, no new art.
swirl = np.array(Image.open(MASTERS / 'tex-foam-swirl.png').convert('RGB').resize((OBJ, OBJ), Image.LANCZOS)).astype(np.float32) / 255
lum = swirl.mean(2)
mu = ndimage.gaussian_filter(lum, 40)
sd = np.sqrt(ndimage.gaussian_filter((lum - mu) ** 2, 40)) + 1e-3
ridge = 1 / (1 + np.exp(-1.4 * np.clip((lum - mu) / sd, -2.5, 2.5)))
scrub_rgb = foam_rgb / 255 * (0.80 + 0.26 * ridge)[:, :, None]
scrub_rgb = scrub_rgb * 0.88 + scrub_rgb * (swirl / (swirl.mean((0, 1)) + 1e-3)) * 0.12
scrub_a = clean_alpha * np.clip(0.42 + 0.52 * ridge, 0, 0.93)
rgba = np.dstack([np.clip(scrub_rgb, 0, 1) * 255, scrub_a * 255]).astype(np.uint8)
save_webp(Image.fromarray(rgba, 'RGBA'), OUT_LEVEL / 'tex-foam-scrubbed-full.webp')

ST = 256
sy, sx = np.mgrid[0:ST, 0:ST]
sr = np.hypot(sx - ST / 2, sy - ST / 2) / (ST / 2)
soft = np.clip((1 - sr) / 0.45, 0, 1)
for key, master in [('stamp-foam', 'tex-foam')]:
    tex = Image.open(MASTERS / f'{master}.png').convert('RGB')
    c = tex.width // 2
    crop = tex.crop((c - 300, c - 300, c + 300, c + 300)).resize((ST, ST), Image.LANCZOS)
    rgba = np.dstack([np.array(crop), soft * 255]).astype(np.uint8)
    save_webp(Image.fromarray(rgba, 'RGBA'), OUT_LEVEL / f'{key}.webp')

# ---- thumbnails ---------------------------------------------------------------------------
save_webp(fit(registered['dusty'], 512), OUT_LEVEL / 'thumb-soccer-ball.webp')

# Result picture: the restored ball in front of the goal + lit grass of the gameplay background.
RESULT_PIC_TOP = 0.17
bgp = Image.open(MASTERS / 'bg-pitch-portrait.png').convert('RGBA')
win_w, win_h = 640, 480
crop_h = round(bgp.width * win_h / win_w)
top = round(bgp.height * RESULT_PIC_TOP)
pic = bgp.crop((0, top, bgp.width, top + crop_h)).resize((win_w, win_h), Image.LANCZOS)
shadow = Image.new('RGBA', (win_w, win_h), (0, 0, 0, 0))
ImageDraw.Draw(shadow).ellipse((win_w / 2 - 112, 420, win_w / 2 + 112, 446), fill=(0, 30, 0, 120))
pic.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))
ball = fit(registered['clean'], 290)  # ball ≈ 39 % of the picture width, resting on the lit grass
pic.alpha_composite(ball, (win_w // 2 - ball.width // 2, 165))
rounded = Image.new('L', (win_w, win_h), 0)
ImageDraw.Draw(rounded).rounded_rectangle((0, 0, win_w - 1, win_h - 1), radius=44, fill=255)
pic.putalpha(rounded)
save_webp(pic, OUT_LEVEL / 'result-picture-soccer-ball.webp', quality=88)

# ---- backgrounds (no cutout) ---------------------------------------------------------
# Step 3 revision: one Nano Banana 2 master (portrait). Landscape screens use a 16:9 crop of the
# same master (goal + lit grass band) until a dedicated landscape generation exists.
LANDSCAPE_TOP = 0.15  # crop top as a share of the master height
src = Image.open(MASTERS / 'bg-pitch-portrait.png').convert('RGB')
crop_h = round(src.width * 9 / 16)
y0 = round(src.height * LANDSCAPE_TOP)
sources = {'bg-pitch-portrait': (src, (1080, 1920)), 'bg-pitch-landscape': (src.crop((0, y0, src.width, y0 + crop_h)), (1920, 1080))}
for key, (img, size) in sources.items():
    s = max(size[0] / img.width, size[1] / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    x = (img.width - size[0]) // 2
    y = (img.height - size[1]) // 2
    img.crop((x, y, x + size[0], y + size[1])).save(OUT_LEVEL / f'{key}.webp', 'WEBP', quality=86, method=6)
    meta['files'][f'soccer-ball/{key}.webp'] = list(size)

# ---- tools: crop, resize, working point -----------------------------------------------
TOOL_RULES = {
    'chisel': 'top',
    'dry-brush': 'bottom',
    'foam-sprayer': 'top',
    'scrub-brush': 'bottom',
    'washer-lance': 'top',
    'cloth': 'center',
}
for tool, rule in TOOL_RULES.items():
    src = Image.open(CUTOUTS / f'tool-{tool}.png').convert('RGBA')
    img = fit(crop_padded(src, 0.05), 768)
    a = np.array(img.split()[-1])
    ys, xs = np.where(a > 128)
    h, w = a.shape
    if rule == 'top':
        y0 = ys.min()
        band = xs[ys < y0 + max(3, int(h * 0.01))]
        wp = (float(band.mean()) / w, float(y0) / h)
    elif rule == 'bottom':
        y1 = ys.max()
        wp = ((xs.min() + xs.max()) / 2 / w, (y1 - (ys.max() - ys.min()) * 0.10) / h)
    else:
        wp = ((xs.min() + xs.max()) / 2 / w, (ys.min() + ys.max()) / 2 / h)
    save_webp(img, OUT_LEVEL / f'tool-{tool}.webp')
    review(f'tool-{tool}', img)
    meta['tools'][tool] = {'size': [w, h], 'workingPoint': [round(wp[0], 4), round(wp[1], 4)], 'alpha': alpha_stats(img)}

# ---- sheets → parts --------------------------------------------------------------------
def components(sheet, min_area=1500):
    im = Image.open(CUTOUTS / f'{sheet}.png').convert('RGBA')
    a = np.array(im)[:, :, 3]
    lab, _ = ndimage.label(ndimage.binary_dilation(a > 24, iterations=6))
    items = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if (lab[sl] == i + 1).sum() < min_area:
            continue
        items.append((sl[0].start, sl[1].start, sl[0].stop, sl[1].stop))
    items.sort(key=lambda t: (round(t[0] / 150), t[1]))
    return im, items


def part(im, box, pad=8):
    y0, x0, y1, x1 = box
    return crop_padded(im, 0, (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def merge(boxes):
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


def nine(img, l, r, t, b):
    return {'size': list(img.size), 'slice': [round(l), round(r), round(t), round(b)]}


im, it = components('ui-surfaces-sheet')
names = ['ui-tile-large', 'ui-tile-small', 'ui-btn-square', 'ui-pill', 'ui-progress-fill']
widths = {'ui-tile-large': 288, 'ui-tile-small': 160, 'ui-btn-square': 200, 'ui-pill': 360, 'ui-progress-fill': 480}
for name, box in zip(names, it):
    img = fit(part(im, box), widths[name])
    save_webp(img, OUT_UI / f'{name}.webp')
    review(name, img)
    w, h = img.size
    if name in ('ui-pill', 'ui-progress-fill'):
        meta['ui'][name] = nine(img, h * 0.5, h * 0.5, h * 0.42, h * 0.42)
    else:
        meta['ui'][name] = nine(img, w * 0.3, w * 0.3, h * 0.3, h * 0.3)

im, it = components('ui-buttons-sheet')
for name, box in zip(['ui-btn-green', 'ui-btn-yellow', 'ui-btn-white'], it):
    img = fit(part(im, box), 400)
    save_webp(img, OUT_UI / f'{name}.webp')
    review(name, img)
    w, h = img.size
    meta['ui'][name] = nine(img, h * 0.5, h * 0.5, h * 0.36, h * 0.44)

im, it = components('ui-icons-sheet')
icon_boxes = {'icon-coin': it[0], 'icon-diamond': it[1], 'icon-pause': merge([it[2], it[3]]), 'icon-home': it[4], 'icon-check': it[5], 'icon-ad': it[6]}
for name, box in icon_boxes.items():
    img = fit(part(im, box), 192)
    save_webp(img, OUT_UI / f'{name}.webp')
    review(name, img)
    meta['ui'][name] = {'size': list(img.size)}

card = fit(crop_padded(Image.open(CUTOUTS / 'ui-result-card.png').convert('RGBA'), 0.02), 1024)
save_webp(card, OUT_UI / 'ui-result-card.webp')
review('ui-result-card', card)
meta['ui']['ui-result-card'] = {'size': list(card.size)}

shelf = fit(crop_padded(Image.open(CUTOUTS / 'ui-shelf.png').convert('RGBA'), 0.02), 1200)
save_webp(shelf, OUT_UI / 'ui-shelf.webp')
review('ui-shelf', shelf)
meta['ui']['ui-shelf'] = {'size': list(shelf.size)}

im, it = components('fx-sheet')
chunks = [it[i] for i in (0, 2, 3, 7, 8)]
drops = [it[i] for i in (1, 4)]
for i, box in enumerate(chunks):
    img = fit(part(im, box), 160)
    save_webp(img, OUT_LEVEL / f'fx-chunk-{i + 1}.webp')
    meta['fx'][f'fx-chunk-{i + 1}'] = {'size': list(img.size)}
for i, box in enumerate(drops):
    img = fit(part(im, box), 96)
    save_webp(img, OUT_LEVEL / f'fx-drop-{i + 1}.webp')
    meta['fx'][f'fx-drop-{i + 1}'] = {'size': list(img.size)}
sp = fit(crop_padded(Image.open(CUTOUTS / 'fx-sparkle.png').convert('RGBA'), 0.04), 192)
save_webp(sp, OUT_LEVEL / 'fx-sparkle.webp')
review('fx-sparkle', sp)
meta['fx']['fx-sparkle'] = {'size': list(sp.size)}

META_JS.write_text(
    '// GENERATED by scripts/prepare_assets.py — do not edit by hand.\n'
    f'export const ASSET_META = {json.dumps(meta, indent=2)};\n',
    encoding='utf-8',
)
print(json.dumps({k: meta[k] for k in ('object', 'tools', 'registration')}, indent=1))
print('files:', len(meta['files']))
