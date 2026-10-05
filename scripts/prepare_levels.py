"""Step 5: prepare runtime assets for levels 2–5 (Rug, Golden Ball Trophy, Chair, Sneaker), the
shared Step 5 tools / UI, and object masks for all five levels.

Inputs:  reference/masters/<level|shared>/*.png   (Nano Banana 2 outputs, untouched)
         reference/cutouts/<level|shared>/*.png   (Higgsfield Background Remover outputs, untouched)
Outputs: public/assets/<level>/*.webp|png, public/assets/shared/*.webp, public/assets/ui/*.webp
         src/content/generated/levelMeta.js        (bounds, regions, spots, working points)
         reference/review/<level|shared>/*.png     (alpha review strips)

Only registration / crop / resize / masking / compositing of generated images. No background
removal, no chroma key, no redrawing. Requires Pillow, NumPy, SciPy.
Run: python scripts/prepare_levels.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
M = ROOT / 'reference/masters'
C = ROOT / 'reference/cutouts'
PUB = ROOT / 'public/assets'
REV = ROOT / 'reference/review'
META_JS = ROOT / 'src/content/generated/levelMeta.js'
OBJ = 1024
FILL = 0.86  # largest side of the clean object on the 1024 canvas
LANDSCAPE_TOP = 0.15

meta = {'levels': {}, 'tools': {}, 'ui': {}, 'sprites': {}}


def save_webp(img, path, q=90):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, 'WEBP', quality=q, alpha_quality=100, method=6)


def alpha(img):
    return np.array(img.split()[-1]).astype(np.float32) / 255


def bbox(a, thr=0.5):
    ys, xs = np.where(a > thr)
    return float(xs.min()), float(ys.min()), float(xs.max() + 1), float(ys.max() + 1)


def fit(img, max_side):
    s = max_side / max(img.size)
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


def crop_padded(img, pad=0.05, box=None):
    x0, y0, x1, y1 = [int(v) for v in (box or bbox(alpha(img), 0.06))]
    p = int(max(x1 - x0, y1 - y0) * pad)
    out = Image.new('RGBA', (x1 - x0 + 2 * p, y1 - y0 + 2 * p), (0, 0, 0, 0))
    out.paste(img.crop((x0, y0, x1, y1)), (p, p))
    return out


_bg_review = None


def review(group, name, img):
    global _bg_review
    if _bg_review is None:
        _bg_review = Image.open(M / 'soccer-ball/bg-pitch-portrait.png').convert('RGBA')
    t = fit(img, 300)
    w, h = t.size
    strip = Image.new('RGBA', (3 * (w + 20), h + 20), (0, 0, 0, 255))
    for i, bg in enumerate([Image.new('RGBA', (w, h), (245, 245, 245, 255)), Image.new('RGBA', (w, h), (25, 25, 35, 255)), _bg_review.resize((w * 3, h * 3)).crop((w, h, 2 * w, 2 * h))]):
        tile = bg.copy()
        tile.alpha_composite(t)
        strip.paste(tile, (10 + i * (w + 20), 10))
    (REV / group).mkdir(parents=True, exist_ok=True)
    strip.convert('RGB').save(REV / group / f'{name}.png')


def save_mask(a, path, res=256):
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'L').resize((res, res), Image.BILINEAR)
    rgba = Image.new('RGBA', img.size, (255, 255, 255, 0))
    rgba.putalpha(img)
    path.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(path)


def outside_png(a, path):
    img = Image.new('RGBA', (OBJ, OBJ), (255, 255, 255, 255))
    img.putalpha(Image.fromarray(((1 - np.clip(a, 0, 1)) * 255).astype(np.uint8)))
    img.save(path)


# ---- registration ------------------------------------------------------------------------
def register_states(level, states, crust=None):
    """Registers the clean master and its edited states to one 1024 canvas by silhouette bounds."""
    clean = Image.open(C / level / f'{states[0]}.png').convert('RGBA')
    ca = alpha(clean)
    x0, y0, x1, y1 = bbox(ca)
    s0 = OBJ * FILL / max(x1 - x0, y1 - y0)
    cxy = ((x0 + x1) / 2, (y0 + y1) / 2)
    out = {}
    reg = {}
    for st in states + ([crust] if crust else []):
        src = Image.open(C / level / f'{st}.png').convert('RGBA')
        a = alpha(src)
        bx0, by0, bx1, by1 = bbox(a)
        if st == crust:
            s, c = s0, ((bx0 + bx1) / 2, (by0 + by1) / 2)
        else:
            sw = (x1 - x0) / max(1, bx1 - bx0)
            sh = (y1 - y0) / max(1, by1 - by0)
            s, c = s0 * (sw + sh) / 2, ((bx0 + bx1) / 2, (by0 + by1) / 2)
        scaled = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
        canvas = Image.new('RGBA', (OBJ, OBJ), (0, 0, 0, 0))
        canvas.paste(scaled, (round(OBJ / 2 - c[0] * s), round(OBJ / 2 - c[1] * s)), scaled)
        out[st] = canvas
        reg[st] = {'scale': round(s, 5), 'srcBBox': [round(v, 1) for v in (bx0, by0, bx1, by1)]}
    clean_a = alpha(out[states[0]])
    for st in states[1:]:
        arr = np.array(out[st]).astype(np.float32)
        arr[:, :, 3] = np.minimum(arr[:, :, 3], clean_a * 255)
        out[st] = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    return out, clean_a, reg


def mask_layer(img, m):
    arr = np.array(img).astype(np.float32)
    arr[:, :, 3] *= np.clip(m, 0, 1)
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')


# ---- foam ----------------------------------------------------------------------------------
_foam = None


def foam_layers(level, area_a, shading=0.22, material=None):
    """Fresh foam and its scrubbed state (same material) masked to `area_a`.
    `material` = Step 6 material foam master (reference/masters/materials/foam-<m>.png); the
    scrubbed variant is the same material with the brush-swirl relief, so every object keeps one
    continuous foam material from spraying to rinsing, and objects no longer share one texture."""
    global _foam
    if _foam is None:
        sw = np.array(Image.open(M / 'soccer-ball/tex-foam-swirl.png').convert('RGB').resize((OBJ, OBJ), Image.LANCZOS)).astype(np.float32) / 255
        lum = sw.mean(2)
        _foam = (lum - ndimage.gaussian_filter(lum, 6)) * 2.2
    relief = _foam
    base = np.array(Image.open(M / 'soccer-ball/tex-foam.png').convert('RGB').resize((OBJ, OBJ), Image.LANCZOS)).astype(np.float32)
    if material:
        mat = np.array(Image.open(M / 'materials' / f'foam-{material}.png').convert('RGB').resize((OBJ, OBJ), Image.LANCZOS)).astype(np.float32)
        # metal suds keep a white foam body so the foamed trophy still reads as covered in foam
        tex = mat * 0.5 + base * 0.5 if material == 'metal' else mat
    else:
        tex = base
    scrub = np.clip(tex * (1 + relief[:, :, None]) * np.array([0.98, 0.96, 0.9]), 0, 255)
    dist = ndimage.distance_transform_edt(area_a > 0.5)
    edge = np.clip(dist / 60, 0, 1)
    shade = (1 - shading) + shading * edge
    for name, src, op in (('tex-foam-full', tex, 0.96), ('tex-foam-scrubbed-full', scrub, 0.94)):
        rgb = np.clip(src * shade[:, :, None], 0, 255)
        rgba = np.dstack([rgb, area_a * 255 * op]).astype(np.uint8)
        save_webp(Image.fromarray(rgba, 'RGBA'), PUB / level / f'{name}.webp')


# ---- backgrounds / pictures --------------------------------------------------------------
def backgrounds(level, master):
    img = Image.open(M / level / f'{master}.png').convert('RGB')
    s = max(1080 / img.width, 1920 / img.height)
    p = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    x = (p.width - 1080) // 2
    y = (p.height - 1920) // 2
    p.crop((x, y, x + 1080, y + 1920)).save(PUB / level / 'bg-portrait.webp', 'WEBP', quality=84, method=6)
    h = round(img.width * 9 / 16)
    y0 = min(round(img.height * LANDSCAPE_TOP), img.height - h)
    img.crop((0, y0, img.width, y0 + h)).resize((1920, 1080), Image.LANCZOS).save(PUB / level / 'bg-landscape.webp', 'WEBP', quality=84, method=6)
    return img


def result_picture(level, bg, clean, focus_y=0.5):
    w, h = 640, 480
    ch = round(bg.width * h / w)
    top = min(max(0, round(bg.height * focus_y - ch / 2)), bg.height - ch)
    pic = bg.crop((0, top, bg.width, top + ch)).resize((w, h), Image.LANCZOS).convert('RGBA')
    obj = crop_padded(clean, 0.02)
    obj = fit(obj, 360)
    shadow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    by = (h + obj.height) // 2 + 8
    ImageDraw.Draw(shadow).ellipse((w / 2 - obj.width * 0.45, by - 22, w / 2 + obj.width * 0.45, by + 14), fill=(0, 0, 0, 90))
    pic.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)))
    pic.alpha_composite(obj, ((w - obj.width) // 2, (h - obj.height) // 2))
    rounded = Image.new('L', (w, h), 0)
    ImageDraw.Draw(rounded).rounded_rectangle((0, 0, w - 1, h - 1), radius=44, fill=255)
    pic.putalpha(rounded)
    save_webp(pic, PUB / level / 'result-picture.webp', 88)


def bounds_of(a):
    x0, y0, x1, y1 = bbox(a)
    return [round(x0), round(y0), round(x1), round(y1)]


def finish_level(level, layers, clean_a, extra=None):
    for name, img in layers.items():
        save_webp(img, PUB / level / f'{name}.webp')
        review(level, name, img)
    save_mask(clean_a, PUB / level / 'mask.png')
    outside_png(clean_a, PUB / level / 'mask-outside.png')
    m = {'bounds': bounds_of(clean_a)}
    m.update(extra or {})
    meta['levels'][level] = m


# ---- sheet slicing -------------------------------------------------------------------------
def components(path, min_area=1500):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)[:, :, 3]
    lab, _ = ndimage.label(ndimage.binary_dilation(a > 24, iterations=6))
    items = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if (lab[sl] == i + 1).sum() < min_area:
            continue
        items.append((sl[0].start, sl[1].start, sl[0].stop, sl[1].stop))
    items.sort(key=lambda t: (round(t[0] / 200), t[1]))
    return im, items


def grid_parts(path, cols, rows):
    """Components merged per grid cell (icons made of several pieces, e.g. speaker + waves)."""
    im, it = components(path, min_area=400)
    cells = {}
    for (y0, x0, y1, x1) in it:
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        key = (min(rows - 1, int(cy / im.height * rows)), min(cols - 1, int(cx / im.width * cols)))
        b = cells.get(key)
        cells[key] = (y0, x0, y1, x1) if b is None else (min(b[0], y0), min(b[1], x0), max(b[2], y1), max(b[3], x1))
    return im, [cells[k] for k in sorted(cells)]


def part(im, box, pad=8):
    y0, x0, y1, x1 = box
    return crop_padded(im, 0, (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


# ---- tools ----------------------------------------------------------------------------------
def tool(name, img, rule):
    img = fit(crop_padded(img, 0.05), 768)
    a = np.array(img.split()[-1])
    ys, xs = np.where(a > 128)
    h, w = a.shape
    if rule == 'top':
        y0 = ys.min()
        band = xs[ys < y0 + max(3, int(h * 0.01))]
        wp = (float(band.mean()) / w, float(y0) / h)
    elif rule == 'top-center':  # centre of the head in the top quarter (duster, drill brush)
        top = ys < ys.min() + (ys.max() - ys.min()) * 0.22
        wp = (float(xs[top].mean()) / w, float(ys[top].mean()) / h)
    elif rule == 'bottom':
        wp = ((xs.min() + xs.max()) / 2 / w, (ys.max() - (ys.max() - ys.min()) * 0.10) / h)
    else:
        wp = ((xs.min() + xs.max()) / 2 / w, (ys.min() + ys.max()) / 2 / h)
    save_webp(img, PUB / 'shared' / f'{name}.webp')
    review('shared', name, img)
    meta['tools'][name] = {'size': [w, h], 'workingPoint': [round(wp[0], 4), round(wp[1], 4)]}


def run_tools():
    for name, rule in [('tool-squeegee', 'top'), ('tool-detail-brush', 'top'), ('tool-mist-nozzle', 'top'), ('tool-duster', 'top-center'), ('tool-foam-can', 'top'), ('tool-drill-brush', 'top'), ('tool-putty-knife', 'top')]:
        tool(name, Image.open(C / 'shared' / f'{name}.png').convert('RGBA'), rule)
    im, it = components(C / 'shared' / 'tools-sanding-sponge-eraser-sheet.png')
    it.sort(key=lambda t: t[1])
    for name, box in zip(['tool-sandpaper', 'tool-stain-sponge', 'tool-eraser'], it):
        tool(name, part(im, box), 'center')


def run_ui():
    im, it = grid_parts(C / 'shared' / 'ui-settings-icons-sheet.png', 3, 2)
    for name, box in zip(['icon-gear', 'icon-sound', 'icon-music', 'icon-vibration', 'icon-close', 'icon-shop'], it):
        img = fit(part(im, box), 192)
        save_webp(img, PUB / 'ui' / f'{name}.webp')
        review('shared', name, img)
        meta['ui'][name] = {'size': list(img.size)}
    im, it = components(C / 'shared' / 'ui-toggle-sheet.png')
    it.sort(key=lambda t: t[0])
    for name, box in (('ui-toggle-on', it[0]), ('ui-toggle-off', it[-1])):
        img = fit(part(im, box), 240)
        save_webp(img, PUB / 'ui' / f'{name}.webp')
        review('shared', name, img)
        meta['ui'][name] = {'size': list(img.size)}
    hand = fit(crop_padded(Image.open(C / 'shared' / 'ui-hint-hand.png').convert('RGBA'), 0.04), 256)
    a = np.array(hand.split()[-1])
    ys, xs = np.where(a > 128)
    tip = xs[ys < ys.min() + 4].mean() / hand.width, ys.min() / hand.height
    save_webp(hand, PUB / 'ui' / 'ui-hint-hand.webp')
    review('shared', 'ui-hint-hand', hand)
    meta['ui']['ui-hint-hand'] = {'size': list(hand.size), 'tip': [round(tip[0], 4), round(tip[1], 4)]}


# ---- levels ---------------------------------------------------------------------------------
def run_rug():
    L = 'rug'
    layers, clean_a, reg = register_states(L, ['rug-clean', 'rug-wet', 'rug-stained', 'rug-muddy', 'rug-sandy'])
    foam_layers(L, clean_a, 0.12, 'rug')
    bg = backgrounds(L, 'bg-bathroom-portrait')
    result_picture(L, bg, layers['rug-clean'], 0.6)
    save_webp(fit(crop_padded(layers['rug-sandy'], 0.02), 512), PUB / L / 'thumb.webp')
    finish_level(L, layers, clean_a, {'registration': reg})


def split_row(a):
    """Row where the silhouette is narrowest between 45 % and 85 % of its height (ball ↔ plinth)."""
    x0, y0, x1, y1 = bbox(a)
    widths = (a > 0.5).sum(1)
    lo, hi = int(y0 + (y1 - y0) * 0.45), int(y0 + (y1 - y0) * 0.85)
    return lo + int(np.argmin(widths[lo:hi]))


def run_trophy():
    L = 'golden-trophy'
    layers, clean_a, reg = register_states(L, ['trophy-clean', 'trophy-wet', 'trophy-tarnish-wet', 'trophy-tarnished', 'trophy-dusty'], crust='trophy-mudcrust')
    foam_layers(L, clean_a, 0.22, 'metal')
    bg = backgrounds(L, 'bg-trophy-room-portrait')
    result_picture(L, bg, layers['trophy-clean'], 0.62)
    save_webp(fit(crop_padded(layers['trophy-dusty'], 0.02), 512), PUB / L / 'thumb.webp')
    split = split_row(clean_a)
    b = bounds_of(clean_a)
    finish_level(L, layers, clean_a, {'registration': reg, 'regions': {'ball': [b[0], b[1], b[2], split], 'base': [b[0], split, b[2], b[3]]}})


def run_sneaker():
    L = 'sneaker'
    layers, clean_a, reg = register_states(L, ['sneaker-clean', 'sneaker-scuffed', 'sneaker-wet', 'sneaker-stained', 'sneaker-muddy'], crust='sneaker-mudcrust')
    foam_layers(L, clean_a, 0.18, 'sneaker')
    bg = backgrounds(L, 'bg-studio-portrait')
    result_picture(L, bg, layers['sneaker-clean'], 0.6)
    save_webp(fit(crop_padded(layers['sneaker-mudcrust'], 0.02), 512), PUB / L / 'thumb.webp')
    b = bounds_of(clean_a)
    sole_top = round(b[1] + (b[3] - b[1]) * 0.66)
    # Scuff-mark region (Step 6): where the scuffed state is darker than the clean shoe, grown and
    # filled, so every mark (sole, heel, toe) is reachable by the eraser and nothing else counts.
    c = np.array(layers['sneaker-clean'].convert('RGB')).astype(np.float32).mean(2)
    sc = np.array(layers['sneaker-scuffed'].convert('RGB')).astype(np.float32).mean(2)
    marks = ((c - sc) > 12) & (clean_a > 0.5)
    marks = ndimage.binary_opening(marks, iterations=1)
    lab, n = ndimage.label(marks)
    if n:
        sizes = ndimage.sum(marks, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v >= 40])
    else:
        keep = marks
    scuffs = ndimage.binary_dilation(keep, iterations=14) & (clean_a > 0.5)
    scuffs = ndimage.binary_fill_holes(ndimage.binary_closing(scuffs, iterations=6)) & (clean_a > 0.5)
    save_mask(scuffs.astype(np.float32), PUB / L / 'scuffs-mask.png', 512)
    finish_level(L, layers, clean_a, {'registration': reg, 'regions': {'sole': [b[0], sole_top, b[2], b[3]]}, 'scuffBounds': bounds_of(scuffs.astype(np.float32))})


def nearest_on(mask, x, y):
    ys, xs = np.where(mask)
    i = int(np.argmin((xs - x) ** 2 + (ys - y) ** 2))
    return int(xs[i]), int(ys[i])


def run_chair():
    L = 'chair'
    layers, clean_a, reg = register_states(L, ['chair-clean', 'chair-sanded', 'chair-dented', 'chair-seat-old', 'chair-dusty'])
    # Seat region (Step 6): the whole mustard-yellow leather cushion of the clean chair, found by
    # colour (hue 30–65°, saturated, bright), so the top AND the front face of the cushion are
    # included. The earlier edit-difference mask missed parts of the cushion.
    rgb = np.array(layers['chair-clean'].convert('RGB')).astype(np.float32) / 255
    mx = rgb.max(2)
    mn = rgb.min(2)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    hue = np.zeros_like(mx)
    rr, gg, bb = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    d = np.maximum(mx - mn, 1e-6)
    hue = np.where(mx == rr, ((gg - bb) / d) % 6, np.where(mx == gg, (bb - rr) / d + 2, (rr - gg) / d + 4)) * 60
    yellow = (hue > 30) & (hue < 65) & (sat > 0.42) & (mx > 0.42) & (clean_a > 0.5)
    yellow = ndimage.binary_opening(yellow, iterations=2)
    lab, n = ndimage.label(yellow)
    sizes = ndimage.sum(yellow, lab, range(1, n + 1))
    seat = lab == (int(np.argmax(sizes)) + 1)
    seat = ndimage.binary_closing(seat, iterations=6)
    seat = ndimage.binary_fill_holes(seat)
    seat = ndimage.binary_dilation(seat, iterations=3) & (clean_a > 0.5)
    seat_f = ndimage.gaussian_filter(seat.astype(np.float32), 1.2) * clean_a
    frame_f = np.clip(clean_a - seat_f, 0, 1)
    out = {
        'chair-clean': layers['chair-clean'],
        'chair-sanded': layers['chair-sanded'],
        'chair-dented': mask_layer(layers['chair-dented'], frame_f),
        'chair-seat-old': mask_layer(layers['chair-seat-old'], seat_f),
        'chair-dusty-frame': mask_layer(layers['chair-dusty'], frame_f),
        'chair-dusty-seat': mask_layer(layers['chair-dusty'], seat_f),
    }
    foam_layers(L, seat_f, 0.16, 'leather')
    bg = backgrounds(L, 'bg-room-portrait')
    result_picture(L, bg, layers['chair-clean'], 0.62)
    thumb = layers['chair-dusty']
    save_webp(fit(crop_padded(thumb, 0.02), 512), PUB / L / 'thumb.webp')
    save_mask(seat_f, PUB / L / 'seat-mask.png')
    outside_png(seat_f, PUB / L / 'seat-outside.png')
    # Putty spots: 4 points on the wooden frame (top rail, both back posts, a front leg).
    fb = frame_f > 0.5
    x0, y0, x1, y1 = bounds_of(clean_a)
    W, H = x1 - x0, y1 - y0
    targets = [(x0 + W * 0.42, y0 + H * 0.04), (x0 + W * 0.2, y0 + H * 0.33), (x0 + W * 0.8, y0 + H * 0.33), (x0 + W * 0.2, y0 + H * 0.86)]
    spots = []
    for tx, ty in targets:
        # keep the spot centre well inside the wood: erode first
        core = ndimage.binary_erosion(fb, iterations=10)
        sx, sy = nearest_on(core if core.any() else fb, tx, ty)
        spots.append([sx, sy])
    sb = bounds_of(seat_f)
    pad_x = (sb[2] - sb[0]) * 0.14
    pad_y = (sb[3] - sb[1]) * 0.35
    focus = [round(sb[0] - pad_x), round(sb[1] - pad_y), round(sb[2] + pad_x), round(sb[3] + pad_y)]
    # Trash items and the bin
    im, it = components(C / L / 'trash-items-sheet.png', min_area=4000)
    names = ['trash-shirt', 'trash-can', 'trash-peel', 'trash-shoe', 'trash-bottle']
    # layout of the generated sheet: shirt / can on top, peel in the middle, shoe / bottle below
    it.sort(key=lambda t: (int(((t[0] + t[2]) / 2) / (im.height / 3)), t[1]))
    for nm, box in zip(names, it):
        img = fit(part(im, box), 256)
        save_webp(img, PUB / L / f'{nm}.webp')
        review(L, nm, img)
        meta['sprites'][nm] = {'size': list(img.size)}
    binimg = fit(crop_padded(Image.open(C / L / 'trash-bin.png').convert('RGBA'), 0.03), 512)
    save_webp(binimg, PUB / L / 'trash-bin.webp')
    review(L, 'trash-bin', binimg)
    meta['sprites']['trash-bin'] = {'size': list(binimg.size)}
    im, it = components(C / L / 'dents-putty-sheet.png')
    it.sort(key=lambda t: (round(t[0] / 300), t[1]))
    dents, blobs = it[:3], it[3:6]
    for i, box in enumerate(dents):
        img = part(im, box)
        # keep only the dent: a soft round crop around the dark centre
        w, h = img.size
        rr = Image.new('L', (w, h), 0)
        ImageDraw.Draw(rr).ellipse((w * 0.12, h * 0.12, w * 0.88, h * 0.88), fill=255)
        rr = rr.filter(ImageFilter.GaussianBlur(w * 0.06))
        arr = np.array(img).astype(np.float32)
        arr[:, :, 3] *= np.array(rr).astype(np.float32) / 255
        img = fit(Image.fromarray(arr.astype(np.uint8), 'RGBA'), 160)
        save_webp(img, PUB / L / f'dent-{i + 1}.webp')
        meta['sprites'][f'dent-{i + 1}'] = {'size': list(img.size)}
    for i, box in enumerate(blobs):
        img = fit(part(im, box), 200)
        save_webp(img, PUB / L / f'putty-{i + 1}.webp')
        meta['sprites'][f'putty-{i + 1}'] = {'size': list(img.size)}
    if len(it) > 6:  # the open putty tub (container the knife dips into, Step 6)
        tub = fit(part(im, it[6]), 320)
        save_webp(tub, PUB / L / 'putty-tub.webp')
        review(L, 'putty-tub', tub)
        meta['sprites']['putty-tub'] = {'size': list(tub.size)}
    finish_level(L, out, clean_a, {'registration': reg, 'seatBounds': sb, 'focus': {'seat': focus}, 'spots': spots})


def run_soccer_masks():
    """Object mask + bounds for the approved Soccer Ball level (from its runtime clean ball)."""
    img = Image.open(PUB / 'soccer-ball/ball-clean.webp').convert('RGBA')
    a = alpha(img)
    save_mask(a, PUB / 'soccer-ball/mask.png')
    meta['levels']['soccer-ball'] = {'bounds': bounds_of(a)}


if __name__ == '__main__':
    import sys
    only = set(sys.argv[1:])
    steps = {'soccer': run_soccer_masks, 'tools': run_tools, 'ui': run_ui, 'rug': run_rug, 'trophy': run_trophy, 'sneaker': run_sneaker, 'chair': run_chair}
    old = {}
    if META_JS.exists():
        txt = META_JS.read_text(encoding='utf-8')
        try:
            old = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
        except ValueError:
            old = {}
    for k, fn in steps.items():
        if not only or k in only:
            fn()
            print('done', k)
    for key in ('levels', 'tools', 'ui', 'sprites'):
        merged = dict(old.get(key, {}))
        merged.update(meta[key])
        meta[key] = merged
    META_JS.write_text('// GENERATED by scripts/prepare_levels.py — do not edit by hand.\nexport const LEVEL_META = ' + json.dumps(meta, indent=1) + ';\n', encoding='utf-8')
