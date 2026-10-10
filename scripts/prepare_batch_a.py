"""Step 8 Batch A: prepare runtime assets for levels 6–15, the shared background families
(WASH, STUDIO, WORKSHOP, YARD) and the new tools.

Inputs:  reference/masters/<group>/*.png   (Nano Banana Pro outputs, untouched)
         reference/cutouts/<group>/*.png   (Higgsfield Background Remover outputs, untouched)
Outputs: public/assets/<level>/*.webp|png, public/assets/backgrounds/*.webp, public/assets/shared/*.webp
         src/content/generated/levelMeta.js     (merged: bounds, regions, spots, cells, tools)
         src/content/generated/batchAAssets.js  (runtime registry: per-level lazy assets)
         reference/review/<group>/*.png         (alpha review strips)

Only registration / crop / resize / masking / compositing of generated images (same rules as
prepare_levels.py): no background removal, no chroma key, no redrawing. Region masks are derived
from the generated states themselves (colour or state differences).
Run: python scripts/prepare_batch_a.py [level ...|tools|backgrounds]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
import prepare_levels as PL  # noqa: E402

ROOT = PL.ROOT
M, C, PUB, REV = PL.M, PL.C, PL.PUB, PL.REV
OBJ = PL.OBJ
REG = ROOT / 'src/content/generated/batchAAssets.js'

meta = PL.meta  # shared dict (levels / tools / ui / sprites), merged into levelMeta.js at the end
assets = {}  # level -> {key: url}
BG_FAMILY = {
    'rain-boots': 'wash', 'frying-pan': 'wash', 'bathroom-sink': 'wash',
    'wooden-crate': 'workshop', 'toolbox': 'workshop',
    'desk-fan': 'studio', 'keyboard': 'studio', 'porcelain-vase': 'studio',
    'garden-bench': 'yard', 'watering-can': 'yard',
}


# ---- helpers ------------------------------------------------------------------------------
def reg_key(level, name, path):
    assets.setdefault(level, {})[f'{level}-{name}'] = path


def save_layer(level, name, img):
    PL.save_webp(img, PUB / level / f'{name}.webp')
    PL.review(level, name, img)
    reg_key(level, name, f'assets/{level}/{name}.webp')


def save_mask_named(level, name, a, res=512):
    PL.save_mask(a, PUB / level / f'{name}.png', res)
    reg_key(level, name, f'assets/{level}/{name}.png')


def save_outside_named(level, name, a):
    PL.outside_png(a, PUB / level / f'{name}.png')
    reg_key(level, name, f'assets/{level}/{name}.png')


def rgb(img):
    return np.array(img.convert('RGB')).astype(np.float32) / 255


def hue_sat_val(img):
    c = rgb(img)
    mx, mn = c.max(2), c.min(2)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = (mx - mn) / np.maximum(mx, 1e-6)
    return h, s, mx


def diff_mask(a_img, b_img, inside, thr=0.12, min_blob=60, grow=8, close=4):
    """Where two registered states differ (colour distance), cleaned, grown and filled."""
    d = np.abs(rgb(a_img) - rgb(b_img)).max(2)
    m = (d > thr) & (inside > 0.5)
    m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        m = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v >= min_blob])
    m = ndimage.binary_closing(m, iterations=close)
    m = ndimage.binary_fill_holes(m)
    if grow:
        m = ndimage.binary_dilation(m, iterations=grow)
    return m & (inside > 0.5)


def soft(m, sigma=1.2, inside=None):
    f = ndimage.gaussian_filter(m.astype(np.float32), sigma)
    return f * inside if inside is not None else f


def largest(m):
    lab, n = ndimage.label(m)
    if not n:
        return m
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    return lab == (int(np.argmax(sizes)) + 1)


def bounds(a):
    return PL.bounds_of(a)


def thumbs(level, dirty_img, clean_img):
    PL.save_webp(PL.fit(PL.crop_padded(dirty_img, 0.02), 512), PUB / level / 'thumb.webp')
    PL.save_webp(PL.fit(PL.crop_padded(clean_img, 0.02), 512), PUB / level / 'thumb-clean.webp')
    # thumbnails are needed by the menu at boot (not lazy)
    meta['levels'].setdefault(level, {})


def foam(level, area, shading, material):
    PL.foam_layers(level, area, shading, material)
    reg_key(level, 'foam', f'assets/{level}/tex-foam-full.webp')
    reg_key(level, 'foam-scrubbed', f'assets/{level}/tex-foam-scrubbed-full.webp')


_bg_cache = {}


def family_bg(fam):
    if fam not in _bg_cache:
        _bg_cache[fam] = Image.open(M / 'backgrounds' / f'bg-{fam}.png').convert('RGB')
    return _bg_cache[fam]


def result_pic(level, clean, focus_y=0.62):
    PL.result_picture(level, family_bg(BG_FAMILY[level]), clean, focus_y)
    reg_key(level, 'result-picture', f'assets/{level}/result-picture.webp')


def finish(level, layers, clean_a, extra=None):
    for name, img in layers.items():
        save_layer(level, name, img)
    save_mask_named(level, 'mask', clean_a, 256)
    save_outside_named(level, 'mask-outside', clean_a)
    m = meta['levels'].setdefault(level, {})
    m['bounds'] = bounds(clean_a)
    m.update(extra or {})
    fam = BG_FAMILY[level]
    for o in ('portrait', 'landscape'):
        assets[level][f'bg-{fam}-{o}'] = f'assets/backgrounds/bg-{fam}-{o}.webp'


def sprite_from(img, max_side, level, name):
    out = PL.fit(PL.crop_padded(img, 0.03), max_side)
    save_layer(level, name, out)
    meta['sprites'][f'{level}-{name}'] = {'size': list(out.size)}
    return out


def sheet_parts(level, sheet, names, max_side, order='rows', min_area=4000, rows=3):
    im, it = PL.components(C / level / f'{sheet}.png', min_area=min_area)
    if order == 'x':
        it.sort(key=lambda t: t[1])
    else:
        it.sort(key=lambda t: (int(((t[0] + t[2]) / 2) / (im.height / rows)), t[1]))
    out = {}
    for nm, box in zip(names, it):
        out[nm] = sprite_from(PL.part(im, box), max_side, level, nm)
    return out


def round_decal(img, size, feather=0.07):
    """Soft round crop of a decal (dent / chip) so it blends into the surface around it."""
    w, h = img.size
    rr = Image.new('L', (w, h), 0)
    ImageDraw.Draw(rr).ellipse((w * 0.1, h * 0.1, w * 0.9, h * 0.9), fill=255)
    rr = rr.filter(ImageFilter.GaussianBlur(w * feather))
    arr = np.array(img.convert('RGBA')).astype(np.float32)
    arr[:, :, 3] *= np.array(rr).astype(np.float32) / 255
    return PL.fit(Image.fromarray(arr.astype(np.uint8), 'RGBA'), size)


def place_on_canvas(img, cx, cy, size):
    """A sprite drawn onto an empty 1024 canvas at (cx, cy) with its longest side = size."""
    s = PL.fit(img, size)
    can = Image.new('RGBA', (OBJ, OBJ), (0, 0, 0, 0))
    can.alpha_composite(s, (round(cx - s.width / 2), round(cy - s.height / 2)))
    return can


def patch_crop(src, cx, cy, size):
    """Round soft crop of a registered layer around a point (repair patch = restored surface)."""
    x0, y0 = round(cx - size / 2), round(cy - size / 2)
    crop = src.crop((x0, y0, x0 + round(size), y0 + round(size)))
    return round_decal(crop, round(size), 0.05)


# ---- shared background families -------------------------------------------------------------
def run_backgrounds():
    out = PUB / 'backgrounds'
    out.mkdir(parents=True, exist_ok=True)
    for fam in ('wash', 'studio', 'workshop', 'yard'):
        img = family_bg(fam)
        s = max(1080 / img.width, 1920 / img.height)
        p = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
        x = (p.width - 1080) // 2
        y = (p.height - 1920) // 2
        p.crop((x, y, x + 1080, y + 1920)).save(out / f'bg-{fam}-portrait.webp', 'WEBP', quality=84, method=6)
        h = round(img.width * 9 / 16)
        y0 = min(round(img.height * PL.LANDSCAPE_TOP), img.height - h)
        img.crop((0, y0, img.width, y0 + h)).resize((1920, 1080), Image.LANCZOS).save(out / f'bg-{fam}-landscape.webp', 'WEBP', quality=84, method=6)


# ---- level 6 · rain boots -------------------------------------------------------------------
def run_rain_boots():
    L = 'rain-boots'
    layers, clean_a, reg = PL.register_states(L, ['clean', 'wet', 'stained', 'muddy'], crust='mudcrust')
    foam(L, clean_a, 0.18, 'rubber')
    result_pic(L, layers['clean'])
    thumbs(L, layers['mudcrust'], layers['clean'])
    finish(L, layers, clean_a, {'registration': reg})


# ---- level 7 · cast-iron frying pan --------------------------------------------------------
def run_frying_pan():
    L = 'frying-pan'
    layers, clean_a, reg = PL.register_states(L, ['clean', 'matte', 'wet', 'rusty', 'greasy', 'crust'])
    # cooking surface = the round pan body (the handle removed by an opening) shrunk by the rim
    body = largest(ndimage.binary_opening(clean_a > 0.5, iterations=28))
    bx = np.where(body.any(0))[0]
    rim = max(6, int((bx.max() - bx.min()) * 0.075))
    inside_m = ndimage.binary_erosion(body, iterations=rim)
    inside = soft(inside_m, 1.5, clean_a)
    cd = np.abs(rgb(layers['crust']) - rgb(layers['clean'])).max(2) > 0.08
    crust_m = ndimage.binary_fill_holes(ndimage.binary_closing(cd & inside_m, iterations=22)) & ndimage.binary_erosion(inside_m, iterations=2)
    crust_m = largest(ndimage.binary_opening(crust_m, iterations=4))
    # rust patches: where the rusty state differs from the clean wet state (rim + handle)
    rust_m = diff_mask(layers['rusty'], layers['wet'], clean_a, thr=0.2, min_blob=80, grow=10, close=6) & ~ndimage.binary_dilation(inside_m, iterations=6)
    rust = soft(rust_m, 1.5, clean_a)
    out = {
        'clean': layers['clean'],
        'matte': layers['matte'],
        'wet': layers['wet'],
        # the whole pan outside the cooking surface starts rusty / dirty; steel wool works the rust
        # patches (rust region), the drying cloth takes the rest
        'rusty': PL.mask_layer(layers['rusty'], np.clip(clean_a - inside, 0, 1)),
        'greasy': PL.mask_layer(layers['greasy'], inside),
        # the crust itself: where the crust edit differs from the clean pan, closed into one cake
        'crust': PL.mask_layer(layers['crust'], soft(crust_m, 1.0)),
    }
    foam(L, inside, 0.2, 'degreaser')
    save_mask_named(L, 'inside-mask', inside)
    save_outside_named(L, 'inside-outside', inside)
    save_mask_named(L, 'rust-mask', rust)
    result_pic(L, layers['clean'])
    first = layers['wet']
    for k in ('rusty', 'greasy', 'crust'):
        first = Image.alpha_composite(first, out[k])
    thumbs(L, first, layers['clean'])
    finish(L, out, clean_a, {'registration': reg, 'insideBounds': bounds(inside), 'rustBounds': bounds(rust)})


# ---- level 8 · painted wooden crate ------------------------------------------------------
def run_wooden_crate():
    L = 'wooden-crate'
    layers, clean_a, reg = PL.register_states(L, ['clean', 'painted', 'sanded', 'sawdust', 'rough', 'flaking'])
    h, s, v = hue_sat_val(layers['clean'])
    teal = (h > 140) & (h < 200) & (s > 0.18) & (clean_a > 0.5)
    teal = ndimage.binary_closing(ndimage.binary_opening(teal, iterations=1), iterations=3)
    posts = (clean_a > 0.5) & ~ndimage.binary_dilation(teal, iterations=1)
    posts = ndimage.binary_opening(posts, iterations=3)
    lab, n = ndimage.label(posts)
    if n:
        sizes = ndimage.sum(posts, lab, range(1, n + 1))
        posts = np.isin(lab, [i + 1 for i, v2 in enumerate(sizes) if v2 >= 600])
    slats = (clean_a > 0.5) & ~posts
    out = dict(layers)
    out['dusty'] = PL.dust_layer(layers['flaking'], clean_a, 0.55)
    save_mask_named(L, 'slats-mask', soft(slats, 1.0, clean_a))
    save_mask_named(L, 'posts-mask', soft(posts, 1.0, clean_a))
    result_pic(L, layers['clean'])
    thumbs(L, out['dusty'], layers['clean'])
    finish(L, out, clean_a, {'registration': reg})


# ---- level 9 · rusty toolbox ---------------------------------------------------------------
def run_toolbox():
    L = 'toolbox'
    layers, clean_a, reg = PL.register_states(L, ['clean', 'painted', 'bright', 'stained', 'rusty'])
    out = dict(layers)
    out['dusty'] = PL.dust_layer(layers['rusty'], clean_a, 0.5)
    foam(L, clean_a, 0.2, 'rust')
    sheet_parts(L, 'junk-sheet', ['junk-rag', 'junk-bolt', 'junk-bag', 'junk-glove', 'junk-wire'], 256)
    result_pic(L, layers['clean'])
    thumbs(L, out['dusty'], layers['clean'])
    finish(L, out, clean_a, {'registration': reg})


# ---- level 10 · bathroom sink --------------------------------------------------------------
def run_bathroom_sink():
    L = 'bathroom-sink'
    layers, clean_a, reg = PL.register_states(L, ['clean', 'dull', 'wet', 'limescale', 'scummy'])
    # faucet: chrome parts changed by the dull / limescale edits, plus everything above the basin rim
    f1 = diff_mask(layers['dull'], layers['clean'], clean_a, thr=0.1, min_blob=60, grow=4)
    f2 = diff_mask(layers['limescale'], layers['clean'], clean_a, thr=0.12, min_blob=60, grow=4)
    h, s, v = hue_sat_val(layers['clean'])
    x0, y0, x1, y1 = bounds(clean_a)
    # the faucet column stands above the bowl: rows of the silhouette that are narrow
    widths = (clean_a > 0.5).sum(1)
    narrow = np.zeros_like(clean_a, bool)
    for y in range(y0, y1):
        if 0 < widths[y] < (x1 - x0) * 0.25:
            narrow[y] = clean_a[y] > 0.5
    faucet = largest(ndimage.binary_closing(f1 | f2 | narrow, iterations=6))
    faucet = ndimage.binary_dilation(ndimage.binary_fill_holes(faucet), iterations=3) & (clean_a > 0.5)
    basin = (clean_a > 0.5) & ~faucet
    fa = soft(faucet, 1.2, clean_a)
    ba = soft(basin, 1.2, clean_a)
    out = {
        'clean': layers['clean'],
        'dull': PL.mask_layer(layers['dull'], fa),
        'wet': layers['wet'],
        'limescale': PL.mask_layer(layers['limescale'], fa),
        'scummy': PL.mask_layer(layers['scummy'], ba),
    }
    foam(L, ba, 0.16, 'ceramic')
    save_mask_named(L, 'faucet-mask', fa)
    save_mask_named(L, 'basin-mask', ba)
    save_outside_named(L, 'basin-outside', ba)
    sheet_parts(L, 'junk-sheet', ['junk-brush', 'junk-soap', 'junk-tube', 'junk-swabs', 'junk-tissue'], 256)
    result_pic(L, layers['clean'])
    scummy_full = layers['scummy']
    thumbs(L, scummy_full, layers['clean'])
    bb = bounds(ba)
    finish(L, out, clean_a, {'registration': reg, 'basinBounds': bb, 'faucetBounds': bounds(fa)})


# ---- level 11 · desk fan -------------------------------------------------------------------
def run_desk_fan():
    L = 'desk-fan'
    layers, clean_a, reg = PL.register_states(L, ['clean', 'wet', 'grimy', 'dusty'])
    x0, y0, x1, y1 = bounds(clean_a)
    # the round blade guard is the widest part at the top: its diameter = the max width of the
    # upper 70 % of the silhouette; the circle touches the top of the silhouette
    # Step 9 fix: the ring is a thin wire, so the width is the row's EXTENT (leftmost → rightmost
    # opaque pixel), not its pixel count (that undercounted the ring: the guard came out too small)
    best = (0, y0, x0, x1)
    for y in range(y0, int(y0 + (y1 - y0) * 0.7)):
        cols = np.where(clean_a[y] > 0.5)[0]
        if len(cols) and cols.max() - cols.min() > best[0]:
            best = (int(cols.max() - cols.min() + 1), y, int(cols.min()), int(cols.max()))
    d = best[0]
    cy = y0 + d / 2
    cx = (best[2] + best[3]) / 2
    guard_src = Image.open(C / L / 'guard.png').convert('RGBA')
    guard = PL.fit(PL.crop_padded(guard_src, 0.0), 512)
    guard_d = d * 1.02
    gcanvas = place_on_canvas(guard, cx, cy, guard_d)
    ga = PL.alpha(gcanvas)
    guard_dusty = PL.dust_layer(gcanvas, ga, 0.8)
    out = dict(layers)
    out.pop('wet')  # the fan is wiped, not rinsed (matrix: duster, foam, scrub, cloth)
    out['guard-old'] = guard_dusty
    # sprites for the drag stages (same pixels as the canvases above)
    PL.save_webp(guard, PUB / L / 'guard.webp')
    reg_key(L, 'guard', f'assets/{L}/guard.webp')
    gd = guard_dusty.crop((round(cx - guard_d / 2), round(cy - guard_d / 2), round(cx + guard_d / 2), round(cy + guard_d / 2)))
    gd = PL.fit(gd, 512)
    PL.save_webp(gd, PUB / L / 'guard-dusty.webp')
    reg_key(L, 'guard-dusty', f'assets/{L}/guard-dusty.webp')
    parts = sheet_parts(L, 'parts-sheet', ['screw', 'screw-side', 'tub'], 320, order='x')
    foam(L, clean_a, 0.18, 'plastic')
    result_pic(L, Image.alpha_composite(layers['clean'], gcanvas))
    full_dirty = Image.alpha_composite(layers['dusty'], guard_dusty)
    thumbs(L, full_dirty, Image.alpha_composite(layers['clean'], gcanvas))
    r = guard_d / 2 * 0.955
    screws = [[round(cx), round(cy - r)], [round(cx + r), round(cy)], [round(cx), round(cy + r)], [round(cx - r), round(cy)]]
    finish(L, out, clean_a, {'registration': reg, 'guard': [round(cx), round(cy), round(guard_d)], 'screws': screws})


# ---- level 12 · garden bench ----------------------------------------------------------------
def run_garden_bench():
    L = 'garden-bench'
    layers, clean_a, reg = PL.register_states(L, ['clean', 'painted', 'bare', 'dusty', 'rusty', 'weathered', 'flaking'])
    h, s, v = hue_sat_val(layers['clean'])
    wood = (h > 18) & (h < 50) & (s > 0.35) & (v > 0.3) & (clean_a > 0.5)
    wood = ndimage.binary_closing(ndimage.binary_opening(wood, iterations=1), iterations=3)
    lab, n = ndimage.label(wood)
    sizes = ndimage.sum(wood, lab, range(1, n + 1))
    wood = np.isin(lab, [i + 1 for i, v2 in enumerate(sizes) if v2 >= 300])
    slats = ndimage.binary_dilation(wood, iterations=1) & (clean_a > 0.5)
    frame = (clean_a > 0.5) & ~slats
    sa = soft(slats, 1.0, clean_a)
    fa = soft(frame, 1.0, clean_a)
    out = {
        'clean': layers['clean'],
        'painted': PL.mask_layer(layers['painted'], sa),
        'bare': layers['bare'],
        'dusty': layers['dusty'],
        'rusty': PL.mask_layer(layers['rusty'], fa),
        'weathered': PL.mask_layer(layers['weathered'], sa),
        'flaking': PL.mask_layer(layers['flaking'], (ndimage.binary_erosion(slats, iterations=1)).astype(np.float32)),
    }
    save_mask_named(L, 'slats-mask', sa)
    save_mask_named(L, 'frame-mask', fa)
    sheet_parts(L, 'leaves-sheet', ['leaf-1', 'leaf-2', 'leaf-3', 'leaf-4', 'leaf-5'], 220)
    for nm in ('paint-tray', 'paint-can'):
        sprite_from(Image.open(C / L / f'{nm}.png').convert('RGBA'), 360, L, nm)
    result_pic(L, layers['clean'])
    first = layers['dusty']
    for k in ('rusty', 'weathered', 'flaking'):
        first = Image.alpha_composite(first, out[k])
    thumbs(L, first, layers['clean'])
    finish(L, out, clean_a, {'registration': reg, 'slatsBounds': bounds(sa), 'frameBounds': bounds(fa)})


# ---- level 13 · keyboard ---------------------------------------------------------------------
def run_keyboard():
    L = 'keyboard'
    layers, clean_a, reg = PL.register_states(L, ['clean', 'smudged', 'dusty', 'dirty', 'removed-clean', 'removed-gunk', 'removed-crumbs'])
    # removed area: a smoothed difference between the keyboard with and without the keycaps
    d = ndimage.gaussian_filter(np.abs(rgb(layers['removed-clean']) - rgb(layers['clean'])).max(2), 5)
    cells_m = largest(ndimage.binary_fill_holes(ndimage.binary_closing(d > 0.1, iterations=6))) & (clean_a > 0.5)
    # one cell per removed keycap: the bright cream keycap faces of the clean keyboard inside the
    # removed area, separated by the darker gaps between keys
    lum = rgb(layers['clean']).mean(2)
    inner = ndimage.binary_erosion(cells_m, iterations=2)
    caps = ndimage.binary_opening(inner & (lum > np.percentile(lum[inner], 50)), iterations=4)
    lab, n = ndimage.label(caps)
    cells = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        m = lab[sl] == i + 1
        if m.sum() < 300:
            continue
        cells.append((sl, m))
    cell_meta = []
    cells_a = np.zeros_like(clean_a)
    for k, (sl, m) in enumerate(sorted(cells, key=lambda c: (c[0][0].start // 40, c[0][1].start))):
        y0, x0 = sl[0].start, sl[1].start
        full = np.zeros_like(clean_a, bool)
        full[sl] = m
        # grow back to the whole keycap footprint (it stays inside the removed area)
        full = ndimage.binary_fill_holes(ndimage.binary_dilation(full, iterations=7)) & ndimage.binary_dilation(cells_m, iterations=2)
        cells_a = np.maximum(cells_a, full.astype(np.float32))
        ys, xs = np.where(full)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
        size = max(bx1 - bx0, by1 - by0)
        a = soft(full, 0.8)
        for src, nm in (('dirty', f'cap-dirty-{k + 1}'), ('clean', f'cap-clean-{k + 1}')):
            piece = PL.mask_layer(layers[src], a).crop((bx0, by0, bx1, by1))
            PL.save_webp(piece, PUB / L / f'{nm}.webp')
            reg_key(L, nm, f'assets/{L}/{nm}.webp')
        cell_meta.append([round(cx), round(cy), int(size)])
    ca = soft(cells_a > 0.5, 1.0, clean_a)
    spill = diff_mask(layers['dirty'], layers['dusty'], clean_a, thr=0.22, min_blob=300, grow=12, close=8)
    spill = largest(spill)
    out = {
        'clean': layers['clean'],
        'smudged': layers['smudged'],
        'dusty': layers['dusty'],
        'removed-clean': PL.mask_layer(layers['removed-clean'], ca),
        'removed-gunk': PL.mask_layer(layers['removed-gunk'], ca),
        'removed-crumbs': PL.mask_layer(layers['removed-crumbs'], ca),
        'dirty': layers['dirty'],
    }
    save_mask_named(L, 'cells-mask', ca)
    save_mask_named(L, 'spill-mask', soft(spill, 1.5, clean_a))
    result_pic(L, layers['clean'])
    thumbs(L, layers['dirty'], layers['clean'])
    finish(L, out, clean_a, {'registration': reg, 'cells': cell_meta, 'spillBounds': bounds(spill.astype(np.float32))})


# ---- level 14 · watering can -------------------------------------------------------------
def run_watering_can():
    L = 'watering-can'
    layers, clean_a, reg = PL.register_states(L, ['clean', 'bare', 'wet', 'grimy', 'rusty'])
    # the round body = what survives a heavy erosion (handle / spout / rose are thin)
    core = largest(ndimage.binary_erosion(clean_a > 0.5, iterations=70))
    ys, xs = np.where(core)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max(), ys.max()
    W, H = bx1 - bx0, by1 - by0
    dents = [[round(bx0 + W * 0.25), round(by0 + H * 0.35)], [round(bx0 + W * 0.7), round(by0 + H * 0.3)], [round(bx0 + W * 0.45), round(by0 + H * 0.75)]]
    im, it = PL.components(C / L / 'dents-sheet.png', min_area=4000)
    it.sort(key=lambda t: t[1])
    for i, box in enumerate(it[:3]):
        d = round_decal(PL.part(im, box, 0), 200, 0.09)
        PL.save_webp(d, PUB / L / f'dent-{i + 1}.webp')
        reg_key(L, f'dent-{i + 1}', f'assets/{L}/dent-{i + 1}.webp')
    foam(L, clean_a, 0.2, None)
    result_pic(L, layers['clean'])
    thumbs(L, layers['rusty'], layers['clean'])
    finish(L, layers, clean_a, {'registration': reg, 'dents': dents})


# ---- level 15 · porcelain vase -------------------------------------------------------------
def run_porcelain_vase():
    L = 'porcelain-vase'
    layers, clean_a, reg = PL.register_states(L, ['clean', 'wet', 'grimy', 'grimy-wet'])
    out = dict(layers)
    out['dusty'] = PL.dust_layer(layers['grimy'], clean_a, 0.5)
    core = largest(ndimage.binary_erosion(clean_a > 0.5, iterations=60))
    ys, xs = np.where(core)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max(), ys.max()
    W, H = bx1 - bx0, by1 - by0
    chips = [[round(bx0 + W * 0.3), round(by0 + H * 0.55)], [round(bx0 + W * 0.72), round(by0 + H * 0.42)], [round(bx0 + W * 0.55), round(by0 + H * 0.8)]]
    im, it = PL.components(C / L / 'chips-sheet.png', min_area=4000)
    it.sort(key=lambda t: t[1])
    for i, box in enumerate(it[:3]):
        d = round_decal(PL.part(im, box, 0), 200, 0.09)
        PL.save_webp(d, PUB / L / f'chip-{i + 1}.webp')
        reg_key(L, f'chip-{i + 1}', f'assets/{L}/chip-{i + 1}.webp')
    # repair patches: the restored glaze at each chip (soft round crop of the clean layer)
    for i, (x, y) in enumerate(chips):
        p = patch_crop(layers['clean'], x, y, 97)  # = spot stamp size (42 × 2.3)
        PL.save_webp(p, PUB / L / f'patch-{i + 1}.webp')
        reg_key(L, f'patch-{i + 1}', f'assets/{L}/patch-{i + 1}.webp')
    foam(L, clean_a, 0.16, 'ceramic')
    result_pic(L, layers['clean'])
    thumbs(L, out['dusty'], layers['clean'])
    finish(L, out, clean_a, {'registration': reg, 'chips': chips})


# ---- tools ------------------------------------------------------------------------------------
TOOL_RULES = [
    ('tool-steel-wool', 'center'), ('tool-wide-scraper', 'top'), ('tool-paint-brush', 'top'), ('tool-wire-brush', 'bottom-band'),
    ('tool-angle-grinder', 'top-center'), ('tool-spray-gun', 'top'), ('tool-polisher', 'top-center'), ('tool-screwdriver', 'top'),
    ('tool-paint-roller', 'top-center'), ('tool-keycap-puller', 'top'), ('tool-air-blower', 'top'), ('tool-cotton-swab', 'top'),
    ('tool-hammer', 'left-head'),
    # alternatives (cards)
    ('tool-turbo-lance', 'top'), ('tool-gold-washer', 'top'), ('tool-wire-wheel', 'top-center'), ('tool-pro-scraper', 'top'),
    ('tool-sanding-block', 'center'), ('tool-orbital-sander', 'top-center'), ('tool-gold-grinder', 'top-center'), ('tool-airbrush', 'top'),
    ('tool-gold-spray-gun', 'top'), ('tool-orbital-polisher', 'top-center'), ('tool-gold-polisher', 'top-center'), ('tool-e-screwdriver', 'top'),
    ('tool-gold-screwdriver', 'top'), ('tool-wide-roller', 'top-center'), ('tool-foam-roller', 'top-center'), ('tool-mallet', 'left-head'),
    ('tool-gold-hammer', 'left-head'),
]


def run_tools():
    for name, rule in TOOL_RULES:
        p = C / 'shared' / f'{name}.png'
        if not p.exists():
            print('missing cutout', name)
            continue
        PL.tool(name, Image.open(p).convert('RGBA'), rule)


STEPS = {
    'backgrounds': run_backgrounds, 'tools': run_tools,
    'rain-boots': run_rain_boots, 'frying-pan': run_frying_pan, 'wooden-crate': run_wooden_crate, 'toolbox': run_toolbox,
    'bathroom-sink': run_bathroom_sink, 'desk-fan': run_desk_fan, 'garden-bench': run_garden_bench, 'keyboard': run_keyboard,
    'watering-can': run_watering_can, 'porcelain-vase': run_porcelain_vase,
}


def main():
    only = set(sys.argv[1:])
    old = {}
    if PL.META_JS.exists():
        txt = PL.META_JS.read_text(encoding='utf-8')
        old = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
    old_assets = {}
    if REG.exists():
        txt = REG.read_text(encoding='utf-8')
        old_assets = json.loads(txt[txt.index('= {') + 2:txt.rindex('}') + 1])
    for k, fn in STEPS.items():
        if not only or k in only:
            fn()
            print('done', k)
    for key in ('levels', 'tools', 'ui', 'sprites'):
        merged = dict(old.get(key, {}))
        merged.update(meta[key])
        meta[key] = merged
    PL.META_JS.write_text('// GENERATED by scripts/prepare_levels.py and scripts/prepare_batch_a.py — do not edit by hand.\nexport const LEVEL_META = ' + json.dumps(meta, indent=1) + ';\n', encoding='utf-8')
    merged_assets = dict(old_assets)
    merged_assets.update(assets)
    REG.write_text('// GENERATED by scripts/prepare_batch_a.py — do not edit by hand.\n// Level art loaded when the level opens (Step 8 lazy loading): levelId -> { textureKey: url }.\nexport const BATCH_A_ASSETS = ' + json.dumps(merged_assets, indent=1) + ';\n', encoding='utf-8')


if __name__ == '__main__':
    main()
