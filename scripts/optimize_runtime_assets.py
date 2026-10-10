"""Runtime image optimization (Step 9 size pass): resizes and re-encodes the EXPORTED runtime images
in public/assets to their real display needs. Source masters (reference/) are never touched; the
art pipelines can always regenerate full-quality exports, after which this script is run again.

The game draws every full-canvas texture (object layers, foam, outside masks) scaled to the
1024-unit object canvas and sizes every other sprite by its own pixel size (tools keep their
normalized working points), so smaller exports change no geometry.

Idempotent: scripts/runtime-assets-optimized.json records the hash of every file this script wrote;
a file whose current hash matches is skipped (no repeated lossy re-encoding).
Run: python scripts/optimize_runtime_assets.py [--report]
"""
import hashlib
import io
import json
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / 'public/assets'
LEDGER = ROOT / 'scripts/runtime-assets-optimized.json'

# provably unused runtime files (no registry entry, no code reference; checked 2026-10-09)
UNUSED = ['soccer-ball/mask.png', 'ui/icon-shop.webp']  # icon-shop replaced by icon-store (2026-10-11)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def rule(rel, im):
    """(max side or scale, webp quality) for a runtime image; None = leave as is."""
    name = rel.split('/')[-1]
    group = rel.split('/')[0]
    w, h = im.size
    if group == 'ui':
        return None  # nine-slice UI panels / buttons: slice borders are pixel based
    if name.startswith('tex-foam'):
        return ('max', 384, 58)  # soft foam noise
    if name.startswith('thumb'):
        return ('max', 256, 64)  # menu previews are shown at ~80–220 px
    if name.startswith('result-picture'):
        return ('max', max(w, h), 64)
    if name.startswith('bg-') or group == 'backgrounds':
        return ('scale', 0.8, 64)
    if (name.startswith('tool-') or name.startswith('skin-')) and group in ('shared', 'soccer-ball'):
        return ('max', 384, 78)
    # object layer / state on the 1024 canvas (drawn scaled to it). The category is decided by the
    # TYPE (a square full-canvas export, >= 512 px before or after optimization), never by a size
    # that a previous run produced — a 640 layer must not fall into the "parts" rule below.
    if w == h and w >= 512:
        return ('max', 640, 62)
    if max(w, h) > 256:
        return ('max', 256, 78)  # parts, junk, decals, sources
    return ('max', max(w, h), 78)


def needs_shrink(rel, im):
    """An already optimized file is processed again only if the current target is smaller."""
    if rel.endswith('.png'):
        lim = 384
        return max(im.size) > lim
    r = rule(rel, im)
    if r is None:
        return False
    kind, v, _ = r
    return kind == 'max' and max(im.size) > v


def encode_webp(im, q):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, alpha_quality=90 if q >= 70 else 80, method=6)
    return buf.getvalue()


def encode_mask_png(im, rel):
    """Masks: 8-bit grey + alpha (the game only reads alpha / draws white), at most 384 px."""
    a = im.convert('RGBA').split()[-1]
    if max(a.size) > 384:
        a = a.resize((384, 384), Image.LANCZOS)  # zone masks (read as relative alpha)
    la = Image.merge('LA', (Image.new('L', a.size, 255), a))
    buf = io.BytesIO()
    la.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def main():
    report_only = '--report' in sys.argv
    ledger = json.loads(LEDGER.read_text(encoding='utf-8')) if LEDGER.exists() else {}
    before = defaultdict(int)
    after = defaultdict(int)
    for rel in UNUSED:
        p = PUB / rel
        if p.exists() and not report_only:
            p.unlink()
    for p in sorted(PUB.rglob('*')):
        if not p.is_file() or p.suffix not in ('.webp', '.png'):
            continue
        rel = p.relative_to(PUB).as_posix()
        data = p.read_bytes()
        before[p.suffix] += len(data)
        im = Image.open(io.BytesIO(data))
        if report_only or (ledger.get(rel) == sha(data) and not needs_shrink(rel, im)):
            after[p.suffix] += len(data)
            continue
        if p.suffix == '.png':
            out = encode_mask_png(im, rel)
        else:
            r = rule(rel, im)
            if r is None:
                after[p.suffix] += len(data)
                continue
            kind, v, q = r
            im = im.convert('RGBA')
            w, h = im.size
            s = v / max(w, h) if kind == 'max' else v
            if s < 1:
                im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
            out = encode_webp(im, q)
        if len(out) >= len(data) and im.size == Image.open(io.BytesIO(data)).size:
            out = data  # never make a file bigger at the same size
        p.write_bytes(out)
        ledger[rel] = sha(out)
        after[p.suffix] += len(out)
    if not report_only:
        LEDGER.write_text(json.dumps(ledger, indent=0, sort_keys=True) + '\n', encoding='utf-8')
    for k in ('.webp', '.png'):
        print(f'{k}: {before[k] / 1e6:.2f} MB -> {after[k] / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
